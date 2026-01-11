import { NextRequest, NextResponse } from "next/server";

import { withApiGuard } from "@/lib/security/guard";
import { ApiPolicies } from "@/lib/security/policies";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return withApiGuard(req, ApiPolicies.turnstileVerify, async () => {
    let payload: { token?: string } | null = null;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const token = typeof payload?.token === "string" ? payload.token : "";
    if (!token) {
      return NextResponse.json(
        { error: "Captcha token required", code: "TOKEN_REQUIRED" },
        { status: 400 }
      );
    }

    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      return NextResponse.json(
        { error: "Turnstile secret missing", code: "CONFIG_MISSING" },
        { status: 500 }
      );
    }

    const body = new URLSearchParams();
    body.append("secret", secret);
    body.append("response", token);

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (ip) {
      body.append("remoteip", ip);
    }

    try {
      const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const data = (await response.json()) as { success?: boolean; "error-codes"?: string[] };

      if (!data?.success) {
        return NextResponse.json(
          { error: "Captcha verification failed", code: "CAPTCHA_FAILED" },
          { status: 400 }
        );
      }

      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json(
        { error: "Captcha verification failed", code: "CAPTCHA_ERROR" },
        { status: 502 }
      );
    }
  });
}
