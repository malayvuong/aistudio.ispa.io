import "server-only";

import type { RedisClientType } from "redis";

type RateLimitInput = {
  key: string;
  limit: number;
  windowSeconds: number;
  redis: RedisClientType;
};

type RateLimitError = Error & {
  code: string;
  status: number;
  retryAfter?: number;
};

export const rateLimitOrThrow = async ({
  key,
  limit,
  windowSeconds,
  redis,
}: RateLimitInput): Promise<void> => {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }

  let ttl = await redis.ttl(key);
  if (ttl < 0) {
    await redis.expire(key, windowSeconds);
    ttl = windowSeconds;
  }

  if (count > limit) {
    const error = new Error("Rate limit exceeded. Try again soon.") as RateLimitError;
    error.code = "RATE_LIMITED";
    error.status = 429;
    error.retryAfter = ttl > 0 ? ttl : windowSeconds;
    throw error;
  }
};
