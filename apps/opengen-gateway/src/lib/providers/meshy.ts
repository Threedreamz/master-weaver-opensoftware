import type { ProviderAdapter, GenerationInput, SubmitResult, PollResult } from "./types";

// Vendor docs: https://docs.meshy.ai/api/text-to-3d
export const meshyProvider: ProviderAdapter = {
  id: "meshy",
  displayName: "Meshy",
  isEnabled(): boolean {
    return !!process.env.MESHY_API_KEY;
  },
  async submit(_input: GenerationInput): Promise<SubmitResult> {
    throw new Error("not implemented — fill in https://docs.meshy.ai/api/text-to-3d");
  },
  async poll(_providerJobId: string): Promise<PollResult> {
    throw new Error("not implemented — fill in https://docs.meshy.ai/api/text-to-3d");
  },
};
