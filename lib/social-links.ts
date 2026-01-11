import type { SocialLinkItem } from "@/types";

export const normalizeSocialLinks = (links?: SocialLinkItem[]): SocialLinkItem[] => {
  if (!Array.isArray(links)) return [];
  const seen = new Set<string>();

  return links
    .map((link) => ({
      type: typeof link.type === "string" ? link.type.trim() : "",
      url: typeof link.url === "string" ? link.url.trim() : "",
    }))
    .filter((link) => link.type && link.url)
    .filter((link) => {
      const key = `${link.type.toLowerCase()}|${link.url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export const formatSocialLinksBlock = (links: SocialLinkItem[]): string => {
  if (!links.length) return "";
  const lines = links.map((link) => `- ${link.type}: ${link.url}`);
  return ["Follow us:", ...lines].join("\n");
};

export const formatSocialLinksForPrompt = (links: SocialLinkItem[]): string => {
  if (!links.length) return "";
  const lines = links.map((link) => `- ${link.type}: ${link.url}`);
  return ["Social Links (use for the Follow us block):", ...lines].join("\n");
};
