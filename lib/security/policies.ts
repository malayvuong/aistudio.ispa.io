import "server-only";

export type RateLimitConfig = {
  limit: number;
  windowSeconds: number;
};

export type FailureCooldown = {
  threshold: number;
  windowSeconds: number;
  blockSeconds: number;
};

export type ApiPolicy = {
  name: string;
  methods: string[];
  authRequired?: boolean;
  jsonMethods?: string[];
  bodyMaxBytes?: number;
  allowedBodyFields?: string[];
  rateLimit?: {
    perUser?: RateLimitConfig;
    perIp?: RateLimitConfig;
  };
  enforceBlock?: boolean;
  failCooldown?: FailureCooldown;
};

const numberFromEnv = (key: string, fallback: number) => {
  const value = Number(process.env[key]);
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return value;
};

const HOUR_SECONDS = 60 * 60;
const TEN_MIN_SECONDS = 10 * 60;
const FIFTEEN_MIN_SECONDS = 15 * 60;
const THIRTY_MIN_SECONDS = 30 * 60;

const lightPerHour = numberFromEnv("RATE_LIMIT_LIGHT_PER_HOUR", 300);
const lightIpPerHour = numberFromEnv("RATE_LIMIT_LIGHT_IP_PER_HOUR", 600);

const generatePerHour = numberFromEnv("RATE_LIMIT_GENERATE_PER_HOUR", 60);
const generateIpPerHour = numberFromEnv("RATE_LIMIT_GENERATE_IP_PER_HOUR", 120);

const unlockPer10Min = numberFromEnv("RATE_LIMIT_UNLOCK_PER_10MIN", 5);
const unlockIpPer10Min = numberFromEnv("RATE_LIMIT_UNLOCK_IP_PER_10MIN", 10);

const vaultSavePerHour = numberFromEnv("RATE_LIMIT_VAULT_SAVE_PER_HOUR", 20);
const vaultSaveIpPerHour = numberFromEnv("RATE_LIMIT_VAULT_SAVE_IP_PER_HOUR", 30);

const lightRateLimit = {
  perUser: { limit: lightPerHour, windowSeconds: HOUR_SECONDS },
  perIp: { limit: lightIpPerHour, windowSeconds: HOUR_SECONDS },
};

const generateRateLimit = {
  perUser: { limit: generatePerHour, windowSeconds: HOUR_SECONDS },
  perIp: { limit: generateIpPerHour, windowSeconds: HOUR_SECONDS },
};

const vaultUnlockRateLimit = {
  perUser: { limit: unlockPer10Min, windowSeconds: TEN_MIN_SECONDS },
  perIp: { limit: unlockIpPer10Min, windowSeconds: TEN_MIN_SECONDS },
};

const vaultSaveRateLimit = {
  perUser: { limit: vaultSavePerHour, windowSeconds: HOUR_SECONDS },
  perIp: { limit: vaultSaveIpPerHour, windowSeconds: HOUR_SECONDS },
};

export const ApiPolicies = {
  vaultUnlock: {
    name: "vault:unlock",
    methods: ["POST"],
    authRequired: true,
    jsonMethods: ["POST"],
    bodyMaxBytes: 5000,
    allowedBodyFields: ["vaultPassphrase"],
    rateLimit: vaultUnlockRateLimit,
    failCooldown: {
      threshold: 5,
      windowSeconds: FIFTEEN_MIN_SECONDS,
      blockSeconds: THIRTY_MIN_SECONDS,
    },
  },
  vaultSave: {
    name: "vault:save",
    methods: ["POST"],
    authRequired: true,
    jsonMethods: ["POST"],
    bodyMaxBytes: 10000,
    allowedBodyFields: ["providerId", "providerKey", "vaultPassphrase"],
    rateLimit: vaultSaveRateLimit,
  },
  vaultLock: {
    name: "vault:lock",
    methods: ["POST"],
    authRequired: true,
    jsonMethods: ["POST"],
    rateLimit: lightRateLimit,
  },
  vaultStatus: {
    name: "vault:status",
    methods: ["GET"],
    authRequired: true,
    rateLimit: lightRateLimit,
  },
  generateMusic: {
    name: "generate:music",
    methods: ["POST"],
    authRequired: true,
    jsonMethods: ["POST"],
    bodyMaxBytes: 50000,
    allowedBodyFields: [
      "lyrics",
      "genres",
      "vibes",
      "instruments",
      "vocals",
      "customContext",
      "channelId",
      "providerId",
    ],
    rateLimit: generateRateLimit,
  },
  generateAlbum: {
    name: "generate:album",
    methods: ["POST"],
    authRequired: true,
    jsonMethods: ["POST"],
    bodyMaxBytes: 50000,
    allowedBodyFields: [
      "subject",
      "musicalElements",
      "trackCount",
      "tier",
      "vocalTrackNumber",
      "channelId",
      "providerId",
    ],
    rateLimit: generateRateLimit,
  },
  generateVisuals: {
    name: "generate:visuals",
    methods: ["POST"],
    authRequired: true,
    jsonMethods: ["POST"],
    bodyMaxBytes: 50000,
    allowedBodyFields: ["prompt", "songName", "channelId", "providerId"],
    rateLimit: generateRateLimit,
  },
  generatePackage: {
    name: "generate:package",
    methods: ["POST"],
    authRequired: true,
    jsonMethods: ["POST"],
    bodyMaxBytes: 50000,
    allowedBodyFields: [
      "songName",
      "stylePrompt",
      "lyrics",
      "userDescription",
      "visualPromptOverride",
      "channelId",
      "providerId",
      "provider",
    ],
    rateLimit: generateRateLimit,
  },
  channels: {
    name: "channels",
    methods: ["GET", "POST"],
    authRequired: true,
    jsonMethods: ["POST"],
    allowedBodyFields: ["name", "defaultLanguage", "defaultTone", "defaultHashtags"],
    rateLimit: lightRateLimit,
  },
  channel: {
    name: "channels:item",
    methods: ["GET", "PUT", "DELETE"],
    authRequired: true,
    jsonMethods: ["PUT"],
    allowedBodyFields: ["name", "defaultLanguage", "defaultTone", "defaultHashtags"],
    rateLimit: lightRateLimit,
  },
  socialLinks: {
    name: "social-links",
    methods: ["GET", "POST"],
    authRequired: true,
    jsonMethods: ["POST"],
    allowedBodyFields: ["type", "url", "channelIds"],
    rateLimit: lightRateLimit,
  },
  socialLink: {
    name: "social-links:item",
    methods: ["PUT", "DELETE"],
    authRequired: true,
    jsonMethods: ["PUT"],
    allowedBodyFields: ["type", "url", "channelIds"],
    rateLimit: lightRateLimit,
  },
  history: {
    name: "history",
    methods: ["GET"],
    authRequired: true,
    rateLimit: lightRateLimit,
  },
  historyItem: {
    name: "history:item",
    methods: ["GET"],
    authRequired: true,
    rateLimit: lightRateLimit,
  },
  checkSession: {
    name: "check-session",
    methods: ["GET"],
    rateLimit: lightRateLimit,
  },
  i18nLang: {
    name: "i18n:lang",
    methods: ["POST"],
    jsonMethods: ["POST"],
    allowedBodyFields: ["lang"],
    rateLimit: lightRateLimit,
  },
  turnstileVerify: {
    name: "turnstile:verify",
    methods: ["POST"],
    jsonMethods: ["POST"],
    allowedBodyFields: ["token"],
    rateLimit: lightRateLimit,
  },
} satisfies Record<string, ApiPolicy>;
