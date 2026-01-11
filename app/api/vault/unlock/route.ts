import { NextRequest, NextResponse } from "next/server";
import type { RedisClientType } from "redis";

import { decryptSecret, type VaultSecretRecord } from "@/lib/crypto/vault";
import { prisma } from "@/lib/prisma";
import { withApiGuard } from "@/lib/security/guard";
import { ApiPolicies } from "@/lib/security/policies";
import {
  getOrCreateSid,
  setUnlockedProviders,
  type UnlockedProvidersMap,
} from "@/lib/vault/session";

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

const recordVaultInvalid = async (
  subject: string,
  redis: RedisClientType,
  policy = ApiPolicies.vaultUnlock
) => {
  const cooldown = policy.failCooldown;
  if (!cooldown) return;

  const key = `abuse:${subject}:vault_invalid`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, cooldown.windowSeconds);
  }

  if (count >= cooldown.threshold) {
    await redis.set(`block:${subject}`, "1", { EX: cooldown.blockSeconds });
  }
};

export async function POST(req: NextRequest) {
  return withApiGuard(req, ApiPolicies.vaultUnlock, async ({ userId, ip, redis }) => {
    let input: { vaultPassphrase?: string } | null = null;

    try {
      input = await req.json();
    } catch {
      return jsonError("Invalid JSON payload", "INVALID_JSON", 400);
    }

    const vaultPassphrase = input?.vaultPassphrase;
    if (typeof vaultPassphrase !== "string" || !vaultPassphrase.trim()) {
      return jsonError("vaultPassphrase is required", "INVALID_INPUT", 400);
    }

    if (!userId) {
      return jsonError("Not authenticated", "UNAUTHORIZED", 401);
    }

    const secrets = await prisma.userProviderSecret.findMany({
      where: { userId },
    });

    if (secrets.length === 0) {
      return jsonError("No provider keys initialized", "VAULT_EMPTY", 400);
    }

    const providersMap: UnlockedProvidersMap = {};

    try {
      for (const secret of secrets) {
        const kdfParams = secret.kdfParams as unknown as VaultSecretRecord["kdfParams"];
        const decrypted = await decryptSecret(
          {
            encryptedKey: secret.encryptedKey,
            salt: secret.salt,
            iv: secret.iv,
            tag: secret.tag,
            kdf: secret.kdf,
            kdfParams,
          },
          vaultPassphrase
        );
        providersMap[secret.provider] = decrypted;
      }
    } catch {
      if (redis) {
        const subject = userId || ip;
        if (subject) {
          try {
            await recordVaultInvalid(subject, redis);
          } catch {
            // ignore abuse tracking failures
          }
        }
      }
      return jsonError("Invalid vault passphrase", "VAULT_INVALID", 401);
    }

    const pendingCookies: PendingCookie[] = [];
    const sid = getOrCreateSid(req.cookies, (name, value, options) => {
      pendingCookies.push({ name, value, options });
    });

    try {
      await setUnlockedProviders(sid, providersMap);
    } catch {
      return jsonError("Vault cache unavailable", "REDIS_UNAVAILABLE", 500);
    }

    const response = NextResponse.json({ ok: true });
    pendingCookies.forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, cookie.options);
    });
    return response;
  });
}
