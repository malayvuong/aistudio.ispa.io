
export enum GenreTier {
  TIER_1_EPIC = 1,
  TIER_2_LOFI = 2,
  TIER_3_DEFAULT = 3,
}

export type AlbumTier = 1 | 2 | 3 | 4 | 5 | 6;

export interface ChannelDefaults {
  language?: string;
  tone?: string;
  hashtags?: string[];
}

export interface SocialLinkItem {
  type: string;
  url: string;
}

export interface SongInput {
  songName: string;
  stylePrompt: string;
  lyrics: string;
  userDescription: string;
  visualPromptOverride: string;
  channelId?: string;
  channelName?: string;
  channelDefaults?: ChannelDefaults;
  socialLinks?: SocialLinkItem[];
}

export interface PackagingResult {
  tier: GenreTier;
  tierReasoning: string;
  youtubeTitle: string;
  youtubeDescription: string;
  tags: string[];
  imagePrompt: string;
}

export interface CanvasConfig {
  width: number;
  height: number;
  text: string;
  tier: GenreTier;
}

export interface VisualAssets {
  baseImage: string;      // 16:9, no text
  squareWithText: string; // 1:1, with text
  landscapeWithText: string; // 16:9, with text
}

// --- Music Generator Types ---
export interface MusicInput {
  lyrics: string;
  genres: string[];
  vibes: string[];
  instruments: string[];
  vocals: string[];
  customContext: string;
  channelId?: string;
  channelName?: string;
  channelDefaults?: ChannelDefaults;
}

export interface MusicResult {
  prompt: string;
  explanation: string;
}

// --- Album Generator Types ---
export interface AlbumInput {
  subject: string;
  musicalElements: string;
  trackCount: number;
  tier: AlbumTier;
  vocalTrackNumber?: number;
  channelId?: string;
  channelName?: string;
  channelDefaults?: ChannelDefaults;
  socialLinks?: SocialLinkItem[];
}

export interface AlbumTrack {
  title: string;
  prompt: string;
  isVocal: boolean;
}

export interface AlbumResult {
  albumTitle: string;
  albumPrompt: string;
  tracks: AlbumTrack[];
  youtubeDescription: string;
  tags: string[];
  imagePrompt: string;
}
