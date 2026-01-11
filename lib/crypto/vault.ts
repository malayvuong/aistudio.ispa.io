import "server-only";

import { createCipheriv, createDecipheriv, randomBytes, scrypt as scryptCallback } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: {
    N?: number;
    r?: number;
    p?: number;
  }
) => Promise<Buffer>;

type KdfParams = {
  N?: number;
  r?: number;
  p?: number;
  keyLen?: number;
  saltLen?: number;
  ivLen?: number;
};

export type VaultSecretRecord = {
  encryptedKey: string;
  salt: string;
  iv: string;
  tag: string;
  kdf: string;
  kdfParams: KdfParams | string | null;
};

const DEFAULT_KDF_PARAMS: Required<KdfParams> = {
  N: 16384,
  r: 8,
  p: 1,
  keyLen: 32,
  saltLen: 16,
  ivLen: 12,
};

const toNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const parseKdfParams = (input: unknown): KdfParams => {
  if (!input) return {};
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input) as KdfParams;
      return parsed ?? {};
    } catch {
      return {};
    }
  }
  if (typeof input === "object" && !Array.isArray(input)) {
    return input as KdfParams;
  }
  return {};
};

const resolveKdfParams = (input: unknown): Required<KdfParams> => {
  const params = parseKdfParams(input);
  return {
    N: toNumber(params.N, DEFAULT_KDF_PARAMS.N),
    r: toNumber(params.r, DEFAULT_KDF_PARAMS.r),
    p: toNumber(params.p, DEFAULT_KDF_PARAMS.p),
    keyLen: toNumber(params.keyLen, DEFAULT_KDF_PARAMS.keyLen),
    saltLen: toNumber(params.saltLen, DEFAULT_KDF_PARAMS.saltLen),
    ivLen: toNumber(params.ivLen, DEFAULT_KDF_PARAMS.ivLen),
  };
};

const deriveKeyWithParams = async (
  passphrase: string,
  salt: Buffer,
  params: Required<KdfParams>
) => {
  return (await scryptAsync(passphrase, salt, params.keyLen, {
    N: params.N,
    r: params.r,
    p: params.p,
  })) as Buffer;
};

export const deriveKey = async (passphrase: string, saltB64: string): Promise<Buffer> => {
  const salt = Buffer.from(saltB64, "base64");
  return deriveKeyWithParams(passphrase, salt, DEFAULT_KDF_PARAMS);
};

export const encryptSecret = async (plaintextKey: string, passphrase: string) => {
  const kdfParams = { ...DEFAULT_KDF_PARAMS };
  const salt = randomBytes(kdfParams.saltLen);
  const iv = randomBytes(kdfParams.ivLen);
  const key = await deriveKeyWithParams(passphrase, salt, kdfParams);

  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintextKey, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    encryptedKey: encrypted.toString("base64"),
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    kdf: "scrypt",
    kdfParams,
  };
};

export const decryptSecret = async (record: VaultSecretRecord, passphrase: string) => {
  if (!record || record.kdf !== "scrypt") {
    throw new Error("Unsupported key derivation function");
  }

  const kdfParams = resolveKdfParams(record.kdfParams);
  const salt = Buffer.from(record.salt, "base64");
  const iv = Buffer.from(record.iv, "base64");
  const tag = Buffer.from(record.tag, "base64");
  const key = await deriveKeyWithParams(passphrase, salt, kdfParams);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(record.encryptedKey, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
};
