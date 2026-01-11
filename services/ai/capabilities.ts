import type { AIProviderId, ProviderCapability } from "./types";

export const PROVIDER_CAPABILITIES: Record<AIProviderId, ProviderCapability> = {
  GOOGLE: { text: true, image: true },
  OPENAI: { text: true, image: true },
  DEEPSEEK: { text: true, image: false },
  GROK: { text: true, image: false },
};

export const normalizeProviderId = (value?: string | null): AIProviderId | null => {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  return normalized in PROVIDER_CAPABILITIES ? (normalized as AIProviderId) : null;
};

export const isProviderId = (value?: string | null): value is AIProviderId => {
  return !!normalizeProviderId(value);
};
