import type { ProviderAdapter, GenerationInput, SubmitResult, PollResult } from "./types";

// Vendor docs: https://platform.tripo3d.ai/docs
export const tripoProvider: ProviderAdapter = {
  id: "tripo",
  displayName: "Tripo",
  isEnabled(): boolean {
    return !!process.env.TRIPO_API_KEY;
  },
  async submit(_input: GenerationInput): Promise<SubmitResult> {
    throw new Error("not implemented — fill in https://platform.tripo3d.ai/docs");
  },
  async poll(_providerJobId: string): Promise<PollResult> {
    throw new Error("not implemented — fill in https://platform.tripo3d.ai/docs");
  },
};
