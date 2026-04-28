export type ImageInputType = "text" | "image";

export interface ImageInput {
  inputType: ImageInputType;
  inputPayload: Record<string, unknown>;
  countryCode?: string;
}

export interface SubmitResult {
  providerJobId: string;
  /**
   * Some providers (Fal sync mode) return the image URL synchronously on submit.
   * In that case poll() returns "succeeded" on first call without an extra HTTP roundtrip.
   */
  syncImageUrl?: string;
  syncWidth?: number;
  syncHeight?: number;
}

export type PollStatus = "running" | "succeeded" | "failed";

export interface PollResult {
  status: PollStatus;
  imageUrl?: string;
  width?: number;
  height?: number;
  errorMessage?: string;
}

export interface ProviderAdapter {
  id: string;
  displayName: string;
  isEnabled(): boolean;
  submit(input: ImageInput): Promise<SubmitResult>;
  poll(providerJobId: string): Promise<PollResult>;
}

export class CountryGatedError extends Error {
  constructor(
    public providerId: string,
    public countryCode: string,
  ) {
    super(`Provider ${providerId} not available in ${countryCode}`);
    this.name = "CountryGatedError";
  }
}
