import type { AIProvider, ImageModel, TextModel } from "../types";

const textModel: TextModel = {
  async generateJSON(_options: { prompt: string; apiKey: string; schema?: unknown; system?: string }) {
    throw new Error("DeepSeek is not implemented yet");
  },
};

const imageModel: ImageModel = {
  async generateImage(_options: {
    prompt: string;
    apiKey: string;
    aspectRatio: "16:9" | "1:1";
    inputImage?: { data: string; mimeType?: string };
  }) {
    throw new Error("DeepSeek image generation is not implemented yet");
  },
};

export const deepseekProvider: AIProvider = {
  id: "DEEPSEEK",
  label: "DeepSeek",
  text: textModel,
  image: imageModel,
};
