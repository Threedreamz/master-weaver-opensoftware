import type { ProviderAdapter, GenerationInput, SubmitResult, PollResult } from "./types";

// Vendor docs (open-source, self-hosted):
// https://github.com/microsoft/TRELLIS
// Self-hosted HTTP wrapper at TRELLIS_ENDPOINT.
export const trellisProvider: ProviderAdapter = {
  id: "trellis",
  displayName: "TRELLIS (open-source)",
  isEnabled(): boolean {
    return !!process.env.TRELLIS_ENDPOINT;
  },
  async submit(_input: GenerationInput): Promise<SubmitResult> {
    throw new Error(
      "not implemented — fill in https://github.com/microsoft/TRELLIS (self-hosted endpoint)",
    );
  },
  async poll(_providerJobId: string): Promise<PollResult> {
    throw new Error(
      "not implemented — fill in https://github.com/microsoft/TRELLIS (self-hosted endpoint)",
    );
  },
};
