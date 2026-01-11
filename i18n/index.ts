import { en } from "@/i18n/en";
import { vi } from "@/i18n/vi";

export type Lang = "en" | "vi";

export const dictionaries: Record<Lang, Record<string, string>> = {
  en,
  vi,
};
