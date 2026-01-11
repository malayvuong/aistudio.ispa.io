import type { AIProviderId } from "@/services/ai/types";

export const DEFAULT_PROVIDER_ID: AIProviderId = "GOOGLE";

export const AI_PROVIDER_OPTIONS: Array<{
  id: AIProviderId;
  label: string;
  description: string;
}> = [
  { id: "GOOGLE", label: "Google Gemini", description: "Gemini 3 Pro" },
  { id: "OPENAI", label: "OpenAI", description: "GPT-5.2 + IMAGE 1.5" },
  { id: "DEEPSEEK", label: "DeepSeek", description: "Not implemented yet" },
  { id: "GROK", label: "Grok", description: "Grok 4 (text-only)" },
];

export const isAIProviderId = (value?: string | null): value is AIProviderId => {
  if (!value) return false;
  const normalized = value.trim().toUpperCase();
  return normalized === "GOOGLE" || normalized === "OPENAI" || normalized === "DEEPSEEK" || normalized === "GROK";
};

export const getProviderLabel = (id: AIProviderId): string => {
  return AI_PROVIDER_OPTIONS.find((option) => option.id === id)?.label ?? id;
};

export const normalizeAIProviderId = (value?: string | null): AIProviderId | null => {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  return isAIProviderId(normalized) ? (normalized as AIProviderId) : null;
};
