"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, Unlock } from "lucide-react";

import { storeRerunPayload } from "@/lib/rerun";
import { useT } from "@/components/i18n/LanguageProvider";

const FEATURE_ROUTES: Record<string, string> = {
  YOUTUBE_PACKAGE: "/dashboard/tools/youtube",
  MUSIC_PROMPT: "/dashboard/tools/music",
  ALBUM_CONCEPT: "/dashboard/tools/album",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

type VaultStatus = {
  unlocked: boolean;
};

export default function RerunPanel({
  feature,
  inputPayload,
}: {
  feature: string;
  inputPayload: unknown;
}) {
  const router = useRouter();
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const t = useT();

  const payload = useMemo(() => (isRecord(inputPayload) ? inputPayload : {}), [inputPayload]);
  const channelId = typeof payload.channelId === "string" ? payload.channelId : "";
  const route = FEATURE_ROUTES[feature];
  const isLocked = vaultStatus?.unlocked === false;

  useEffect(() => {
    let active = true;
    const loadStatus = async () => {
      try {
        const response = await fetch("/api/vault/status");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || t("rerun.errorVaultStatus"));
        }
        if (active) {
          setVaultStatus({ unlocked: Boolean(data?.unlocked) });
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || t("rerun.errorVaultStatus"));
        }
      }
    };
    loadStatus();
    return () => {
      active = false;
    };
  }, [t]);

  const handleRerun = () => {
    setError(null);
    if (!route) {
      setError(t("rerun.errorUnsupported"));
      return;
    }
    if (vaultStatus?.unlocked !== true) {
      setError(t("rerun.errorLocked"));
      return;
    }
    setLoading(true);
    storeRerunPayload({ feature, input: payload });
    router.push(route);
  };

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5 text-sm text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-950/40 dark:text-indigo-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-indigo-500">{t("rerun.title")}</div>
          <div className="text-sm font-semibold">
            {t("rerun.subtitle")}
          </div>
          {isLocked && (
            <div className="mt-1 text-xs text-indigo-500">
              {t("rerun.vaultLocked")}
            </div>
          )}
          {!channelId && (
            <div className="mt-1 text-xs text-indigo-500">
              {t("rerun.channelMissing")}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!vaultStatus?.unlocked && (
            <Link
              href="/dashboard/vault/unlock"
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 dark:border-indigo-500/40 dark:bg-indigo-900/30 dark:text-indigo-200"
            >
              <Unlock className="h-3.5 w-3.5" />
              {t("rerun.unlock")}
            </Link>
          )}
          <button
            type="button"
            onClick={handleRerun}
            disabled={loading || isLocked}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Play className="h-3.5 w-3.5" />
            {loading ? t("rerun.opening") : t("rerun.button")}
          </button>
        </div>
      </div>
      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-600 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
