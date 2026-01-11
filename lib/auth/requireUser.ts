import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/getCurrentUser";

type RequireUserOptions = {
  redirectTo?: string | null;
};

export const requireUser = async (options: RequireUserOptions = {}) => {
  const user = await getCurrentUser();
  if (!user) {
    if (options.redirectTo === null) {
      return null;
    }
    redirect(options.redirectTo ?? "/login");
  }
  return user;
};
