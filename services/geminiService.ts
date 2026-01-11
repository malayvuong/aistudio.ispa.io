import type { AIProviderId } from "@/services/ai/types";
import {
  AlbumInput,
  AlbumResult,
  PackagingResult,
  SongInput,
  MusicInput,
  MusicResult,
  VisualAssets,
} from "../types";

const buildHeaders = (providerId?: AIProviderId) => ({
  "Content-Type": "application/json",
  ...(providerId ? { "x-ai-provider": providerId } : {}),
});

const withProvider = <T extends object>(
  input: T,
  providerId?: AIProviderId
): T & { providerId?: AIProviderId } => {
  if (!providerId) return input as T & { providerId?: AIProviderId };
  return { ...input, providerId };
};

// --- Existing Youtube Packaging ---
export const generatePackage = async (
  input: SongInput,
  providerId?: AIProviderId
): Promise<PackagingResult> => {
  try {
    const response = await fetch("/api/generate/package", {
      method: "POST",
      headers: buildHeaders(providerId),
      body: JSON.stringify(withProvider(input, providerId)),
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.error || `API Error: ${response.status} ${response.statusText}`);
      (error as Error & { code?: string }).code = data.code;
      throw error;
    }

    return data as PackagingResult;
  } catch (error: any) {
    console.error("Service error:", error);
    throw new Error(error.message || "Failed to connect to API");
  }
};

export const generateVisualAssets = async (
  prompt: string,
  songName: string,
  providerId?: AIProviderId,
  channelId?: string
): Promise<VisualAssets> => {
  try {
    const response = await fetch("/api/generate/visuals", {
      method: "POST",
      headers: buildHeaders(providerId),
      body: JSON.stringify(withProvider({ prompt, songName, channelId }, providerId)),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `API Error: ${response.status} ${response.statusText}`);
    }

    return data as VisualAssets;
  } catch (error: any) {
    console.error("Service visual error:", error);
    throw new Error(error.message || "Failed to connect to Visual API");
  }
};

// --- New: Music Prompt Generator ---
export const generateMusicPrompt = async (
  input: MusicInput,
  providerId?: AIProviderId
): Promise<MusicResult> => {
  try {
    const response = await fetch("/api/generate/music", {
      method: "POST",
      headers: buildHeaders(providerId),
      body: JSON.stringify(withProvider(input, providerId)),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to generate music prompt");
    return data as MusicResult;
  } catch (error: any) {
    throw new Error(error.message || "API Connection Error");
  }
};

// --- New: Album Generator ---
export const generateAlbum = async (
  input: AlbumInput,
  providerId?: AIProviderId
): Promise<AlbumResult> => {
  try {
    const response = await fetch("/api/generate/album", {
      method: "POST",
      headers: buildHeaders(providerId),
      body: JSON.stringify(withProvider(input, providerId)),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to generate Album");
    return data as AlbumResult;
  } catch (error: any) {
    throw new Error(error.message || "API Connection Error");
  }
};
