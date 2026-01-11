import type { AIProvider, AIProviderId } from "./types";
import { googleProvider } from "./providers/google";
import { openaiProvider } from "./providers/openai";
import { deepseekProvider } from "./providers/deepseek";
import { grokProvider } from "./providers/grok";
import { isProviderId } from "./capabilities";

export const DEFAULT_PROVIDER_ID: AIProviderId = "GOOGLE";

const providers = new Map<AIProviderId, AIProvider>([
  ["GOOGLE", googleProvider],
  ["OPENAI", openaiProvider],
  ["DEEPSEEK", deepseekProvider],
  ["GROK", grokProvider],
]);

export const getProvider = (providerId?: AIProviderId): AIProvider => {
  const resolvedId = providerId ?? DEFAULT_PROVIDER_ID;
  return providers.get(resolvedId) ?? providers.get(DEFAULT_PROVIDER_ID)!;
};

export { isProviderId };
