import "server-only";

import { randomUUID } from "crypto";

import { getRedisClient } from "@/lib/redis";

type CookieOptions = {
  httpOnly: boolean;
  sameSite: "strict";
  path: string;
  secure?: boolean;
};

type CookieGetter = {
  get: (name: string) => { value: string } | undefined;
};

type CookieSetter = (name: string, value: string, options: CookieOptions) => void;

export type UnlockedProvidersMap = Record<string, string>;

const SID_COOKIE = "sid";
const DEFAULT_TTL_SECONDS = 60 * 60 * 8;
const PROVIDERS_KEY_PREFIX = "sess";

const buildCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  sameSite: "strict",
  path: "/",
  secure: process.env.NODE_ENV === "production",
});

const getProvidersKey = (sid: string) => `${PROVIDERS_KEY_PREFIX}:${sid}:providers`;

export const getOrCreateSid = (cookies: CookieGetter, setCookie: CookieSetter) => {
  const existing = cookies.get(SID_COOKIE)?.value;
  if (existing) {
    return existing;
  }

  const sid = randomUUID();
  setCookie(SID_COOKIE, sid, buildCookieOptions());
  return sid;
};

export const setUnlockedProviders = async (
  sid: string,
  providersMap: UnlockedProvidersMap,
  ttlSeconds = DEFAULT_TTL_SECONDS
) => {
  const client = await getRedisClient();
  const key = getProvidersKey(sid);
  const payload = JSON.stringify(providersMap);
  await client.set(key, payload, { EX: ttlSeconds });
};

export const getUnlockedProviders = async (sid: string): Promise<UnlockedProvidersMap | null> => {
  const client = await getRedisClient();
  const key = getProvidersKey(sid);
  const payload = await client.get(key);

  if (!payload) {
    return null;
  }

  try {
    const parsed = JSON.parse(payload) as UnlockedProvidersMap;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const clearUnlockedProviders = async (sid: string) => {
  const client = await getRedisClient();
  const key = getProvidersKey(sid);
  await client.del(key);
};

export const getUnlockedProvidersTtl = async (sid: string): Promise<number | null> => {
  const client = await getRedisClient();
  const key = getProvidersKey(sid);
  const ttl = await client.ttl(key);
  if (ttl <= 0) {
    return null;
  }
  return ttl;
};
