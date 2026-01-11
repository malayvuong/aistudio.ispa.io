import { createBrowserClient } from "@supabase/ssr";

const getEnv = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return { url, anonKey };
};

export const createSupabaseBrowserClient = () => {
  const { url, anonKey } = getEnv();
  return createBrowserClient(url, anonKey);
};
