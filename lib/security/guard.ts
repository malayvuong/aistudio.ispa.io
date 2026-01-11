import "server-only";

import { NextRequest, NextResponse } from "next/server";
import type { RedisClientType } from "redis";

import { ensurePrismaUser } from "@/lib/auth/ensurePrismaUser";
import { requireUser } from "@/lib/auth/requireUser";
import { getRedisClient } from "@/lib/redis";
import { getClientIp, normalizeIp } from "@/lib/security/ip";
import { rateLimitOrThrow } from "@/lib/security/rateLimit";
import type { ApiPolicy, RateLimitConfig } from "@/lib/security/policies";

type ApiError = Error & {
  code: string;
  status: number;
  retryAfter?: number;
};

export type GuardContext = {
  req: NextRequest;
  ip: string;
  userId: string | null;
  redis: RedisClientType | null;
  body: unknown | null;
};

type SanitizedError = {
  error: string;
  code: string;
  status: number;
  retryAfter?: number;
};

const createApiError = (
  message: string,
  code: string,
  status: number,
  retryAfter?: number
): ApiError => {
  const error = new Error(message) as ApiError;
  error.code = code;
  error.status = status;
  if (retryAfter) {
    error.retryAfter = retryAfter;
  }
  return error;
};

const isApiError = (error: unknown): error is ApiError => {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    "status" in error
  );
};

const getContentLength = (req: NextRequest): number | null => {
  const header = req.headers.get("content-length");
  if (!header) return null;
  const value = Number(header);
  if (!Number.isFinite(value)) return null;
  return value;
};

const readJsonBody = async (
  req: NextRequest,
  maxBytes?: number
): Promise<unknown> => {
  const text = await req.clone().text();
  const sizeBytes = Buffer.byteLength(text, "utf8");

  if (typeof maxBytes === "number" && sizeBytes > maxBytes) {
    throw createApiError("Payload too large", "PAYLOAD_TOO_LARGE", 413);
  }

  if (!text) {
    throw createApiError("Invalid JSON payload", "INVALID_JSON", 400);
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw createApiError("Invalid JSON payload", "INVALID_JSON", 400);
  }
};

const assertAllowedFields = (body: unknown, allowedFields: string[]) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw createApiError("Invalid input payload", "INVALID_INPUT", 400);
  }

  const keys = Object.keys(body as Record<string, unknown>);
  const unexpected = keys.filter((key) => !allowedFields.includes(key));

  if (unexpected.length > 0) {
    throw createApiError("Unexpected fields in payload", "INVALID_INPUT", 400);
  }
};

const buildRateLimitKey = (
  policyName: string,
  scope: "ip" | "user",
  subject: string,
  windowSeconds: number
) => {
  return `ratelimit:${policyName}:${scope}:${subject}:${windowSeconds}`;
};

const getRequestIp = (req: NextRequest) => {
  const headerIp = getClientIp(req.headers);
  const reqIp = "ip" in req ? (req as { ip?: string }).ip : undefined;
  if (headerIp !== "unknown") return headerIp;
  if (reqIp) return normalizeIp(reqIp);
  return "unknown";
};

const checkRateLimit = async (
  redis: RedisClientType,
  policyName: string,
  scope: "ip" | "user",
  subject: string,
  config: RateLimitConfig
) => {
  const key = buildRateLimitKey(policyName, scope, subject, config.windowSeconds);
  await rateLimitOrThrow({
    key,
    limit: config.limit,
    windowSeconds: config.windowSeconds,
    redis,
  });
};

export const assertMethod = (req: NextRequest, allowedMethods: string[]) => {
  if (!allowedMethods.includes(req.method)) {
    throw createApiError("Method not allowed", "METHOD_NOT_ALLOWED", 405);
  }
};

export const assertJson = (req: NextRequest) => {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw createApiError("Content-Type must be application/json", "INVALID_CONTENT_TYPE", 415);
  }
};

