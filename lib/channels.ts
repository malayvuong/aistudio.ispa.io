import type { ChannelProfile } from "@prisma/client";

import type { ChannelDefaults } from "@/types";

export const normalizeHashtags = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.trim().replace(/^#/, ""))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[,\\n]/)
      .map((tag) => tag.trim().replace(/^#/, ""))
      .filter(Boolean);
  }

  return [];
};

export const buildChannelDefaults = (profile: ChannelProfile): ChannelDefaults => {
  const hashtags = normalizeHashtags(profile.defaultHashtags);
  return {
    language: profile.defaultLanguage ?? undefined,
    tone: profile.defaultTone ?? undefined,
    hashtags: hashtags.length ? hashtags : undefined,
  };
};
