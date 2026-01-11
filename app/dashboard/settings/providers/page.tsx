"use client";

import { useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";

import { useT } from "@/components/i18n/LanguageProvider";
import { PROVIDER_CAPABILITIES } from "@/lib/vault/providers";

const PROVIDERS = Object.keys(PROVIDER_CAPABILITIES);

export default function ProviderSettingsPage() {
  const t = useT();
  const [providerId, setProviderId] = useState(PROVIDERS[0] ?? "GOOGLE");
  const [providerKey, setProviderKey] = useState("");
  const [vaultPassphrase, setVaultPassphrase] = useState("");
  const [status, setStatus] = useState<{ type: "idle" | "error" | "success"; message?: string }>(
    { type: "idle" }
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus({ type: "idle" });
    setSaving(true);

    try {
      const response = await fetch("/api/vault/provider/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, providerKey, vaultPassphrase }),
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus({ type: "error", message: data?.error || t("settings.save.error") });
        return;
      }

      setProviderKey("");
      setStatus({ type: "success", message: t("settings.save.success") });
    } catch {
      setStatus({ type: "error", message: t("settings.save.error") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("tool.settings.title")}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("tool.settings.subtitle")}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-gray-500">
              {t("settings.provider.label")}
            </label>
            <select
              value={providerId}
              onChange={(event) => setProviderId(event.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              {PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-gray-500">
              {t("settings.providerKey.label")}
            </label>
            <input
              type="password"
              value={providerKey}
              onChange={(event) => setProviderKey(event.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              placeholder={t("settings.providerKey.placeholder")}
              required
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-gray-500">
              {t("settings.vaultPassphrase.label")}
            </label>
            <input
              type="password"
              value={vaultPassphrase}
              onChange={(event) => setVaultPassphrase(event.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              placeholder={t("settings.vaultPassphrase.placeholder")}
              required
            />
          </div>

          {status.type === "error" && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200">
              {status.message}
            </div>
          )}

          {status.type === "success" && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-200">
              {status.message}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <KeyRound className="h-4 w-4" />
            {saving ? t("settings.saving") : t("settings.save")}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-sm text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-950/40 dark:text-indigo-200">
        <div className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="h-4 w-4" />
          {t("settings.securityTip.title")}
        </div>
        <p className="mt-2">
          {t("settings.securityTip.body")}
        </p>
      </div>
    </div>
  );
}
