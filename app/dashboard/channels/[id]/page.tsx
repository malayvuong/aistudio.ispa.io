"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useT } from "@/components/i18n/LanguageProvider";

type ChannelProfile = {
  id: string;
  name: string;
  defaultLanguage?: string | null;
  defaultTone?: string | null;
  defaultHashtags?: string[];
};

type StatusState = { type: "idle" | "error" | "success"; message?: string };

export default function ChannelEditPage() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const channelId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : "";
  const t = useT();
  const [channel, setChannel] = useState<ChannelProfile | null>(null);
  const [form, setForm] = useState({
    name: "",
    defaultLanguage: "",
    defaultTone: "",
    defaultHashtags: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState<StatusState>({ type: "idle" });

  const loadChannel = useCallback(async () => {
    setLoading(true);
    try {
      if (!channelId) {
        throw new Error(t("channels.error.loadOne"));
      }
      const response = await fetch(`/api/channels/${channelId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || t("channels.error.loadOne"));
      }
      setChannel(data);
      setForm({
        name: data.name || "",
        defaultLanguage: data.defaultLanguage || "",
        defaultTone: data.defaultTone || "",
        defaultHashtags: Array.isArray(data.defaultHashtags)
          ? data.defaultHashtags.map((tag: string) => `#${tag}`).join(", ")
          : "",
      });
    } catch (error: any) {
      setStatus({ type: "error", message: error?.message || t("channels.error.loadOne") });
    } finally {
      setLoading(false);
    }
  }, [channelId, t]);

  useEffect(() => {
    loadChannel();
  }, [loadChannel]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: "idle" });

    try {
      const response = await fetch(`/api/channels/${channelId}`, {
        method: "PUT",
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
        throw new Error(data?.error || t("channels.error.update"));
      }
      setChannel(data);
      setStatus({ type: "success", message: t("channels.edit.update.success") });
    } catch (error: any) {
      setStatus({ type: "error", message: error?.message || t("channels.error.update") });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t("channels.edit.confirmDelete"))) return;
    setDeleting(true);
    setStatus({ type: "idle" });

    try {
      const response = await fetch(`/api/channels/${channelId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || t("channels.error.delete"));
      }
      router.push("/dashboard/channels");
    } catch (error: any) {
      setStatus({ type: "error", message: error?.message || t("channels.error.delete") });
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/channels"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("channels.edit.back")}
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t("channels.edit.title")}
        </h1>
        {channel?.name && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 break-words">
            {channel.name}
          </p>
        )}
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("channels.edit.subtitle")}
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{t("channels.edit.loading")}</p>
        ) : (
          <form onSubmit={handleSave} className="mt-6 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-500">
                {t("channels.field.name.label")}
              </label>
              <input
                value={form.name}
                onChange={(event) => handleChange("name", event.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
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

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? t("channels.edit.saving") : t("channels.edit.save")}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? t("channels.edit.deleting") : t("channels.edit.delete")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
