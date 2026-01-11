"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, Check, Copy, Loader2 } from "lucide-react";

import Auth from "@/components/Auth";

type HistoryDetail = {
  id: string;
  userId: string;
  userEmail: string | null;
  feature: string;
  status: string;
  createdAt: string;
  providerId: string | null;
  inputPayload: unknown;
  outputPayload: unknown;
  assets: Array<{ id: string; url: string; type: string; historyId: string }>;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const getStatusClasses = (status: string) => {
  switch (status) {
    case "SUCCESS":
      return "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30";
    case "FAILED":
      return "text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-300 border-red-200 dark:border-red-500/30";
    case "PROCESSING":
      return "text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300 border-amber-200 dark:border-amber-500/30";
    default:
      return "text-gray-600 bg-gray-50 dark:bg-gray-500/10 dark:text-gray-300 border-gray-200 dark:border-gray-500/30";
  }
};

const FEATURE_LABELS: Record<string, string> = {
  YOUTUBE_PACKAGE: "YouTube Package",
  MUSIC_PROMPT: "AI Music Prompt",
  ALBUM_CONCEPT: "Album Concept",
};

const formatFeatureLabel = (feature: string) =>
  FEATURE_LABELS[feature] ?? feature.replace("_", " ");

const HistoryDetailPage = () => {
  const params = useParams();
  const historyId = params?.id as string;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [data, setData] = useState<HistoryDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/check-session");
        if (res.ok) {
          setIsAuthenticated(true);
        }
      } catch {
        // ignore
      } finally {
        setIsCheckingSession(false);
      }
    };
    checkSession();
  }, []);

  const loadDetail = useCallback(async () => {
    if (!historyId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch(`/api/history/${historyId}`);
      const payload = (await response.json()) as HistoryDetail & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load history detail");
      }
      setData(payload);
    } catch (error: any) {
      setErrorMsg(error.message || "Failed to load history detail");
    } finally {
      setLoading(false);
    }
  }, [historyId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadDetail();
  }, [isAuthenticated, loadDetail]);

  const copyPayload = (value: unknown, label: string) => {
    const text = JSON.stringify(value ?? {}, null, 2);
    navigator.clipboard.writeText(text);
    setCopiedSection(label);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const copyValue = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    setCopiedSection(label);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const getOutputObject = (value: unknown): Record<string, unknown> | null => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  };

  const getString = (value: unknown): string | null => {
    return typeof value === "string" && value.trim() ? value : null;
  };

  const getStringArray = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string");
    }
    if (typeof value === "string") {
      return value
        .split(/[,\\n]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  };

  const renderCopyButton = (label: string, value: string) => (
    <button
      type="button"
      onClick={() => copyValue(value, label)}
      className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
      title="Copy"
      aria-label="Copy"
    >
      {copiedSection === label ? (
        <Check className="w-4 h-4 text-emerald-500" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth onLogin={() => setIsAuthenticated(true)} />;
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4 text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {errorMsg}
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const output = getOutputObject(data.outputPayload);
  const outputTemplate = (() => {
    if (!output) {
      return (
        <p className="text-sm text-gray-500">No structured output available.</p>
      );
    }

    if (data.feature === "MUSIC_PROMPT") {
      const prompt = getString(output.prompt) ?? "";
      const explanation = getString(output.explanation) ?? "";
      return (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Prompt</h3>
              <div className="bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-lg p-3 text-sm whitespace-pre-wrap">
                {prompt || "—"}
              </div>
            </div>
            {prompt && renderCopyButton("music-prompt", prompt)}
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Explanation</h3>
              <div className="bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-lg p-3 text-sm whitespace-pre-wrap">
                {explanation || "—"}
              </div>
            </div>
            {explanation && renderCopyButton("music-explanation", explanation)}
          </div>
        </div>
      );
    }

    if (data.feature === "ALBUM_CONCEPT") {
      const albumTitle = getString(output.albumTitle) ?? "";
      const albumPrompt = getString(output.albumPrompt) ?? "";
      const description = getString(output.youtubeDescription) ?? "";
      const imagePrompt = getString(output.imagePrompt) ?? "";
      const tags = getStringArray(output.tags);
      const tracks = Array.isArray(output.tracks)
        ? (output.tracks as Array<Record<string, unknown>>)
        : [];

      return (
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Album Title</h3>
              <div className="bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-lg p-3 text-sm">
                {albumTitle || "—"}
              </div>
            </div>
            {albumTitle && renderCopyButton("album-title", albumTitle)}
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Album Prompt</h3>
              <div className="bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-lg p-3 text-sm whitespace-pre-wrap">
                {albumPrompt || "—"}
              </div>
            </div>
            {albumPrompt && renderCopyButton("album-prompt", albumPrompt)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Description</h3>
                <div className="bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-lg p-3 text-sm whitespace-pre-wrap">
                  {description || "—"}
                </div>
              </div>
              {description && renderCopyButton("album-description", description)}
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Image Prompt</h3>
                <div className="bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-lg p-3 text-sm whitespace-pre-wrap">
                  {imagePrompt || "—"}
                </div>
              </div>
              {imagePrompt && renderCopyButton("album-image-prompt", imagePrompt)}
            </div>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {tags.length === 0 ? (
                  <span className="text-sm text-gray-500">—</span>
                ) : (
                  tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                    >
                      #{tag}
                    </span>
                  ))
                )}
              </div>
            </div>
            {tags.length > 0 && renderCopyButton("album-tags", tags.join(", "))}
          </div>
          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-gray-500">Tracks</h3>
            {tracks.length === 0 ? (
              <p className="text-sm text-gray-500">—</p>
            ) : (
              <div className="space-y-3">
                {tracks.map((track, index) => {
                  const title = getString(track.title) ?? `Track ${index + 1}`;
                  const prompt = getString(track.prompt) ?? "";
                  const isVocal = track.isVocal === true;
                  return (
                    <div
                      key={`${title}-${index}`}
                      className="border border-gray-100 dark:border-gray-800 rounded-lg p-3 bg-gray-50 dark:bg-gray-950"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                          {title} {isVocal ? <span className="text-xs text-purple-500 ml-2">(Vocal)</span> : null}
                        </div>
                        {prompt && renderCopyButton(`album-track-${index}`, prompt)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 whitespace-pre-wrap">
                        {prompt || "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (data.feature === "YOUTUBE_PACKAGE") {
      const title = getString(output.youtubeTitle) ?? "";
      const description = getString(output.youtubeDescription) ?? "";
      const imagePrompt = getString(output.imagePrompt) ?? "";
      const tags = getStringArray(output.tags);
      const tier = typeof output.tier === "number" ? String(output.tier) : getString(output.tier);
      const tierReasoning = getString(output.tierReasoning) ?? "";
      const imageUrl = getString(output.imageUrl) ?? "";

      return (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Title</h3>
              <div className="bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-lg p-3 text-sm">
                {title || "—"}
              </div>
            </div>
            {title && renderCopyButton("package-title", title)}
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Description</h3>
              <div className="bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-lg p-3 text-sm whitespace-pre-wrap">
                {description || "—"}
              </div>
            </div>
            {description && renderCopyButton("package-description", description)}
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Image Prompt</h3>
              <div className="bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-lg p-3 text-sm whitespace-pre-wrap">
                {imagePrompt || "—"}
              </div>
            </div>
            {imagePrompt && renderCopyButton("package-image-prompt", imagePrompt)}
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {tags.length === 0 ? (
                  <span className="text-sm text-gray-500">—</span>
                ) : (
                  tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                    >
                      #{tag}
                    </span>
                  ))
                )}
              </div>
            </div>
            {tags.length > 0 && renderCopyButton("package-tags", tags.join(", "))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Tier</h3>
                <div className="bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-lg p-3 text-sm">
                  {tier || "—"}
                </div>
              </div>
              {tier && renderCopyButton("package-tier", tier)}
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Tier Reasoning</h3>
                <div className="bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-lg p-3 text-sm whitespace-pre-wrap">
                  {tierReasoning || "—"}
                </div>
              </div>
              {tierReasoning && renderCopyButton("package-tier-reasoning", tierReasoning)}
            </div>
          </div>
          {imageUrl && (
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Image URL</h3>
                <div className="bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-lg p-3 text-sm break-all">
                  {imageUrl}
                </div>
              </div>
              {renderCopyButton("package-image-url", imageUrl)}
            </div>
          )}
        </div>
      );
    }

    return (
      <p className="text-sm text-gray-500">No template available for this feature.</p>
    );
  })();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/history" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
            ← Back to history
          </Link>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs ${getStatusClasses(data.status)}`}>
            {data.status}
          </span>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">Feature</p>
              <p className="font-medium mt-1">{formatFeatureLabel(data.feature)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">Provider</p>
              <p className="font-medium mt-1">{data.providerId ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">Created</p>
              <p className="font-medium mt-1">{formatDate(data.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">User</p>
              <p className="font-medium mt-1">{data.userId}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">User Email</p>
              <p className="font-medium mt-1">{data.userEmail ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">History ID</p>
              <p className="font-medium mt-1 break-all">{data.id}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm uppercase tracking-wider text-gray-500">Input Payload</h2>
              <button
                type="button"
                onClick={() => copyPayload(data.inputPayload, "input")}
                className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                title="Copy input JSON"
              >
                {copiedSection === "input" ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <pre className="text-xs bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-lg p-3 overflow-auto max-h-96">
              {JSON.stringify(data.inputPayload ?? {}, null, 2)}
            </pre>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-gray-500">Output Summary</h2>
            {outputTemplate}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-gray-500">Raw Output Payload</h2>
            <button
              type="button"
              onClick={() => copyPayload(data.outputPayload, "output")}
              className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title="Copy output JSON"
            >
              {copiedSection === "output" ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
          <pre className="text-xs bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-lg p-3 overflow-auto max-h-96">
            {JSON.stringify(data.outputPayload ?? {}, null, 2)}
          </pre>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-gray-500 mb-4">Assets</h2>
          {data.assets.length === 0 ? (
            <p className="text-sm text-gray-500">No assets stored for this request.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.assets.map((asset) => (
                <div key={asset.id} className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 space-y-2">
                  <div className="text-xs text-gray-500">{asset.type}</div>
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-indigo-600 dark:text-indigo-400 break-all hover:underline"
                  >
                    {asset.url}
                  </a>
                  {asset.url.startsWith("http") && (
                    <img src={asset.url} alt={asset.type} className="w-full rounded-md border border-gray-200 dark:border-gray-800" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryDetailPage;
