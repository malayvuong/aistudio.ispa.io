import { Type, Schema } from "@google/genai";

import type {
  AlbumInput,
  AlbumResult,
  ChannelDefaults,
  MusicInput,
  MusicResult,
  PackagingResult,
  SocialLinkItem,
  SongInput,
  VisualAssets,
} from "@/types";
import { TIER_GUIDE } from "@/lib/tiers";
import { formatSocialLinksBlock, formatSocialLinksForPrompt, normalizeSocialLinks } from "@/lib/social-links";
import type { AIProviderId } from "./types";
import { getProvider } from "./registry";

const SOCIAL_LINKS_PLACEHOLDER = "{{SOCIAL_LINKS_PLACEHOLDER}}";

const PACKAGE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    tier: {
      type: Type.INTEGER,
      description: `Tier definitions:\n${TIER_GUIDE}`,
    },
    tierReasoning: {
      type: Type.STRING,
      description: "Brief explanation of why this tier was chosen based on the style keywords.",
    },
    youtubeTitle: {
      type: Type.STRING,
      description: "Catchy YouTube title formatted as '[Catchy Name] | [Genre/Mood]'",
    },
    youtubeDescription: {
      type: Type.STRING,
      description: "Full YouTube description including intro, story based on lyrics, and call to action.",
    },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "15-20 optimized YouTube tags.",
    },
    imagePrompt: {
      type: Type.STRING,
      description:
        "Detailed prompt for Midjourney/DALL-E 3 based on the visual style of the tier. DO NOT include instructions for text overlay in this prompt.",
    },
  },
  required: [
    "tier",
    "youtubeTitle",
    "youtubeDescription",
    "tags",
    "imagePrompt",
    "tierReasoning",
  ],
};

const MUSIC_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    prompt: {
      type: Type.STRING,
      description: "The optimized style prompt for Music AI (max 1000 chars).",
    },
    explanation: {
      type: Type.STRING,
      description: "Brief explanation of the prompt structure.",
    },
  },
  required: ["prompt", "explanation"],
};

const ALBUM_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    albumTitle: { type: Type.STRING },
    albumPrompt: {
      type: Type.STRING,
      description: "Single main prompt that sets the album's sonic identity.",
    },
    tracks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          prompt: {
            type: Type.STRING,
            description: "Specific Music AI (v5) prompt for this track including Genre, BPM, Vibe, and Role (Intro/Outro/etc). Max 500 chars.",
          },
          isVocal: {
            type: Type.BOOLEAN,
            description: "True only for the single vocal track.",
          },
        },
        required: ["title", "prompt", "isVocal"],
      },
      description: "List of tracks with prompts and vocal flag.",
    },
    youtubeDescription: { type: Type.STRING },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    imagePrompt: {
      type: Type.STRING,
      description: "Prompt for the album cover art (No text).",
    },
  },
  required: ["albumTitle", "albumPrompt", "tracks", "youtubeDescription", "tags", "imagePrompt"],
};

