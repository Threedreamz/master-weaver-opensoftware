export type GenerationInputType = "text" | "image" | "multiview";

export interface GenerationInput {
  inputType: GenerationInputType;
  inputPayload: Record<string, unknown>;
  countryCode?: string;
}

export interface SubmitResult {
  providerJobId: string;
}

export type PollStatus = "running" | "succeeded" | "failed";

export interface PollResult {
  status: PollStatus;
  glbUrl?: string;
  triangleCount?: number;
  errorMessage?: string;
}

export interface ProviderAdapter {
  id: string;
  displayName: string;
  isEnabled(): boolean;
  submit(input: GenerationInput): Promise<SubmitResult>;
  poll(providerJobId: string): Promise<PollResult>;
}

export class CountryGatedError extends Error {
  constructor(public providerId: string, public countryCode: string) {
    super(`Provider ${providerId} not available in ${countryCode}`);
    this.name = "CountryGatedError";
  }
}
