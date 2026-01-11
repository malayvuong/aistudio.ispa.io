"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";

import Auth from "@/components/Auth";

type HistoryItem = {
  id: string;
  userId: string;
  feature: string;
  status: string;
  createdAt: string;
  providerId: string | null;
  summary: string;
};

type HistoryResponse = {
  items: HistoryItem[];
  page: number;
  pageSize: number;
  total: number;
};

const STATUS_OPTIONS = ["ALL", "SUCCESS", "FAILED", "PROCESSING"] as const;
const FEATURE_OPTIONS = ["ALL", "YOUTUBE_PACKAGE", "MUSIC_PROMPT", "ALBUM_CONCEPT"] as const;
const FEATURE_LABELS: Record<string, string> = {
  ALL: "All",
  YOUTUBE_PACKAGE: "YouTube Package",
  MUSIC_PROMPT: "AI Music Prompt",
  ALBUM_CONCEPT: "Album Concept",
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const formatUserId = (value: string) => {
  if (!value) return "-";
  return value.length > 10 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
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

const formatFeatureLabel = (feature: string) =>
  FEATURE_LABELS[feature] ?? feature.replace("_", " ");

const HistoryPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("ALL");
  const [featureFilter, setFeatureFilter] = useState<(typeof FEATURE_OPTIONS)[number]>("ALL");
  const [userIdFilter, setUserIdFilter] = useState("");

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

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (featureFilter !== "ALL") params.set("feature", featureFilter);
      if (userIdFilter.trim()) params.set("userId", userIdFilter.trim());

      const response = await fetch(`/api/history?${params.toString()}`);
      const data = (await response.json()) as HistoryResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Failed to load history");
      }

      setItems(data.items);
      setTotal(data.total);
    } catch (error: any) {
      setErrorMsg(error.message || "Failed to load history");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [featureFilter, page, pageSize, statusFilter, userIdFilter]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadHistory();
  }, [isAuthenticated, loadHistory]);

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

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Generation History</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Review inputs and outputs for every AI request.
            </p>
          </div>
          <button
            onClick={loadHistory}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-500">Status</label>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setPage(1);
                  setStatusFilter(event.target.value as (typeof STATUS_OPTIONS)[number]);
                }}
                className="mt-2 w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-500">Feature</label>
              <select
                value={featureFilter}
                onChange={(event) => {
                  setPage(1);
                  setFeatureFilter(event.target.value as (typeof FEATURE_OPTIONS)[number]);
                }}
                className="mt-2 w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                {FEATURE_OPTIONS.map((feature) => (
                  <option key={feature} value={feature}>
                    {formatFeatureLabel(feature)}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-wider text-gray-500">User Id</label>
              <input
                value={userIdFilter}
                onChange={(event) => {
                  setPage(1);
                  setUserIdFilter(event.target.value);
                }}
                placeholder="Filter by exact user id"
                className="mt-2 w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
            <AlertTriangle className="w-4 h-4" />
            {errorMsg}
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">When</th>
                  <th className="px-4 py-3 text-left">Feature</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Provider</th>
                  <th className="px-4 py-3 text-left">Summary</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Open</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
                      Loading history...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                      No history records found.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(item.createdAt)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatFeatureLabel(item.feature)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs ${getStatusClasses(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.providerId ?? "-"}</td>
                      <td className="px-4 py-3 max-w-xs truncate">{item.summary}</td>
                      <td className="px-4 py-3">{formatUserId(item.userId)}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/history/${item.id}`}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-4 border-t border-gray-100 dark:border-gray-800">
            <div className="text-xs text-gray-500">
              Page {page} of {totalPages} • {total} records
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 disabled:opacity-50"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
