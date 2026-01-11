"use client";

import { useCallback, useEffect, useState } from "react";

import type { AIProviderId, ProviderCapability } from "@/services/ai/types";
import { normalizeProviderId } from "@/services/ai/capabilities";

type VaultStatusResponse = {
  initializedProviders: string[];
  unlocked: boolean;
  capabilities: Record<string, ProviderCapability>;
};

export const useVaultStatus = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initializedProviders, setInitializedProviders] = useState<AIProviderId[]>([]);
  const [capabilities, setCapabilities] = useState<Record<string, ProviderCapability>>({});

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/vault/status", { cache: "no-store" });
      const data = (await response.json()) as VaultStatusResponse & { error?: string };

      if (!response.ok) {
        setError(data?.error || "Failed to load vault status.");
        setInitializedProviders([]);
        setCapabilities({});
        return;
      }

      const normalizedProviders = Array.isArray(data.initializedProviders)
        ? data.initializedProviders
            .map((provider) => normalizeProviderId(provider))
            .filter((provider): provider is AIProviderId => !!provider)
        : [];

      setInitializedProviders(normalizedProviders);
      setCapabilities(data.capabilities ?? {});
    } catch (err: any) {
      setError(err?.message || "Failed to load vault status.");
      setInitializedProviders([]);
      setCapabilities({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    loading,
    error,
    initializedProviders,
    capabilities,
    refresh: fetchStatus,
  };
};
