import { NextRequest, NextResponse } from "next/server";

import { clearUnlockedProviders, getOrCreateSid } from "@/lib/vault/session";
import { withApiGuard } from "@/lib/security/guard";
import { ApiPolicies } from "@/lib/security/policies";

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

export async function POST(req: NextRequest) {
  return withApiGuard(req, ApiPolicies.vaultLock, async ({ userId }) => {
    if (!userId) {
      return jsonError("Not authenticated", "UNAUTHORIZED", 401);
    }

    const pendingCookies: PendingCookie[] = [];
    const sid = getOrCreateSid(req.cookies, (name, value, options) => {
      pendingCookies.push({ name, value, options });
    });

    try {
      await clearUnlockedProviders(sid);
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
