import type { ProviderAdapter } from "./types";
import { meshyProvider } from "./meshy";
import { tripoProvider } from "./tripo";
import { rodinProvider } from "./rodin";
import { triposrProvider } from "./triposr";
import { trellisProvider } from "./trellis";
import { hunyuan3dProvider } from "./hunyuan3d";

export const PROVIDERS: Record<string, ProviderAdapter> = {
  meshy: meshyProvider,
  tripo: tripoProvider,
  rodin: rodinProvider,
  triposr: triposrProvider,
  trellis: trellisProvider,
  hunyuan3d: hunyuan3dProvider,
};

export const PROVIDER_IDS = Object.keys(PROVIDERS) as Array<keyof typeof PROVIDERS>;

export function getProvider(id: string): ProviderAdapter | null {
  return PROVIDERS[id] ?? null;
}

export function listEnabledProviders(): ProviderAdapter[] {
  return Object.values(PROVIDERS).filter((p) => p.isEnabled());
}
