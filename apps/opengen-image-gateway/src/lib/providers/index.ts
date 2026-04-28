import type { ProviderAdapter } from "./types";
import { falProvider } from "./fal";
import { replicateProvider } from "./replicate";

export const PROVIDERS: Record<string, ProviderAdapter> = {
  fal: falProvider,
  replicate: replicateProvider,
};

export const PROVIDER_IDS = Object.keys(PROVIDERS) as Array<keyof typeof PROVIDERS>;

export function getProvider(id: string): ProviderAdapter | null {
  return PROVIDERS[id] ?? null;
}

export function listEnabledProviders(): ProviderAdapter[] {
  return Object.values(PROVIDERS).filter((p) => p.isEnabled());
}
