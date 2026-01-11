"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Settings2 } from "lucide-react";
import { useT } from "@/components/i18n/LanguageProvider";

type ChannelProfile = {
  id: string;
  name: string;
  defaultLanguage?: string | null;
  defaultTone?: string | null;
  defaultHashtags?: string[];
};

const emptyForm = {
  name: "",
  defaultLanguage: "",
  defaultTone: "",
  defaultHashtags: "",
};

export default function ChannelsPage() {
  const t = useT();
  const [channels, setChannels] = useState<ChannelProfile[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "idle" | "error" | "success"; message?: string }>({
    type: "idle",
  });

  const loadChannels = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/channels");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || t("channels.error.load"));
      }
      const items = Array.isArray(data?.channels) ? data.channels : [];
      setChannels(items);
    } catch (error: any) {
      setStatus({ type: "error", message: error?.message || t("channels.error.load") });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: "idle" });

    try {
      const response = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          defaultLanguage: form.defaultLanguage,
          defaultTone: form.defaultTone,
          defaultHashtags: form.defaultHashtags,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || t("channels.error.create"));
      }
      setForm(emptyForm);
      setStatus({ type: "success", message: t("channels.create.success") });
      await loadChannels();
    } catch (error: any) {
      setStatus({ type: "error", message: error?.message || t("channels.error.create") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("channels.title")}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("channels.subtitle")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Plus className="h-5 w-5 text-indigo-500" />
            {t("channels.create.title")}
          </h2>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-500">
                {t("channels.field.name.label")}
              </label>
              <input
                value={form.name}
                onChange={(event) => handleChange("name", event.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                placeholder={t("channels.field.name.placeholder")}
                required
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-500">
                {t("channels.field.language.label")}
              </label>
              <input
                value={form.defaultLanguage}
                onChange={(event) => handleChange("defaultLanguage", event.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                placeholder={t("channels.field.language.placeholder")}
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-500">
                {t("channels.field.tone.label")}
              </label>
              <input
                value={form.defaultTone}
                onChange={(event) => handleChange("defaultTone", event.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                placeholder={t("channels.field.tone.placeholder")}
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-500">
                {t("channels.field.hashtags.label")}
              </label>
              <textarea
                value={form.defaultHashtags}
                onChange={(event) => handleChange("defaultHashtags", event.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                placeholder={t("channels.field.hashtags.placeholder")}
                rows={3}
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
              <Plus className="h-4 w-4" />
              {saving ? t("channels.create.saving") : t("channels.create.button")}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-indigo-500" />
            {t("channels.existing.title")}
          </h2>

          {loading ? (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{t("channels.loading")}</p>
          ) : channels.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {t("channels.empty")}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {channels.map((channel) => (
                <Link
                  key={channel.id}
                  href={`/dashboard/channels/${channel.id}`}
                  className="block rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-200"
                >
                  <div className="font-semibold break-words">{channel.name}</div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 break-words">
                    {channel.defaultLanguage
                      ? `${t("label.language")}: ${channel.defaultLanguage}`
                      : t("channels.defaultLanguage.none")}
                    {channel.defaultTone ? ` · ${t("label.tone")}: ${channel.defaultTone}` : ""}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
