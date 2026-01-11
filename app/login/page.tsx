"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useT } from "@/components/i18n/LanguageProvider";
import TurnstileWidget from "@/components/auth/TurnstileWidget";

const LoginPage = () => {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        router.replace("/dashboard");
      }
    };
    checkSession();
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg(null);
    setCaptchaError(null);

    if (!siteKey) {
      setCaptchaError(t("auth.captcha.missingKey"));
      return;
    }

    if (!captchaToken) {
      setCaptchaError(t("auth.captcha.required"));
      return;
    }
    setLoading(true);

    try {
      const verifyResponse = await fetch("/api/turnstile/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: captchaToken }),
      });
      if (!verifyResponse.ok) {
        setCaptchaError(t("auth.captcha.failed"));
        setCaptchaToken("");
        setCaptchaReset((count) => count + 1);
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        setCaptchaToken("");
        setCaptchaReset((count) => count + 1);
        return;
      }

      router.replace("/dashboard");
    } catch (error: any) {
      setErrorMsg(error.message || t("auth.login.error"));
      setCaptchaToken("");
      setCaptchaReset((count) => count + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4 pt-12">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t("auth.login.title")}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {t("auth.login.subtitle")}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-gray-500">
              {t("auth.email.label")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-gray-500">
              {t("auth.password.label")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm"
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-gray-500">
              {t("auth.captcha.label")}
            </label>
            <div className="mt-2">
              {siteKey ? (
                <TurnstileWidget
                  siteKey={siteKey}
                  onVerify={setCaptchaToken}
                  resetSignal={captchaReset}
                />
              ) : (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {t("auth.captcha.missingKey")}
                </p>
              )}
            </div>
            {captchaError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{captchaError}</p>
            )}
          </div>

          {errorMsg && (
            <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60"
          >
            {loading ? t("auth.login.loading") : t("auth.login.button")}
          </button>
        </form>

        <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          {t("auth.login.noAccount")}{" "}
          <button
            type="button"
            onClick={() => router.push("/register")}
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {t("auth.login.cta")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
