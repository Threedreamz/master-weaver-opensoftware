import { createHmac, createHash } from "node:crypto";
import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse, RequestConfig } from "../../core/types.js";
import type {
  AWSSESClientConfig,
  SESSendEmailRequest,
  SESSendEmailResponse,
  SESSendTemplatedEmailRequest,
  SESSendTemplatedEmailResponse,
  SESSendBulkTemplatedEmailRequest,
  SESSendBulkTemplatedEmailResponse,
  SESSendRawEmailRequest,
  SESSendRawEmailResponse,
  SESGetSendStatisticsResponse,
  SESGetSendQuotaResponse,
  SESListIdentitiesResponse,
  SESGetIdentityVerificationAttributesResponse,
} from "./types.js";

/**
 * AWS SES v2 client using AWS Signature Version 4 authentication.
 *
 * Supports: SendEmail, SendTemplatedEmail, SendBulkTemplatedEmail,
 * GetSendStatistics, GetSendQuota, identity management.
 */
export class AWSSESClient extends BaseIntegrationClient {
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly region: string;
  private readonly sessionToken?: string;
  private readonly service = "ses";

  constructor(config: AWSSESClientConfig) {
    const baseUrl = `https://email.${config.region}.amazonaws.com`;
    super({
      baseUrl,
      authType: "custom",
      credentials: {},
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 100 },
    });
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.region = config.region;
    this.sessionToken = config.sessionToken;
  }

  // ==================== SES API Actions ====================

  /** Send an email using the SES v2 API (JSON). */
  async sendEmail(
    params: SESSendEmailRequest
  ): Promise<ApiResponse<SESSendEmailResponse>> {
    return this.sesRequest<SESSendEmailResponse>(
      "POST",
      "/v2/email/outbound-emails",
      this.buildSendEmailBody(params)
    );
  }

  /** Send a templated email. */
  async sendTemplatedEmail(
    params: SESSendTemplatedEmailRequest
  ): Promise<ApiResponse<SESSendTemplatedEmailResponse>> {
    return this.sesRequest<SESSendTemplatedEmailResponse>(
      "POST",
      "/v2/email/outbound-emails",
      {
        FromEmailAddress: params.Source,
        Destination: {
          ToAddresses: params.Destination.ToAddresses,
          CcAddresses: params.Destination.CcAddresses,
          BccAddresses: params.Destination.BccAddresses,
        },
        Content: {
          Template: {
            TemplateName: params.Template,
            TemplateData: params.TemplateData,
          },
        },
        ReplyToAddresses: params.ReplyToAddresses,
        ConfigurationSetName: params.ConfigurationSetName,
        EmailTags: params.Tags?.map((t) => ({
          Name: t.Name,
          Value: t.Value,
        })),
      }
    );
  }

  /** Send bulk templated emails. */
  async sendBulkTemplatedEmail(
    params: SESSendBulkTemplatedEmailRequest
  ): Promise<ApiResponse<SESSendBulkTemplatedEmailResponse>> {
    return this.sesRequest<SESSendBulkTemplatedEmailResponse>(
      "POST",
      "/v2/email/outbound-bulk-emails",
      {
        FromEmailAddress: params.Source,
        DefaultContent: {
          Template: {
            TemplateName: params.Template,
            TemplateData: params.DefaultTemplateData,
          },
        },
        BulkEmailEntries: params.Destinations.map((d) => ({
          Destination: {
            ToAddresses: d.Destination.ToAddresses,
            CcAddresses: d.Destination.CcAddresses,
            BccAddresses: d.Destination.BccAddresses,
          },
          ReplacementEmailContent: d.ReplacementTemplateData
            ? {
                ReplacementTemplate: {
                  ReplacementTemplateData: d.ReplacementTemplateData,
                },
              }
            : undefined,
          ReplacementTags: d.ReplacementTags?.map((t) => ({
            Name: t.Name,
            Value: t.Value,
          })),
        })),
        ReplyToAddresses: params.ReplyToAddresses,
        ConfigurationSetName: params.ConfigurationSetName,
        DefaultEmailTags: params.DefaultTags?.map((t) => ({
          Name: t.Name,
          Value: t.Value,
        })),
      }
    );
  }

  /** Send a raw MIME email. */
  async sendRawEmail(
    params: SESSendRawEmailRequest
  ): Promise<ApiResponse<SESSendRawEmailResponse>> {
    return this.sesRequest<SESSendRawEmailResponse>(
      "POST",
      "/v2/email/outbound-emails",
      {
        FromEmailAddress: params.Source,
        Destination: params.Destinations
          ? { ToAddresses: params.Destinations }
          : undefined,
        Content: {
          Raw: { Data: params.RawMessage.Data },
        },
        ConfigurationSetName: params.ConfigurationSetName,
        EmailTags: params.Tags?.map((t) => ({
          Name: t.Name,
          Value: t.Value,
        })),
      }
    );
  }

  /** Get sending statistics for the last two weeks. */
  async getSendStatistics(): Promise<
    ApiResponse<SESGetSendStatisticsResponse>
  > {
    return this.sesRequest<SESGetSendStatisticsResponse>(
      "GET",
      "/v2/email/deliverability-dashboard/statistics"
    );
  }

  /** Get the current send quota (max 24h, rate, sent count). */
  async getSendQuota(): Promise<ApiResponse<SESGetSendQuotaResponse>> {
    return this.sesRequest<SESGetSendQuotaResponse>(
      "GET",
      "/v2/email/account"
    );
  }

  /** List verified email identities. */
  async listIdentities(
    nextToken?: string,
    pageSize?: number
  ): Promise<ApiResponse<SESListIdentitiesResponse>> {
    const params: Record<string, string> = {};
    if (nextToken) params.NextToken = nextToken;
    if (pageSize) params.PageSize = String(pageSize);
    return this.sesRequest<SESListIdentitiesResponse>(
      "GET",
      "/v2/email/identities",
      undefined,
      params
    );
  }

  /** Get verification attributes for identities. */
  async getIdentityVerificationAttributes(
    emailIdentity: string
  ): Promise<ApiResponse<SESGetIdentityVerificationAttributesResponse>> {
    return this.sesRequest<SESGetIdentityVerificationAttributesResponse>(
      "GET",
      `/v2/email/identities/${encodeURIComponent(emailIdentity)}`
    );
  }

  /** Verify email identity (send verification email). */
  async verifyEmailIdentity(
    emailAddress: string
  ): Promise<ApiResponse<Record<string, never>>> {
    return this.sesRequest<Record<string, never>>(
      "POST",
      "/v2/email/identities",
      { EmailIdentity: emailAddress, IdentityType: "EMAIL_ADDRESS" }
    );
  }

  // ==================== Connection Test ====================

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.getSendQuota();
      return response.status === 200;
    } catch {
      return false;
    }
  }

  // ==================== AWS Signature V4 ====================

  private async sesRequest<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
    queryParams?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const now = new Date();
    const amzDate = this.toAmzDate(now);
    const dateStamp = amzDate.slice(0, 8);

    const url = new URL(path, this.baseUrl);
    if (queryParams) {
      for (const [k, v] of Object.entries(queryParams)) {
        url.searchParams.set(k, v);
      }
    }

    const bodyStr = body ? JSON.stringify(body) : "";
    const bodyHash = createHash("sha256").update(bodyStr).digest("hex");

    const headers: Record<string, string> = {
      host: url.hostname,
      "x-amz-date": amzDate,
      "x-amz-content-sha256": bodyHash,
      "content-type": "application/json",
    };

    if (this.sessionToken) {
      headers["x-amz-security-token"] = this.sessionToken;
    }

    // Canonical headers (sorted, lowercased)
    const signedHeaderKeys = Object.keys(headers).sort();
    const signedHeaders = signedHeaderKeys.join(";");
    const canonicalHeaders = signedHeaderKeys
      .map((k) => `${k}:${headers[k]!.trim()}\n`)
      .join("");

    // Canonical query string
    const sortedParams = [...url.searchParams.entries()].sort(([a], [b]) =>
      a.localeCompare(b)
    );
    const canonicalQueryString = sortedParams
      .map(
        ([k, v]) =>
          `${encodeURIComponent(k)}=${encodeURIComponent(v)}`
      )
      .join("&");

    // Canonical request
    const canonicalRequest = [
      method,
      url.pathname,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      bodyHash,
    ].join("\n");

    const credentialScope = `${dateStamp}/${this.region}/${this.service}/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      createHash("sha256").update(canonicalRequest).digest("hex"),
    ].join("\n");

    // Signing key
    const kDate = this.hmacSha256(`AWS4${this.secretAccessKey}`, dateStamp);
    const kRegion = this.hmacSha256(kDate, this.region);
    const kService = this.hmacSha256(kRegion, this.service);
    const signingKey = this.hmacSha256(kService, "aws4_request");

    const signature = createHmac("sha256", signingKey)
      .update(stringToSign)
      .digest("hex");

    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const requestConfig: RequestConfig = {
      method,
      path,
      body: body ?? undefined,
      headers: {
        ...headers,
        Authorization: authorizationHeader,
      },
      params: queryParams,
    };

    return this.request<T>(requestConfig);
  }

  private hmacSha256(key: string | Buffer, data: string): Buffer {
    return createHmac("sha256", key).update(data).digest();
  }

  private toAmzDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }

  private buildSendEmailBody(params: SESSendEmailRequest): Record<string, unknown> {
    return {
      FromEmailAddress: params.Source,
      Destination: {
        ToAddresses: params.Destination.ToAddresses,
        CcAddresses: params.Destination.CcAddresses,
        BccAddresses: params.Destination.BccAddresses,
      },
      Content: {
        Simple: {
          Subject: {
            Data: params.Message.Subject.Data,
            Charset: params.Message.Subject.Charset ?? "UTF-8",
          },
          Body: {
            Text: params.Message.Body.Text
              ? {
                  Data: params.Message.Body.Text.Data,
                  Charset: params.Message.Body.Text.Charset ?? "UTF-8",
                }
              : undefined,
            Html: params.Message.Body.Html
              ? {
                  Data: params.Message.Body.Html.Data,
                  Charset: params.Message.Body.Html.Charset ?? "UTF-8",
                }
              : undefined,
          },
        },
      },
      ReplyToAddresses: params.ReplyToAddresses,
      ConfigurationSetName: params.ConfigurationSetName,
      EmailTags: params.Tags?.map((t) => ({ Name: t.Name, Value: t.Value })),
    };
  }
}
