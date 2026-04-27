import type { ProviderAdapter, GenerationInput, SubmitResult, PollResult } from "./types";

// Vendor docs (open-source, self-hosted):
// https://github.com/VAST-AI-Research/TripoSR
// We expect a self-hosted HTTP wrapper at TRIPOSR_ENDPOINT (e.g. a Modal,
// Replicate, or in-house worker). The gateway POSTs the input image and
// receives a job id, then polls /jobs/<id>.
export const triposrProvider: ProviderAdapter = {
  id: "triposr",
  displayName: "TripoSR (open-source)",
  isEnabled(): boolean {
    return !!process.env.TRIPOSR_ENDPOINT;
  },
  async submit(_input: GenerationInput): Promise<SubmitResult> {
    throw new Error(
      "not implemented — fill in https://github.com/VAST-AI-Research/TripoSR (self-hosted endpoint)",
    );
  },
  async poll(_providerJobId: string): Promise<PollResult> {
    throw new Error(
      "not implemented — fill in https://github.com/VAST-AI-Research/TripoSR (self-hosted endpoint)",
    );
  },
};
