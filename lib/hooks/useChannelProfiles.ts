"use client";

import { useEffect, useState } from "react";

type ChannelProfile = {
  id: string;
  name: string;
  defaultLanguage?: string | null;
  defaultTone?: string | null;
  defaultHashtags?: string[];
};

const STORAGE_KEY = "selected_channel_id";

export const useChannelProfiles = () => {
  const [channels, setChannels] = useState<ChannelProfile[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/channels");
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load channels.");
        }

        const items = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.channels)
          ? payload.channels
          : [];

        if (!active) return;

        setChannels(items);

        const stored = localStorage.getItem(STORAGE_KEY);
        const storedValid = stored && items.some((channel: ChannelProfile) => channel.id === stored);
        const initial = storedValid ? stored : items[0]?.id ?? "";

        setSelectedChannelId(initial);
        if (initial) {
          localStorage.setItem(STORAGE_KEY, initial);
        }
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || "Failed to load channels.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedChannelId) return;
    localStorage.setItem(STORAGE_KEY, selectedChannelId);
  }, [selectedChannelId]);

  return {
    channels,
    selectedChannelId,
    setSelectedChannelId,
    loading,
    error,
  };
};