const sanitizeSongName = (songName: string) => songName.replace(/["`]/g, "'");

const cleanLyrics = (lyrics?: string) => {
  if (!lyrics) return "";
  return lyrics
    .replace(/\[.*?\]/g, "")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();
};

const toSingleLine = (value: string) => value.replace(/\s+/g, " ").trim();

const formatChannelContext = (channelName?: string, defaults?: ChannelDefaults) => {
  const lines: string[] = [];

  if (channelName) lines.push(`Channel Name: "${channelName}"`);
  if (defaults?.language) lines.push(`Default Language: ${defaults.language}`);
  if (defaults?.tone) lines.push(`Default Tone: ${defaults.tone}`);
  if (defaults?.hashtags?.length) {
    const tags = defaults.hashtags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
    lines.push(`Default Hashtags: ${tags.join(", ")}`);
  }

  if (!lines.length) return "";
  return `\n    Channel Profile:\n    - ${lines.join("\n    - ")}`;
};

const applySocialLinksToDescription = (description: string, links: SocialLinkItem[]) => {
  const normalizedLinks = normalizeSocialLinks(links);
  const block = formatSocialLinksBlock(normalizedLinks);
  if (!description) return description;

  if (description.includes(SOCIAL_LINKS_PLACEHOLDER)) {
    return description
      .replace(SOCIAL_LINKS_PLACEHOLDER, block || "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  if (!block) return description;
  return `${description.trim()}\n\n${block}`;
};

const buildSocialLinksContext = (links?: SocialLinkItem[]) => {
  const normalizedLinks = normalizeSocialLinks(links);
  if (!normalizedLinks.length) return "";
  const context = formatSocialLinksForPrompt(normalizedLinks);
  return `\n    ${context.split("\n").join("\n    ")}`;
};

const buildFallbackAlbumPrompt = (input: AlbumInput) => {
  const subject = input.subject?.trim() || "Concept album";
  const elements = input.musicalElements?.trim();
  const tier = Number.isFinite(input.tier) ? input.tier : 1;
  return toSingleLine(
    [subject, elements ? `Elements: ${elements}` : null, `Tier ${tier}`]
      .filter(Boolean)
      .join(" | ")
  );
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const normalizeAlbumResult = (value: AlbumResult, input: AlbumInput): AlbumResult => {
  const raw = value as Partial<AlbumResult> & {
    trackList?: string[];
    tracks?: Array<{ title?: string; prompt?: string; isVocal?: boolean }>;
  };
  const vocalTrackNumber = Number.isFinite(input.vocalTrackNumber)
    ? Number(input.vocalTrackNumber)
    : 0;

  const albumTitle =
    typeof raw.albumTitle === "string" && raw.albumTitle.trim()
      ? raw.albumTitle.trim()
      : `${input.subject?.trim() || "Concept"} Album`;

  const albumPrompt =
    typeof raw.albumPrompt === "string" && raw.albumPrompt.trim()
      ? toSingleLine(raw.albumPrompt)
      : buildFallbackAlbumPrompt(input);

  const baseTracks: Array<Record<string, unknown>> = Array.isArray(raw.tracks)
    ? (raw.tracks as unknown as Array<Record<string, unknown>>)
    : Array.isArray(raw.trackList)
      ? raw.trackList.map((title) => ({ title }))
      : [];

  const trackCount = Number.isFinite(input.trackCount) && input.trackCount > 0
    ? input.trackCount
    : baseTracks.length;

  const tracks = Array.from({ length: trackCount }, (_, index) => {
    const rawTrack = baseTracks[index] ?? {};
    const title =
      typeof rawTrack.title === "string" && rawTrack.title.trim()
        ? rawTrack.title.trim()
        : `Track ${index + 1}`;
    const promptRaw =
      typeof rawTrack.prompt === "string" && rawTrack.prompt.trim()
        ? rawTrack.prompt
        : `${albumPrompt} | Track ${index + 1}: ${title}`;
    return {
      title,
      prompt: toSingleLine(promptRaw),
      isVocal: rawTrack.isVocal === true,
    };
  });

  if (tracks.length) {
    const vocalIndex = vocalTrackNumber > 0
      ? clamp(vocalTrackNumber, 1, tracks.length) - 1
      : -1;

    if (vocalIndex >= 0) {
      tracks.forEach((track, index) => {
        track.isVocal = index === vocalIndex;
      });
    } else {
      tracks.forEach((track, index) => {
        track.isVocal = false;
      });
    }
  }

  return {
    albumTitle,
    albumPrompt,
    tracks,
    youtubeDescription:
      typeof raw.youtubeDescription === "string" ? raw.youtubeDescription : "",
    tags: normalizeTags((raw as { tags?: unknown }).tags),
    imagePrompt: typeof raw.imagePrompt === "string" ? raw.imagePrompt : "",
  };
};

const normalizeTags = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,\\n]/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
};

const assertPackagingResult = (value: PackagingResult): PackagingResult => {
  if (!value || typeof value !== "object") {
    throw new Error("Provider returned invalid packaging JSON (empty response).");
  }

  const result = value as PackagingResult;
  const missing: string[] = [];

  if (!Number.isFinite(result.tier)) missing.push("tier");
  if (typeof result.tierReasoning !== "string" || !result.tierReasoning.trim()) {
    missing.push("tierReasoning");
  }
  if (typeof result.youtubeTitle !== "string" || !result.youtubeTitle.trim()) {
    missing.push("youtubeTitle");
  }
  if (typeof result.youtubeDescription !== "string" || !result.youtubeDescription.trim()) {
    missing.push("youtubeDescription");
  }
  if (typeof result.imagePrompt !== "string" || !result.imagePrompt.trim()) {
    missing.push("imagePrompt");
  }

  const normalizedTags = normalizeTags((result as { tags?: unknown }).tags);
  if (!normalizedTags.length) missing.push("tags");
  result.tags = normalizedTags;

  if (missing.length) {
    throw new Error(`Provider returned invalid packaging JSON (missing: ${missing.join(", ")})`);
  }

  return result;
};

const buildPackagePrompt = (input: SongInput, processedLyrics: string) => {
  const channelName = input.channelName?.trim() || "Unknown Channel";
  const isMaVuong = channelName === "Ma Vương Nhị Diện";
  const defaultLanguage = input.channelDefaults?.language?.trim();
  const languageInstruction = defaultLanguage
    ? `USE ${defaultLanguage.toUpperCase()} TEMPLATE ONLY`
    : isMaVuong
      ? "USE VIETNAMESE TEMPLATE ONLY"
      : "USE ENGLISH TEMPLATE ONLY";
  const channelContext = formatChannelContext(channelName, input.channelDefaults);
  const socialLinksContext = buildSocialLinksContext(input.socialLinks);

  return `
    Act as a professional Music Packaging Assistant for AI-generated songs.
    
    Target Channel: "${channelName}"
    Language Mode: ${languageInstruction}
    ${channelContext}
    ${socialLinksContext}

    Input Data:
    - Song Name: "${input.songName}"
    - Style Prompt: "${input.stylePrompt}"
    - Lyrics: "${processedLyrics || "Instrumental"}" 
    - User Context: "${input.userDescription}"
    - Visual Override: "${input.visualPromptOverride}"

    Tasks:
    1. **Classify Genre & Visual Style (Detailed Tiers):**
       Analyze the style keywords and lyrics to assign one of the following Tiers:

       - **Tier 1 (Epic/Cinematic):** * Keywords: Epic, Orchestral, Battle, Heroic, Trailer.
         * Visual: Wide landscapes, massive scale, fantasy warriors, golden/fire lighting, realistic oil painting style.
       
       - **Tier 2 (Lofi/Chill):** * Keywords: Lofi, Jazzhop, Study, Ambient, Sleep.
         * Visual: Anime art style, cozy bedroom, raining window, coffee shop, pastel & cool colors (Blue/Purple).

       - **Tier 3 (Emotional/Vocal):** * Keywords: Ballad, Pop, R&B, Sad, Love.
         * Visual: Portrait focus (lonely person), cinematic bokeh, rain, soft lighting, moody atmosphere, emotional expression.

       - **Tier 4 (Dark/Aggressive):** * Keywords: Metal, Phonk, Trap, Drift, Horror, Hard Rock.
         * Visual: High contrast (Black/Red/White), gritty textures, skulls, drift cars, dark alleys, aggressive aesthetic.

       - **Tier 5 (Retro/Futuristic):** * Keywords: Synthwave, Disco, City Pop, Cyberpunk, 80s.
         * Visual: Neon grid, retro sun, futuristic city, glowing purple/pink/cyan, digital art style.

       - **Tier 6 (Acoustic/Bright):** * Keywords: Folk, Indie, Acoustic, Country, Happy, Morning.
         * Visual: Nature, sunlight, forests, fields, acoustic instruments, warm earth tones (Green/Yellow/Brown), peaceful.

       *Output the Tier Number (1-6) and the reasoning.*

    2. **Generate SEO Data:**
       - **Title:** Catchy, optimized for CTR. Format: "[Song Name] | [Main Vibe/Genre] | [Hook Word]".
       - **Description:** **CRITICAL RULE:** Handle 'Instrumental' tracks: If lyrics are empty or marked 'Instrumental', REMOVE the Lyrics section entirely and focus description on the *feeling* and *imagery* of the music. DO NOT invent lyrics.
         
         **LYRICS FORMATTING:**
         If lyrics are present, display them as RAW TEXT. Do NOT include structural tags like [Chorus], [Verse], or [Bridge]. Just the sung words.

         **SOCIAL MEDIA PLACEMENT:**
         End the description with the exact placeholder: {{SOCIAL_LINKS_PLACEHOLDER}}
         Do not generate specific links, just the placeholder (we will inject a Follow us block).

         **TEMPLATE FOR VIETNAMESE CONTENT (Use if Channel is Ma Vương Nhị Diện):**
         "[Emoji] [Catchy Hook or Question related to the mood]?
         
         "[Song Name]" - [One sentence summary of vibe]. [Emotional connection].
         
         🎧 Khuyến nghị: [Listening instruction, e.g., Đeo tai nghe để cảm nhận bass...]
         
         ---
         ✨ VỀ BÀI HÁT:
         [Description of musical elements: instruments, mood]. [Artist Message].
         👉 "[Short Quote/Slogan based on the song vibe]"
         
         ---
         ${processedLyrics && processedLyrics.length > 20 ? `📜 LYRICS (Lời bài hát):
         ${processedLyrics}
         
         ---` : ""}
         ✨ Credits:
         Composer & Performer: AI (Music/Udio)
         Visual Art: AI Generator
         
         🔔 Đừng quên Like, Share và Subscribe để ủng hộ kênh "${channelName}" nhé!
         👇 Bạn cảm thấy thế nào khi nghe bài hát này? Comment bên dưới nhé!
         
         [List of Hashtags]
         
         ---
         📍 THEO DÕI "${channelName.toUpperCase()}" TẠI:
         {{SOCIAL_LINKS_PLACEHOLDER}}"

         **TEMPLATE FOR ENGLISH CONTENT (Use if Channel is Infinite Epic Waves):**
         "✨ [Thematic Header]
         
         [Welcome/Intro Sentence]. "[Song Name]" is [Description of genre] designed to [Goal: motivate, relax, tell a story].
         
         🎼 THE VIBE & STORY:
         [Describe the journey of the track]. It evokes feelings of [Emotions].
         
         🌿 Perfect for:
         ✓ [Use Case 1: Gaming/Study/Sleep]
         ✓ [Use Case 2]
         
         ${processedLyrics && processedLyrics.length > 20 ? `🎤 LYRICS:
         ${processedLyrics}
         
         ` : ""}🎬 About This Track:
         "[Song Name]" captures [Core Emotion].
         
         ---
         [List of Hashtags]
         
         ---
         📍 FOLLOW "${channelName.toUpperCase()}":
         {{SOCIAL_LINKS_PLACEHOLDER}}"

       - **Tags:** 15-20 relevant tags.

    3. **Image Prompt:**
       - **Goal:** Generate a "Click-Worthy" YouTube Thumbnail masterpiece. The image must stop the scroll immediately.
       - **CRITICAL VISUAL RULES:**
         1. **Extreme Contrast:** Use high dynamic range. Brights should be blinding, darks should be deep. Avoid flat or washed-out lighting.
         2. **Composition:** Use "Rule of Thirds" or "Central Symmetry". Ensure the main subject is clearly separated from the background (Depth of Field).
         3. **Lighting:** Use "Volumetric Lighting" (God rays), "Rim Lighting" (backlight to separate subject), or "Cinematic Lighting".
         4. **Color Theory:** Use Complementary Colors (e.g., Orange & Teal, Red & Black, Purple & Yellow) to create visual vibration.
         5. **Negative Space:** Leave some clean, uncluttered space (sky, dark wall, blurred background) where text could theoretically be placed later.
         6. **NO TEXT:** Strictly NO letters, watermarks, or logos.

       - **TIER-SPECIFIC VISUAL DIRECTIVES:**
         
         - **IF TIER 1 (Epic/Cinematic):**
           * **Vibe:** "Blockbuster Movie Trailer".
           * **Visuals:** Tiny human silhouette vs. Gigantic monster/structure (Scale contrast).
           * **Lighting:** Dramatic sunset or stormy lightning. Strong "Chiaroscuro" (light/dark contrast).
           * **Colors:** Deep Blues and Burning Oranges (Teal & Orange look).

         - **IF TIER 2 (Lofi/Chill):**
           * **Vibe:** "Cozy Sanctuary".
           * **Visuals:** Highly detailed messy room or cafe, rain on glass. Focus on warmth and comfort.
           * **Lighting:** Soft, warm "Golden Hour" sunlight or glowing neon sign in a dark room.
           * **Colors:** Pastel Purples, Soft Pinks, and Warm Yellows. Lo-fi aesthetic.

         - **IF TIER 3 (Emotional/Vocal):**
           * **Vibe:** "Deeply Personal Story".
           * **Visuals:** Close-up or medium shot of a character with expressive body language (back turned, looking up).
           * **Lighting:** Moody, low-key lighting. "Bokeh" effect (blurred lights in background).
           * **Colors:** Melancholic Blues, Greys, or desaturated vintage tones.

         - **IF TIER 4 (Dark/Aggressive):**
           * **Vibe:** "Danger & Adrenaline".
           * **Visuals:** Gritty textures, skulls, fire, smoke, fast cars, red eyes.
           * **Lighting:** Harsh "Rembrandt Lighting", overexposed highlights, deep shadows.
           * **Colors:** Aggressive Red & Black, High Saturation.

         - **IF TIER 5 (Retro/Futuristic):**
           * **Vibe:** "Digital Dream".
           * **Visuals:** Outrun grid, retro sunset, chrome reflections, cyberpunk city.
           * **Lighting:** Glowing Neon, Bloom effect, Lens flares.
           * **Colors:** Electric Cyan, Magenta, Neon Purple (Vaporwave palette).

         - **IF TIER 6 (Acoustic/Bright):**
           * **Vibe:** "Pure Happiness/Freedom".
           * **Visuals:** Open fields, lens flare from the sun, hands playing guitar, morning dew.
           * **Lighting:** High-key lighting (very bright and airy), natural sunlight.
           * **Colors:** Vibrant Greens, Sky Blues, Earthy Browns.

       - **FINAL INSTRUCTION:** Write a single, potent prompt for Midjourney v6/DALL-E 3 that combines these visual rules with the song's specific theme. End the prompt with technical keywords: "8k resolution, unreal engine 5 render, hyper-realistic, trending on artstation".
    `;
};

const buildMusicPrompt = (input: MusicInput) => {
  const normalize = (value: string) => value.trim();
  const dedupe = (values: string[]) => Array.from(new Set(values.map(normalize).filter(Boolean)));

  const genres = Array.isArray(input.genres) ? input.genres : [];
  const vibes = Array.isArray(input.vibes) ? input.vibes : [];
  const instrumentsInput = Array.isArray(input.instruments) ? input.instruments : [];
  const vocalsInput = Array.isArray(input.vocals) ? input.vocals : [];

  const text = `${input.lyrics ?? ""}\n${input.customContext ?? ""}`.toLowerCase();
  const tags = (input.lyrics?.match(/\[(.*?)\]/g) ?? []).join(" ").toLowerCase();
  const combinedText = `${text}\n${tags}`;

  const detectedInstruments: string[] = [];
  const addInstrument = (name: string, patterns: string[]) => {
    if (patterns.some((pattern) => combinedText.includes(pattern))) {
      detectedInstruments.push(name);
    }
  };

  addInstrument("Flute", ["flute"]);
  addInstrument("Bamboo Flute", ["bamboo flute", "sáo"]);
  addInstrument("Saxophone", ["saxophone", "sax"]);
  addInstrument("Trumpet", ["trumpet"]);
  addInstrument("Piano", ["piano"]);
  addInstrument("Electric Piano", ["electric piano", "rhodes"]);
  addInstrument("Organ", ["organ"]);
  addInstrument("Acoustic Guitar", ["acoustic guitar"]);
  addInstrument("Electric Guitar", ["electric guitar"]);
  addInstrument("Violin", ["violin"]);
  addInstrument("Cello", ["cello"]);
  addInstrument("Bass Guitar", ["bass guitar"]);
  addInstrument("Upright Bass", ["upright bass", "double bass"]);
  addInstrument("Drums", ["drums"]);
  addInstrument("Heavy Drums", ["heavy drums"]);
  addInstrument("Electronic Drums", ["electronic drums"]);
  addInstrument("Percussion", ["percussion"]);
  addInstrument("808", ["808"]);
  addInstrument("Synth", ["synth"]);
  addInstrument("Zither (Dan Tranh)", ["dan tranh", "đàn tranh", "zither"]);

  const detectedVocals: string[] = [];
  const addVocal = (name: string, patterns: string[]) => {
    if (patterns.some((pattern) => combinedText.includes(pattern))) {
      detectedVocals.push(name);
    }
  };

  addVocal("Male Vocals", ["male vocal", "male vocals", "male voice"]);
  addVocal("Female Vocals", ["female vocal", "female vocals", "female voice"]);
  addVocal("Duet", ["duet"]);
  addVocal("Choir", ["choir", "chorus"]);
  addVocal("Auto-tune", ["auto-tune", "autotune"]);
  addVocal("Spoken Word", ["spoken word"]);
  addVocal("Rap", ["rap", "[rap]"]);
  addVocal("Instrumental (No Vocals)", ["instrumental", "no vocals", "no vocal"]);

  const isVietnameseContext =
    combinedText.includes("tet") ||
    combinedText.includes("tết") ||
    combinedText.includes("spring") ||
    combinedText.includes("homeland") ||
    combinedText.includes("quê") ||
    combinedText.includes("quê hương") ||
    combinedText.includes("mùa xuân") ||
    genres.includes("V-Pop");

  const instruments = dedupe([
    ...instrumentsInput,
    ...detectedInstruments,
    ...(isVietnameseContext ? ["Bamboo Flute", "Zither (Dan Tranh)"] : []),
  ]);

  const vocals = (() => {
    const vocalSet = new Set<string>([...vocalsInput, ...detectedVocals]);
    const wantsDuet =
      vocalSet.has("Duet") ||
      (vocalSet.has("Male Vocals") && vocalSet.has("Female Vocals"));

    if (wantsDuet) {
      vocalSet.delete("Duet");
      vocalSet.delete("Male Vocals");
      vocalSet.delete("Female Vocals");
      vocalSet.add("Male and Female Duet");
    }

    const vocalList = dedupe(Array.from(vocalSet));
    const hasVocalCue = vocalList.some((item) => item !== "Instrumental (No Vocals)");
    if (hasVocalCue) {
      return vocalList.filter((item) => item !== "Instrumental (No Vocals)");
    }
    return vocalList;
  })();

  const inferTempo = () => {
    const slowSignals = ["emotional", "melancholic", "nostalgic", "dreamy", "chill", "romantic", "sad", "ballad"];
    const fastSignals = ["high energy", "aggressive", "epic", "uplifting", "groovy", "dance", "party", "fast"];

    if (slowSignals.some((signal) => combinedText.includes(signal))) {
      return "Slow Tempo";
    }
    if (fastSignals.some((signal) => combinedText.includes(signal))) {
      return "Upbeat Tempo";
    }
    return "Mid Tempo";
  };

  const lyricsPreview = input.lyrics
    ? `${input.lyrics.slice(0, 500)}${input.lyrics.length > 500 ? "..." : ""}`
    : "No lyrics provided";

  const baseGenres = genres.join(", ");
  const baseVibes = vibes.join(", ");
  const baseInstruments = instruments.join(", ");
  const baseVocals = vocals.join(", ");
  const tempoHint = inferTempo();

  const channelContext = formatChannelContext(input.channelName, input.channelDefaults);

  return `
    Act as an expert Prompt Engineer for Music AI (v5).
    Your goal is to create ONE single, highly optimized "Style Prompt" string.

    **USER INPUTS:**
    - Genres: ${baseGenres}
    - Vibes: ${baseVibes}
    - Instruments (Selected): ${baseInstruments}
    - Vocal Style (Selected): ${baseVocals}
    - Context: ${input.customContext}
    - Lyrics Preview: "${lyricsPreview}"
    - Tempo Hint: ${tempoHint}
    ${channelContext}

    **CRITICAL INSTRUCTIONS:**
    1. **Lyrics Are Optional:** If lyrics are missing or empty, proceed using the other inputs. Do NOT ask for or require lyrics.
    2. **Analyze Lyrics:** If the lyrics contain meta-tags like [Flute Solo], [Rap], [Female Vocal], you MUST include these elements in the final prompt string, even if not selected in the inputs.
    3. **Infer Tempo:** If lyrics or vibes suggest "Sad/Emotional", imply a slower tempo. If "High Energy", imply upbeat.
    4. **Format:** Output ONLY a comma-separated string.
       - Structure: [Main Genre], [Sub-Genre], [Mood/Atmosphere], [Tempo], [Lead Instruments], [Vocal Type], [Technical keywords].
       - Example: "Vietnamese Pop, Folk Ballad, Emotional, Slow Tempo, Acoustic Guitar, Bamboo Flute, Male and Female Duet, High Fidelity"
    5. **Handling "Duet" or Complex Vocals:**
       - If lyrics show alternating Male/Female parts, strictly output: "Male and Female Duet".
    6. **Handling Vietnamese Context:**
       - If inputs/lyrics suggest Vietnamese music (Tet, Spring, Homeland), prioritize instruments like "Bamboo Flute", "Zither" (Dan Tranh) if they fit the vibe.

    **OUTPUT:**
    Provide JSON that matches the schema with:
    - prompt: the final prompt string only (no extra commentary)
    - explanation: a brief justification (1-2 sentences)
    `;
};

const buildAlbumPrompt = (input: AlbumInput) => {
  // 1. Kiểm tra Vocal
  const hasVocalTrack = typeof input.vocalTrackNumber === 'number' && input.vocalTrackNumber > 0;
  
  // 2. LOGIC MỚI: Phát hiện nhu cầu "Focus/Chill" (Đã mở rộng từ khóa)
  const keywords = (input.subject + " " + input.musicalElements).toLowerCase();
  const isFocusMode = keywords.includes("study") ||
      keywords.includes("focus") ||
      keywords.includes("sleep") ||
      keywords.includes("relax") ||
      keywords.includes("meditation") ||
      keywords.includes("reading") ||
      keywords.includes("coding") ||
      keywords.includes("work") ||
      keywords.includes("ambient");
  
  // 3. Xây dựng chiến lược
  // Nếu là Focus Mode, ép BPM dao động thấp.
  const flowStrategy = isFocusMode
      ? "Maintain a consistent, steady energy (" + (input.tier === 1 ? "Slow Burn Epic" : "Steady Flow") + ") suitable for deep concentration. Avoid sudden BPM spikes. Create variations in texture rather than speed."
      : "Plan a rising energy curve: Start atmospheric -> Build tension -> Climax -> Release/Outro.";
  
  const bpmGuide = isFocusMode
      ? "Keep BPM relatively stable (e.g., within 60-90 range) to prevent breaking the listener's concentration."
      : "Allow BPM to evolve naturally from slow intro to fast climax.";
  
  const channelContext = formatChannelContext(input.channelName, input.channelDefaults);
  const socialLinksContext = buildSocialLinksContext(input.socialLinks);

  return `
    Act as a Master Music Producer and DJ specialized in creating "Concept Albums" designed for Seamless Continuous Playback (Gapless Mix).
    
    Project Specs:
    - Subject/Theme: "${input.subject}"
    - Musical Elements/Vibe: "${input.musicalElements}"
    - Tier Context: ${input.tier} (${TIER_GUIDE.split('\n')[input.tier - 1] || 'General'})
    - Total Tracks: ${input.trackCount}
    - **Album Mode:** ${hasVocalTrack ? `Hybrid (Instrumental + Vocal Spotlight on Track #${input.vocalTrackNumber})` : "Purely Instrumental (No Vocals)"}
    - **Listening Context:** ${isFocusMode ? "DEEP FOCUS / BACKGROUND" : "ACTIVE LISTENING / JOURNEY"}
    ${channelContext}
    ${socialLinksContext}

    OBJECTIVE:
    Create a tracklist that functions as a single cohesive musical journey. The energy should flow naturally from one track to the next.

    Tasks:
    1. **Album Identity:** Create an evocative Album Title and a Core Album Prompt (Sonic Identity).
    2. **The Flow Strategy:** - **Instruction:** ${flowStrategy}
       - **BPM Guide:** ${bpmGuide}
       - **Climax Definition:** ${hasVocalTrack ? `The Climax is the Vocal Track (#${input.vocalTrackNumber}).` : "The Climax is a high-energy Musical Peak/Solo (e.g., Epic Drop, Guitar Solo, Orchestral Swell)."}
       - Ensure BPM and Instruments evolve logically to allow for smooth crossfading.
    
    3. **Generate ${input.trackCount} Tracks:**
       For each track, generate:
       - **Title:** Story-driven, sequential titles.
       - **Prompt:** A specific, optimized Music AI prompt for THAT specific track.
         * **Format:** "[Genre], [Specific Vibe], [Role: Intro/Build/Climax], [BPM], [Instruments], ${hasVocalTrack ? "[Vocal/Instrumental Tag]" : "Instrumental"}"
         * **Requirement:** The prompt must clearly distinguish this track's unique flavor while maintaining the album's DNA.
         * **Vocals Rule:** ${hasVocalTrack
      ? `- Track #${input.vocalTrackNumber}: Include tag "Male/Female Vocals" and "Emotional Peak". \n           - All other tracks: Include tag "Instrumental".`
      : `- ALL tracks: Include tag "Instrumental". Do not request vocals.`
  }
    
    4. **YouTube Description:** Write a description emphasizing the "Journey" aspect of the album.
    5. **SEO Tags:** 15 tags optimized for "Full Album", "Mix", and the specific Genre.
    6. **Cover Art:** A detailed, text-free image prompt capturing the album's core atmosphere.
    7. **Social Links:** End the YouTube description with the exact placeholder: {{SOCIAL_LINKS_PLACEHOLDER}} (no links, just the placeholder).

    Constraint Checklist:
    1. Are there exactly ${input.trackCount} tracks? Yes.
    2. Do the prompts suggest a progression consistent with the ${isFocusMode ? "Steady" : "Rising"} flow? Yes.
    `;
};

export const generatePackage = async (
  input: SongInput,
  providerId: AIProviderId,
  apiKey: string
): Promise<PackagingResult> => {
  const provider = getProvider(providerId);
  const processedLyrics = cleanLyrics(input.lyrics);
  const prompt = buildPackagePrompt(input, processedLyrics);
  const data = await provider.text.generateJSON<PackagingResult>({
    prompt,
    apiKey,
    schema: PACKAGE_SCHEMA,
  });
  const result = assertPackagingResult(data);

  if (result.youtubeDescription) {
    result.youtubeDescription = applySocialLinksToDescription(
      result.youtubeDescription,
      input.socialLinks ?? []
    );
  }

  return result;
};

export const generateMusicPrompt = async (
  input: MusicInput,
  providerId: AIProviderId,
  apiKey: string
): Promise<MusicResult> => {
  const provider = getProvider(providerId);
  const prompt = buildMusicPrompt(input);
  return provider.text.generateJSON<MusicResult>({
    prompt,
    apiKey,
    schema: MUSIC_SCHEMA,
  });
};

export const generateAlbum = async (
  input: AlbumInput,
  providerId: AIProviderId,
  apiKey: string
): Promise<AlbumResult> => {
  const provider = getProvider(providerId);
  const prompt = buildAlbumPrompt(input);
  const data = await provider.text.generateJSON<AlbumResult>({
    prompt,
    apiKey,
    schema: ALBUM_SCHEMA,
  });
  const result = normalizeAlbumResult(data, input);
  if (result.youtubeDescription) {
    result.youtubeDescription = applySocialLinksToDescription(
      result.youtubeDescription,
      input.socialLinks ?? []
    );
  }
  return result;
};

export const generateVisualAssets = async (
  input: { prompt: string; songName: string },
  providerId: AIProviderId,
  apiKey: string
): Promise<VisualAssets> => {
  const provider = getProvider(providerId);
  const cleanSongName = sanitizeSongName(input.songName);

  if (providerId === "GOOGLE") {
    const base = await provider.image.generateImage({
      prompt: `${input.prompt} --no text`,
      aspectRatio: "16:9",
      apiKey,
    });

    if (!base.base64) {
      throw new Error("Gemini response did not include base64 image data");
    }

    const square = await provider.image.generateImage({
      prompt: `Crop this image to a square (1:1 aspect ratio) and overlay the song title "${cleanSongName}" using a font style that matches the image's mood. Ensure the text is legible.`,
      aspectRatio: "1:1",
      apiKey,
      inputImage: { data: base.base64, mimeType: "image/png" },
    });

    const landscape = await provider.image.generateImage({
      prompt: `Edit this image to add the text "${cleanSongName}". Analyze the image for negative space, dark areas, or open sky. Place the text intelligently in one of these high-contrast areas (like corners or sides) to ensure maximum readability and artistic balance. Do NOT default to the center unless it's the only clear spot. Use a cinematic font style.`,
      aspectRatio: "16:9",
      apiKey,
      inputImage: { data: base.base64, mimeType: "image/png" },
    });

    return {
      baseImage: base.imageUrl,
      squareWithText: square.imageUrl,
      landscapeWithText: landscape.imageUrl,
    };
  }

  const base = await provider.image.generateImage({
    prompt: `${input.prompt} --no text`,
    aspectRatio: "16:9",
    apiKey,
  });

  const square = await provider.image.generateImage({
    prompt: `${input.prompt}. Create a square (1:1) cover and overlay the title "${cleanSongName}" with a readable cinematic font.`,
    aspectRatio: "1:1",
    apiKey,
  });

  const landscape = await provider.image.generateImage({
    prompt: `${input.prompt}. Create a 16:9 cover and overlay the title "${cleanSongName}" using high-contrast placement.`,
    aspectRatio: "16:9",
    apiKey,
  });

  return {
    baseImage: base.imageUrl,
    squareWithText: square.imageUrl,
    landscapeWithText: landscape.imageUrl,
  };
};
