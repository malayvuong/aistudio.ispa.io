import { NextRequest, NextResponse } from "next/server";

import type { Lang } from "@/i18n";
import { withApiGuard } from "@/lib/security/guard";
import { ApiPolicies } from "@/lib/security/policies";

export const runtime = "nodejs";

const SUPPORTED_LANGS = new Set<Lang>(["en", "vi"]);

export async function POST(req: NextRequest) {
  return withApiGuard(req, ApiPolicies.i18nLang, async () => {
    let payload: { lang?: string } = {};

    try {
      payload = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload.", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const lang = payload.lang;

    if (!SUPPORTED_LANGS.has(lang as Lang)) {
      return NextResponse.json(
        { error: "Invalid language.", code: "INVALID_LANG" },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ ok: true, lang });
    response.cookies.set("lang", lang as Lang, {
      httpOnly: false,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    return response;
  });
}
