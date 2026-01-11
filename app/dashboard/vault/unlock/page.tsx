"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Unlock } from "lucide-react";
import { useT } from "@/components/i18n/LanguageProvider";

export default function VaultUnlockPage() {
  const router = useRouter();
  const t = useT();
  const [vaultPassphrase, setVaultPassphrase] = useState("");
  const [status, setStatus] = useState<{ type: "idle" | "error"; message?: string }>({
    type: "idle",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus({ type: "idle" });
    setLoading(true);

    try {
      const response = await fetch("/api/vault/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vaultPassphrase }),
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus({ type: "error", message: data?.error || t("vault.unlock.error") });
        return;
      }

      router.replace("/dashboard");
    } catch {
      setStatus({ type: "error", message: t("vault.unlock.error") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t("vault.unlock.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("vault.unlock.subtitle")}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-gray-500">
              {t("vault.unlock.label")}
            </label>
            <input
              type="password"
              value={vaultPassphrase}
              onChange={(event) => setVaultPassphrase(event.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              placeholder={t("vault.unlock.placeholder")}
              required
            />
          </div>

          {status.type === "error" && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200">
              {status.message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Unlock className="h-4 w-4" />
            {loading ? t("vault.unlock.loading") : t("vault.unlock.button")}
          </button>
        </form>
      </div>
    </div>
  );
}
