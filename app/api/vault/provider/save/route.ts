import { NextRequest, NextResponse } from "next/server";

import { encryptSecret } from "@/lib/crypto/vault";
import { prisma } from "@/lib/prisma";
import { withApiGuard } from "@/lib/security/guard";
import { ApiPolicies } from "@/lib/security/policies";
import { normalizeProviderId } from "@/lib/vault/providers";

export const runtime = "nodejs";

const jsonError = (error: string, code: string, status: number) =>
  NextResponse.json({ error, code }, { status });

export async function POST(req: NextRequest) {
  return withApiGuard(req, ApiPolicies.vaultSave, async ({ userId }) => {
    let input: { providerId?: string; providerKey?: string; vaultPassphrase?: string } | null =
      null;

    try {
      input = await req.json();
    } catch {
      return jsonError("Invalid JSON payload", "INVALID_JSON", 400);
    }

    const providerId = normalizeProviderId(input?.providerId);
    if (!providerId) {
      return jsonError("Invalid providerId", "INVALID_PROVIDER", 400);
    }

    const providerKey = input?.providerKey;
    if (typeof providerKey !== "string" || !providerKey.trim()) {
      return jsonError("providerKey is required", "INVALID_INPUT", 400);
    }

    const vaultPassphrase = input?.vaultPassphrase;
    if (typeof vaultPassphrase !== "string" || !vaultPassphrase.trim()) {
      return jsonError("vaultPassphrase is required", "INVALID_INPUT", 400);
    }

    if (!userId) {
      return jsonError("Not authenticated", "UNAUTHORIZED", 401);
    }

    const encrypted = await encryptSecret(providerKey, vaultPassphrase);

    try {
      await prisma.userProviderSecret.upsert({
        where: {
          userId_provider: {
            userId,
            provider: providerId,
          },
        },
        update: {
          encryptedKey: encrypted.encryptedKey,
          salt: encrypted.salt,
          iv: encrypted.iv,
          tag: encrypted.tag,
          kdf: encrypted.kdf,
          kdfParams: encrypted.kdfParams,
        },
        create: {
          userId,
          provider: providerId,
          encryptedKey: encrypted.encryptedKey,
          salt: encrypted.salt,
          iv: encrypted.iv,
          tag: encrypted.tag,
          kdf: encrypted.kdf,
          kdfParams: encrypted.kdfParams,
        },
      });
    } catch {
      return jsonError("Failed to store provider key", "VAULT_SAVE_FAILED", 500);
    }

    return NextResponse.json({ ok: true });
  });
}