export const assertBodySize = async (req: NextRequest, maxBytes: number) => {
  const contentLength = getContentLength(req);
  if (typeof contentLength === "number") {
    if (contentLength > maxBytes) {
      throw createApiError("Payload too large", "PAYLOAD_TOO_LARGE", 413);
    }
    return;
  }

  const text = await req.clone().text();
  const sizeBytes = Buffer.byteLength(text, "utf8");
  if (sizeBytes > maxBytes) {
    throw createApiError("Payload too large", "PAYLOAD_TOO_LARGE", 413);
  }

  if (text && text.trim()) {
    try {
      JSON.parse(text);
    } catch {
      throw createApiError("Invalid JSON payload", "INVALID_JSON", 400);
    }
  }
};

export const sanitizeError = (error: unknown): SanitizedError => {
  if (isApiError(error)) {
    return {
      error: error.message || "Request failed",
      code: error.code,
      status: error.status,
      retryAfter: error.retryAfter,
    };
  }

  return { error: "Unexpected error", code: "INTERNAL_ERROR", status: 500 };
};

export const withApiGuard = async (
  req: NextRequest,
  policy: ApiPolicy,
  handler: (context: GuardContext) => Promise<NextResponse>
): Promise<NextResponse> => {
  try {
    assertMethod(req, policy.methods);

    const jsonMethods = policy.jsonMethods ?? ["POST"];
    const expectsJsonBody = jsonMethods.includes(req.method);
    if (expectsJsonBody) {
      assertJson(req);
    }

    const contentLength = getContentLength(req);
    if (expectsJsonBody && policy.bodyMaxBytes && typeof contentLength === "number") {
      if (contentLength > policy.bodyMaxBytes) {
        throw createApiError("Payload too large", "PAYLOAD_TOO_LARGE", 413);
      }
    }

    const ip = getRequestIp(req);
    let redis: RedisClientType | null = null;
    try {
      redis = await getRedisClient();
    } catch {
      redis = null;
    }

    if (redis && policy.enforceBlock !== false && ip !== "unknown") {
      try {
        const blocked = await redis.get(`block:${ip}`);
        if (blocked) {
          throw createApiError(
            "Temporarily blocked due to repeated failures",
            "TEMP_BLOCKED",
            403
          );
        }
      } catch (error) {
        if (isApiError(error)) {
          throw error;
        }
      }
    }

    if (redis && policy.rateLimit?.perIp && ip !== "unknown") {
      try {
        await checkRateLimit(redis, policy.name, "ip", ip, policy.rateLimit.perIp);
      } catch (error) {
        if (isApiError(error)) {
          throw error;
        }
      }
    }

    let userId: string | null = null;
    if (policy.authRequired) {
      const user = await requireUser({ redirectTo: null });
      if (!user) {
        throw createApiError("Not authenticated", "UNAUTHORIZED", 401);
      }

      userId = await ensurePrismaUser(user);
      if (!userId) {
        throw createApiError("Failed to initialize user", "USER_INIT_FAILED", 500);
      }
    }

    if (redis && policy.enforceBlock !== false && userId) {
      try {
        const blocked = await redis.get(`block:${userId}`);
        if (blocked) {
          throw createApiError(
            "Temporarily blocked due to repeated failures",
            "TEMP_BLOCKED",
            403
          );
        }
      } catch (error) {
        if (isApiError(error)) {
          throw error;
        }
      }
    }

    if (redis && policy.rateLimit?.perUser && userId) {
      try {
        await checkRateLimit(redis, policy.name, "user", userId, policy.rateLimit.perUser);
      } catch (error) {
        if (isApiError(error)) {
          throw error;
        }
      }
    }

    let body: unknown | null = null;
    if (expectsJsonBody && Array.isArray(policy.allowedBodyFields)) {
      const maxBytes =
        typeof contentLength === "number" ? undefined : policy.bodyMaxBytes;
      body = await readJsonBody(req, maxBytes);
      assertAllowedFields(body, policy.allowedBodyFields);
    } else if (expectsJsonBody && policy.bodyMaxBytes && typeof contentLength !== "number") {
      await assertBodySize(req, policy.bodyMaxBytes);
    }

    const response = await handler({ req, ip, userId, redis, body });
    return response;
  } catch (error) {
    const safe = sanitizeError(error);
    const response = NextResponse.json(
      { error: safe.error, code: safe.code },
      { status: safe.status }
    );
    if (safe.retryAfter) {
      response.headers.set("Retry-After", safe.retryAfter.toString());
    }
    return response;
  }
};
