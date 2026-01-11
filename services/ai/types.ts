export type AIProviderId = "GOOGLE" | "OPENAI" | "DEEPSEEK" | "GROK";

export type ProviderCapability = {
  text: true;
  image: boolean;
};

export interface TextModel {
  generateJSON<T>(options: {
    prompt: string;
    apiKey: string;
    schema?: unknown;
    system?: string;
  }): Promise<T>;
}

export interface ImageModel {
  generateImage(options: {
    prompt: string;
    apiKey: string;
    aspectRatio: "16:9" | "1:1";
    inputImage?: { data: string; mimeType?: string };
  }): Promise<{ imageUrl: string; base64?: string }>;
}

export type AIProvider = {
  id: AIProviderId;
  label: string;
  text: TextModel;
  image: ImageModel;
  supportsImageEdits?: boolean;
};
