import "server-only";

import { getRedisClient } from "@/lib/redis";

const DEFAULT_LIMIT = Number(process.env.RATE_LIMIT_PER_MIN ?? "30");
const DEFAULT_WINDOW_SECONDS = 60;

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
};

export const checkRateLimit = async ({
  userId,
  action,
  limit = DEFAULT_LIMIT,
  windowSeconds = DEFAULT_WINDOW_SECONDS,
}: {
  userId: string;
  action: string;
  limit?: number;
  windowSeconds?: number;
}): Promise<RateLimitResult> => {
  if (!userId) {
    return { allowed: true, remaining: limit, retryAfter: 0 };
  }

  try {
    const client = await getRedisClient();
    const key = `ratelimit:${action}:${userId}`;
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, windowSeconds);
    }
    const ttl = await client.ttl(key);
    const retryAfter = ttl > 0 ? ttl : windowSeconds;
    const remaining = Math.max(0, limit - count);

    return { allowed: count <= limit, remaining, retryAfter };
  } catch {
    console.warn("Rate limit check failed; allowing request.");
    return { allowed: true, remaining: limit, retryAfter: 0 };
  }
};
