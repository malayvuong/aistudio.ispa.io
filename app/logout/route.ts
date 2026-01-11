import { NextRequest, NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  const supabase = createSupabaseRouteClient(request, response);

  await supabase.auth.signOut();

  return response;
}

export async function GET(request: NextRequest) {
  return POST(request);
}
