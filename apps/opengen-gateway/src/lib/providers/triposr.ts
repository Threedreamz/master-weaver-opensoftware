import type { ProviderAdapter, GenerationInput, SubmitResult, PollResult } from "./types";
import { submitReplicate3D, pollReplicate3D, type Replicate3DConfig } from "./replicate-3d";

/**
 * TripoSR via Replicate (camenduru/tripo-sr).
 *
 * Image-to-3d only. Field is `image_path` (NOT `image`). Output is a bare
 * string URL pointing at the GLB.
 *
 * Model: https://replicate.com/camenduru/tripo-sr
 */

const TRIPOSR_VERSION =
  process.env.TRIPOSR_REPLICATE_VERSION ||
  "e0d3fe8abce3ba86497ea3530d9eae59af7b2231b6c82bedfc32b0732d35ec3a";

const config: Replicate3DConfig = {
  version: TRIPOSR_VERSION,
  imageField: "image_path",
  extraInput: { do_remove_background: true, foreground_ratio: 0.85 },
  extractGlbUrl: (output) => (typeof output === "string" ? output : null),
};

export const triposrProvider: ProviderAdapter = {
  id: "triposr",
  displayName: "TripoSR (open-source)",
  isEnabled(): boolean {
    return !!process.env.REPLICATE_API_TOKEN;
  },
  async submit(input: GenerationInput): Promise<SubmitResult> {
    return submitReplicate3D(input, config);
  },
  async poll(providerJobId: string): Promise<PollResult> {
    return pollReplicate3D(providerJobId, config);
  },
};
