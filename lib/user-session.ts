import { randomUUID } from "crypto";
import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";

type CookieSetter = {
  set: (
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      sameSite: "strict" | "lax" | "none";
      maxAge: number;
      path: string;
      secure?: boolean;
    }
  ) => void;
};

const UID_COOKIE = "uid";
const UID_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function getOrCreateUserId(
  req: NextRequest,
  resCookies: CookieSetter
): Promise<string | null> {
  const existingUserId = req.cookies.get(UID_COOKIE)?.value;
  const userId = existingUserId ?? randomUUID();

  if (!existingUserId) {
    resCookies.set(UID_COOKIE, userId, {
      httpOnly: true,
      sameSite: "strict",
      maxAge: UID_MAX_AGE_SECONDS,
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
  }

  try {
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId },
    });
  } catch {
    console.warn("DB warning: failed to upsert user session; continuing without DB persistence");
    return null;
  }

  return userId;
}
