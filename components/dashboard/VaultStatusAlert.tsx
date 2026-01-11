"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Lock, ShieldCheck } from "lucide-react";
import { getProviderLabel, normalizeAIProviderId } from "@/lib/ai-provider";
import { useI18n, useT } from "@/components/i18n/LanguageProvider";

type VaultStatusResponse = {
  initializedProviders: string[];
  unlocked: boolean;
  expiresAt?: string | null;
  capabilities: Record<string, { text: boolean; image: boolean }>;
};

type VaultStatusState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: VaultStatusResponse };

const VaultStatusAlert = () => {
  const [state, setState] = useState<VaultStatusState>({ status: "loading" });
  const [locking, setLocking] = useState(false);
  const { lang } = useI18n();
  const t = useT();

  const formatExpiry = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const locale = lang === "vi" ? "vi-VN" : "en-US";
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  const fetchStatus = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/vault/status", { cache: "no-store" });
      const data = (await response.json()) as VaultStatusResponse & { error?: string };

      if (!response.ok) {
        setState({
          status: "error",
          message: data?.error || t("error.vaultStatusFailed"),
        });
        return;
      }

      setState({ status: "ready", data });
    } catch {
      setState({ status: "error", message: t("error.vaultStatusFailed") });
    }
  }, [t]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleLock = async () => {
    setLocking(true);
    try {
      const response = await fetch("/api/vault/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (response.ok) {
        await fetchStatus();
      } else {
        const data = await response.json();
        setState({
          status: "error",
          message: data?.error || t("error.vaultLockFailed"),
        });
      }
    } catch {
      setState({ status: "error", message: t("error.vaultLockFailed") });
    } finally {
      setLocking(false);
    }
  };

  if (state.status === "loading") {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white/70 p-6 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-400">
        {t("vault.loading")}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-600 shadow-sm dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-4 w-4" />
          {t("vault.unavailable.title")}
        </div>
        <p className="mt-2">{state.message}</p>
        <button
          type="button"
          onClick={fetchStatus}
          className="mt-4 inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm transition hover:border-red-300 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-100"
        >
          {t("vault.unavailable.retry")}
        </button>
      </div>
    );
  }

  const { initializedProviders, unlocked, expiresAt, capabilities } = state.data;
  const formattedExpiry = formatExpiry(expiresAt);
  const hasProviders = initializedProviders.length > 0;
  const providerBadges = initializedProviders.map((provider) => {
    const normalized = normalizeAIProviderId(provider);
    const label = normalized ? getProviderLabel(normalized) : provider.toUpperCase();
    const capability = capabilities?.[provider];
    const capabilityLabel = capability
      ? capability.image
        ? t("provider.capability.textImage")
        : t("provider.capability.textOnly")
      : t("provider.capability.unknown");

    return (
      <span
        key={provider}
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300"
      >
        {label}
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-300">
          {capabilityLabel}
        </span>
      </span>
    );
  });

  if (!hasProviders) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-500/30 dark:bg-amber-950/30">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4" />
          {t("vault.init.title")}
        </div>
        <p className="mt-2 text-sm text-amber-700/80 dark:text-amber-100/70">
          {t("vault.init.body")}
        </p>
        <div className="mt-4">
          <Link
            href="/dashboard/settings/providers"
            className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-500"
          >
            {t("vault.init.cta")}
          </Link>
        </div>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <Lock className="h-4 w-4" />
          {t("vault.locked.title")}
        </div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t("vault.providers")}:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {providerBadges.length ? providerBadges : (
            <span className="text-xs text-gray-500">{t("general.none")}</span>
          )}
        </div>
        <div className="mt-4">
          <Link
            href="/dashboard/vault/unlock"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            {t("vault.locked.cta")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-950/30">
      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
        <ShieldCheck className="h-4 w-4" />
        {t("vault.unlocked.title")}
      </div>
      {formattedExpiry && (
        <p className="mt-1 text-xs text-emerald-700/70 dark:text-emerald-100/60">
          {t("vault.unlocked.expiresAt")} {formattedExpiry}
        </p>
      )}
      <p className="mt-2 text-sm text-emerald-700/80 dark:text-emerald-100/70">
        {t("vault.providers")}:
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {providerBadges.length ? providerBadges : (
          <span className="text-xs text-emerald-700/80 dark:text-emerald-100/70">
            {t("general.none")}
          </span>
        )}
      </div>
      <div className="mt-4">
        <button
          type="button"
          onClick={handleLock}
          disabled={locking}
          className="inline-flex items-center justify-center rounded-lg border border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-100"
        >
          {locking ? t("vault.locking") : t("vault.lock")}
        </button>
      </div>
    </div>
  );
};

export default VaultStatusAlert;
