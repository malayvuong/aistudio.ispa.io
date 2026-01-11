import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApiGuard } from "@/lib/security/guard";
import { ApiPolicies } from "@/lib/security/policies";
import { getOrCreateSid, getUnlockedProviders, getUnlockedProvidersTtl } from "@/lib/vault/session";
import { PROVIDER_CAPABILITIES } from "@/lib/vault/providers";

export const runtime = "nodejs";

type PendingCookie = {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    sameSite: "strict";
    path: string;
    secure?: boolean;
  };
};

const jsonError = (error: string, code: string, status: number) =>
  NextResponse.json({ error, code }, { status });

export async function GET(req: NextRequest) {
  return withApiGuard(req, ApiPolicies.vaultStatus, async ({ userId }) => {
    if (!userId) {
      return jsonError("Not authenticated", "UNAUTHORIZED", 401);
    }

    const pendingCookies: PendingCookie[] = [];
    const sid = getOrCreateSid(req.cookies, (name, value, options) => {
      pendingCookies.push({ name, value, options });
    });

    let unlockedProviders = null;
    try {
      unlockedProviders = await getUnlockedProviders(sid);
    } catch {
      return jsonError("Vault cache unavailable", "REDIS_UNAVAILABLE", 500);
    }

    const unlocked =
      !!unlockedProviders && Object.keys(unlockedProviders).length > 0;

    const providers = await prisma.userProviderSecret.findMany({
      where: { userId },
      select: { provider: true },
    });

    const initializedProviders = providers.map((item) => item.provider);

    let expiresAt: string | null = null;
    if (unlocked) {
      try {
        const ttlSeconds = await getUnlockedProvidersTtl(sid);
        if (ttlSeconds && ttlSeconds > 0) {
          expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
        }
      } catch {
        expiresAt = null;
      }
    }

    const response = NextResponse.json({
      initializedProviders,
      unlocked,
      expiresAt,
      capabilities: PROVIDER_CAPABILITIES,
    });

    pendingCookies.forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, cookie.options);
    });

    return response;
  });
}
