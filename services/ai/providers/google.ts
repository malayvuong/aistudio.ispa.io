import { GoogleGenAI } from "@google/genai";

import type { AIProvider, ImageModel, TextModel } from "../types";

const clientCache = new Map<string, GoogleGenAI>();

const getClient = (apiKey: string): GoogleGenAI => {
  if (!apiKey) {
    throw new Error("GOOGLE API key is required");
  }
  const cached = clientCache.get(apiKey);
  if (cached) return cached;
  const client = new GoogleGenAI({ apiKey });
  clientCache.set(apiKey, client);
  return client;
};

const textModel: TextModel = {
  async generateJSON<T>({
    prompt,
    apiKey,
    schema,
  }: {
    prompt: string;
    apiKey: string;
    schema?: unknown;
    system?: string;
  }) {
    const client = getClient(apiKey);
    const config: Record<string, unknown> = {
      thinkingConfig: { thinkingBudget: 32768 },
    };

    if (schema) {
      config.responseMimeType = "application/json";
      config.responseSchema = schema;
    }

    const response = await client.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config,
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text) as T;
  },
};

const imageModel: ImageModel = {
  async generateImage({ prompt, aspectRatio, inputImage, apiKey }) {
    const client = getClient(apiKey);
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    if (inputImage) {
      parts.push({
        inlineData: {
          mimeType: inputImage.mimeType ?? "image/png",
          data: inputImage.data,
        },
      });
    }

    parts.push({ text: prompt });

    const response = await client.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: { parts },
      config: { imageConfig: { aspectRatio } },
    });

    const candidates = response.candidates ?? [];
    const partsOut = candidates[0]?.content?.parts ?? [];

    for (const part of partsOut) {
      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType ?? "image/png";
        const base64Data = part.inlineData.data;
        return {
          imageUrl: `data:${mimeType};base64,${base64Data}`,
          base64: base64Data,
        };
      }
    }

    throw new Error("No image generated in Gemini response");
  },
};

export const googleProvider: AIProvider = {
  id: "GOOGLE",
  label: "Google Gemini",
  text: textModel,
  image: imageModel,
  supportsImageEdits: true,
};
