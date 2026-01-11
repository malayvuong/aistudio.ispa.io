import type { AIProvider, AIProviderId } from "../types";

export const createPlaceholderProvider = (
  id: AIProviderId,
  label: string
): AIProvider => ({
  id,
  label,
  text: {
    async generateJSON(_options: { prompt: string; apiKey: string; schema?: unknown; system?: string }) {
      throw new Error(`${label} is not implemented yet`);
    },
  },
  image: {
    async generateImage(_options: {
      prompt: string;
      apiKey: string;
      aspectRatio: "16:9" | "1:1";
      inputImage?: { data: string; mimeType?: string };
    }) {
      throw new Error(`${label} is not implemented yet`);
    },
  },
});
