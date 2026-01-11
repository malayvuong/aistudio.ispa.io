import type { AlbumTier } from "@/types";

export const TIER_DEFINITIONS: Array<{
  id: AlbumTier;
  label: string;
  summary: string;
}> = [
  { id: 1, label: "Epic / Cinematic / Orchestral", summary: "Grand, battle, fantasy" },
  { id: 2, label: "Lofi / Study / Ambient", summary: "Calm, cozy, anime-style" },
  { id: 3, label: "Emotional / Ballad / Pop", summary: "Moody, sentimental, human-focus" },
  { id: 4, label: "Dark / Aggressive / Phonk", summary: "Metal, horror, gritty, high-contrast" },
  { id: 5, label: "Retro / Synthwave / Disco", summary: "Neon, 80s, future-retro" },
  { id: 6, label: "Acoustic / Folk / Bright", summary: "Nature, sunlight, organic, happy" },
];

export const TIER_GUIDE = TIER_DEFINITIONS.map(
  (tier) => `${tier.id}: ${tier.label} (${tier.summary})`
).join("\n");
