import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  TwilioClientConfig,
  TwilioMessage,
  TwilioSendSmsParams,
  TwilioMessageListParams,
  TwilioMessageListResponse,
  TwilioLookupResult,
  TwilioLookupParams,
} from "./types.js";

/**
 * Twilio API client for SMS messaging and phone number lookups.
 *
 * Authentication: Basic auth (AccountSID:AuthToken).
 * Docs: https://www.twilio.com/docs/sms/api
 *
 * Note: Twilio uses form-encoded bodies for message creation,
 * so we override the request method for those endpoints.
 */
export class TwilioClient extends BaseIntegrationClient {
  private readonly accountSid: string;

  constructor(config: TwilioClientConfig) {
    super({
      baseUrl: "https://api.twilio.com",
      authType: "basic_auth",
      credentials: {
        username: config.accountSid,
        password: config.authToken,
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 100 },
    });
    this.accountSid = config.accountSid;
  }

  /**
   * Build the account-scoped path prefix.
   */
  private accountPath(subpath: string): string {
    return `/2010-04-01/Accounts/${this.accountSid}${subpath}.json`;
  }

  // ==================== Send SMS ====================

  /**
   * Send an SMS or MMS message.
   *
   * Twilio requires form-encoded POST bodies for message creation,
   * so this method builds the request manually.
   */
  async sendSms(params: TwilioSendSmsParams): Promise<TwilioMessage> {
    const formData: Record<string, string> = {
      To: params.To,
      From: params.From,
      Body: params.Body,
    };
    if (params.StatusCallback) formData.StatusCallback = params.StatusCallback;
    if (params.MessagingServiceSid)
      formData.MessagingServiceSid = params.MessagingServiceSid;
    if (params.MediaUrl) {
      params.MediaUrl.forEach((url, i) => {
        formData[`MediaUrl[${i}]`] = url;
      });
    }

    const response = await this.request<TwilioMessage>({
      method: "POST",
      path: this.accountPath("/Messages"),
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return response.data;
  }

  // ==================== List Messages ====================

  /**
   * Retrieve a list of messages sent from or received by the account.
   * Supports filtering by To, From, and DateSent.
   */
  async listMessages(
    params?: TwilioMessageListParams
  ): Promise<TwilioMessageListResponse> {
    const queryParams: Record<string, string> = {};
    if (params?.To) queryParams.To = params.To;
    if (params?.From) queryParams.From = params.From;
    if (params?.DateSent) queryParams.DateSent = params.DateSent;
    if (params?.["DateSent>="]) queryParams["DateSent>="] = params["DateSent>="];
    if (params?.["DateSent<="]) queryParams["DateSent<="] = params["DateSent<="];
    if (params?.PageSize != null) queryParams.PageSize = String(params.PageSize);
    if (params?.Page != null) queryParams.Page = String(params.Page);

    const response = await this.get<TwilioMessageListResponse>(
      this.accountPath("/Messages"),
      queryParams
    );
    return response.data;
  }

  /**
   * Retrieve a single message by SID.
   */
  async getMessage(messageSid: string): Promise<TwilioMessage> {
    const response = await this.get<TwilioMessage>(
      this.accountPath(`/Messages/${messageSid}`)
    );
    return response.data;
  }

  // ==================== Phone Number Lookup ====================

  /**
   * Look up information about a phone number using the Twilio Lookup API v2.
   * Returns carrier info, caller name, line type intelligence, and more.
   *
   * @param phoneNumber - E.164 formatted phone number (e.g., +14155552671)
   * @param params - Optional fields to include in the lookup
   */
  async lookupPhoneNumber(
    phoneNumber: string,
    params?: TwilioLookupParams
  ): Promise<TwilioLookupResult> {
    const queryParams: Record<string, string> = {};
    if (params?.fields) queryParams.Fields = params.fields;

    const response = await this.request<TwilioLookupResult>({
      method: "GET",
      path: `/v2/PhoneNumbers/${encodeURIComponent(phoneNumber)}`,
      params: queryParams,
    });
    return response.data;
  }

  // ==================== Connection Test ====================

  /**
   * Verify that the credentials are valid by fetching account info.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.get(
        `/2010-04-01/Accounts/${this.accountSid}.json`
      );
      return true;
    } catch {
      return false;
    }
  }
}
