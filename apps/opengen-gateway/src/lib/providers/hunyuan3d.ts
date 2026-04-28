import type { ProviderAdapter, GenerationInput, SubmitResult, PollResult } from "./types";
import { CountryGatedError } from "./types";
import { submitReplicate3D, pollReplicate3D, type Replicate3DConfig } from "./replicate-3d";

/**
 * Hunyuan3D-2 via Replicate (tencent/hunyuan3d-2).
 *
 * Image-to-3d. Tencent open-source with license restrictions — gated by
 * OPENGEN_HUNYUAN_ENABLED=true AND honors a country block list
 * (OPENGEN_HUNYUAN_BLOCKED_COUNTRIES, comma-separated ISO-3166-1 alpha-2).
 *
 * Model: https://replicate.com/tencent/hunyuan3d-2
 */

const HUNYUAN3D_VERSION =
  process.env.HUNYUAN3D_REPLICATE_VERSION ||
  "b1b9449a1277e10402781c5d41eb30c0a0683504fb23fab591ca9dfc2aabe1cb";

const config: Replicate3DConfig = {
  version: HUNYUAN3D_VERSION,
  imageField: "image",
  extraInput: { remove_background: true },
  extractGlbUrl: (output) => {
    if (output && typeof output === "object") {
      const v = (output as Record<string, unknown>)["mesh"];
      if (typeof v === "string") return v;
    }
    return null;
  },
};

function blockedCountries(): Set<string> {
  return new Set(
    (process.env.OPENGEN_HUNYUAN_BLOCKED_COUNTRIES ?? "")
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean),
  );
}

export const hunyuan3dProvider: ProviderAdapter = {
  id: "hunyuan3d",
  displayName: "Hunyuan3D-2 (open-source, gated)",
  isEnabled(): boolean {
    return (
      process.env.OPENGEN_HUNYUAN_ENABLED === "true" && !!process.env.REPLICATE_API_TOKEN
    );
  },
  async submit(input: GenerationInput): Promise<SubmitResult> {
    const cc = (input.countryCode ?? "").toUpperCase();
    if (cc && blockedCountries().has(cc)) {
      throw new CountryGatedError("hunyuan3d", cc);
    }
    return submitReplicate3D(input, config);
  },
  async poll(providerJobId: string): Promise<PollResult> {
    return pollReplicate3D(providerJobId, config);
  },
};
