export type RerunPayload = {
  feature: string;
  input: Record<string, unknown>;
};

const STORAGE_KEY = "rerun_payload";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const storeRerunPayload = (payload: RerunPayload) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const consumeRerunPayload = (expectedFeature?: string): RerunPayload | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { feature?: string; input?: unknown };
    if (expectedFeature && parsed.feature !== expectedFeature) {
      return null;
    }
    if (!isRecord(parsed.input)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    localStorage.removeItem(STORAGE_KEY);
    return { feature: parsed.feature ?? expectedFeature ?? "", input: parsed.input };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};
