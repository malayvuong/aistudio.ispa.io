import "server-only";

import { cookies } from "next/headers";

import type { Lang } from "@/i18n";

export const getLang = async (): Promise<Lang> => {
  const cookieStore = await cookies();
  const value = cookieStore.get("lang")?.value;
  return value === "vi" ? "vi" : "en";
};
