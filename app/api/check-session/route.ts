import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { withApiGuard } from "@/lib/security/guard";
import { ApiPolicies } from "@/lib/security/policies";

export async function GET(req: NextRequest) {
  return withApiGuard(req, ApiPolicies.checkSession, async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.json(
          { error: "Not authenticated", code: "UNAUTHORIZED" },
          { status: 401 }
        );
      }
      return NextResponse.json({ authenticated: true });
    } catch {
      return NextResponse.json(
        { error: "Session check failed", code: "SESSION_CHECK_FAILED" },
        { status: 500 }
      );
    }
  });
}
