import type { AIProvider, ImageModel, TextModel } from "../types";

const getApiKey = (apiKey?: string): string => {
  if (!apiKey) {
    throw new Error("GROK API key is required");
  }
  return apiKey;
};

const textModel: TextModel = {
  async generateJSON<T>({
    prompt,
    system,
    schema,
    apiKey,
  }: {
    prompt: string;
    system?: string;
    schema?: unknown;
    apiKey: string;
  }) {
    const apiKeyValue = getApiKey(apiKey);
    const schemaHint = schema
      ? `Return valid JSON that matches this schema: ${JSON.stringify(schema)}`
      : "Return valid JSON.";
    const systemContent =
      system ??
      `You are a professional assistant. ${schemaHint} Do not include markdown or extra commentary.`;

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKeyValue}`,
      },
      body: JSON.stringify({
        model: "grok-4",
        stream: false,
        temperature: 0.7,
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Grok API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No content in Grok response");
    }

    return JSON.parse(content) as T;
  },
};

const imageModel: ImageModel = {
  async generateImage(_options: {
    prompt: string;
    apiKey: string;
    aspectRatio: "16:9" | "1:1";
    inputImage?: { data: string; mimeType?: string };
  }) {
    throw new Error("Grok image generation is not implemented yet");
  },
};

export const grokProvider: AIProvider = {
  id: "GROK",
  label: "Grok",
  text: textModel,
  image: imageModel,
};
