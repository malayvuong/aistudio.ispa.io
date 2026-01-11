import { PROVIDER_CAPABILITIES, normalizeProviderId, isProviderId } from "@/services/ai/capabilities";

export type ProviderCapabilities = {
  text: boolean;
  image: boolean;
};

export type VaultProviderId = keyof typeof PROVIDER_CAPABILITIES;

export { PROVIDER_CAPABILITIES, normalizeProviderId };

export const isVaultProviderId = (value?: string | null): value is VaultProviderId => {
  return isProviderId(value);
};
