import type { ProviderAdapter, GenerationInput, SubmitResult, PollResult } from "./types";
import { CountryGatedError } from "./types";

// Vendor docs (Tencent open-source, license restrictions apply):
// https://github.com/Tencent-Hunyuan/Hunyuan3D-2
//
// Hunyuan3D requires explicit opt-in (OPENGEN_HUNYUAN_ENABLED=true) AND
// honors a country block list (OPENGEN_HUNYUAN_BLOCKED_COUNTRIES, comma-
// separated ISO-3166-1 alpha-2). This is a legal/compliance gate enforced
// at submit() — the route returns HTTP 451 (legal reasons) when blocked.

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
      process.env.OPENGEN_HUNYUAN_ENABLED === "true" &&
      !!process.env.HUNYUAN3D_ENDPOINT
    );
  },
  async submit(input: GenerationInput): Promise<SubmitResult> {
    const cc = (input.countryCode ?? "").toUpperCase();
    if (cc && blockedCountries().has(cc)) {
      throw new CountryGatedError("hunyuan3d", cc);
    }
    throw new Error(
      "not implemented — fill in https://github.com/Tencent-Hunyuan/Hunyuan3D-2 (self-hosted endpoint)",
    );
  },
  async poll(_providerJobId: string): Promise<PollResult> {
    throw new Error(
      "not implemented — fill in https://github.com/Tencent-Hunyuan/Hunyuan3D-2 (self-hosted endpoint)",
    );
  },
};
