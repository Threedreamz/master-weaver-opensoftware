import type { ProviderAdapter, GenerationInput, SubmitResult, PollResult } from "./types";
import { submitReplicate3D, pollReplicate3D, type Replicate3DConfig } from "./replicate-3d";

/**
 * TRELLIS via Replicate (firtoz/trellis — only maintained Replicate fork of
 * microsoft/TRELLIS).
 *
 * Image-to-3d. Input field is `images` (array of URLs, single-item OK).
 * Output is `{ model_file, color_video, gaussian_ply, ... }` — GLB at
 * `output.model_file`.
 *
 * Model: https://replicate.com/firtoz/trellis
 */

const TRELLIS_VERSION =
  process.env.TRELLIS_REPLICATE_VERSION ||
  "e8f6c45206993f297372f5436b90350817bd9b4a0d52d2a76df50c1c8afa2b3c";

const config: Replicate3DConfig = {
  version: TRELLIS_VERSION,
  imageField: "images",
  imageAsArray: true,
  extractGlbUrl: (output) => {
    if (output && typeof output === "object") {
      const v = (output as Record<string, unknown>)["model_file"];
      if (typeof v === "string") return v;
    }
    return null;
  },
};

export const trellisProvider: ProviderAdapter = {
  id: "trellis",
  displayName: "TRELLIS (open-source)",
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
