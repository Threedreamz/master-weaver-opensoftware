import type { ProviderAdapter, GenerationInput, SubmitResult, PollResult } from "./types";

// Vendor docs: https://hyperhuman.deemos.com/api-doc
// Also available pay-per-call via fal.ai: https://fal.ai/models/fal-ai/hyper3d/rodin
export const rodinProvider: ProviderAdapter = {
  id: "rodin",
  displayName: "Rodin (Hyperhuman)",
  isEnabled(): boolean {
    return !!process.env.RODIN_API_KEY;
  },
  async submit(_input: GenerationInput): Promise<SubmitResult> {
    throw new Error("not implemented — fill in https://hyperhuman.deemos.com/api-doc");
  },
  async poll(_providerJobId: string): Promise<PollResult> {
    throw new Error("not implemented — fill in https://hyperhuman.deemos.com/api-doc");
  },
};
