import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import type {
  TextractClientConfig,
  AnalyzeDocumentRequest,
  AnalyzeDocumentResponse,
  AnalyzeExpenseRequest,
  AnalyzeExpenseResponse,
  DetectDocumentTextRequest,
  DetectDocumentTextResponse,
  TextractFeatureType,
  DocumentInput,
  KeyValuePair,
  Block,
} from "./types.js";

// ==================== AWS Signature V4 Helpers ====================

async function hmacSha256(key: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
  const keyBuffer: BufferSource = key instanceof ArrayBuffer ? key : new Uint8Array(key);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
}

async function sha256Hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(new TextEncoder().encode(`AWS4${secretKey}`), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, "aws4_request");
}

function getAmzDateStrings(): { amzDate: string; dateStamp: string } {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  return { amzDate, dateStamp };
}

// ==================== Textract Client ====================

export class TextractClient {
  private client: BaseIntegrationClient;
  private accessKeyId: string;
  private secretAccessKey: string;
  private sessionToken?: string;
  private region: string;
  private host: string;

  constructor(config: TextractClientConfig) {
    const endpoint = config.endpoint ?? `https://textract.${config.region}.amazonaws.com`;
    const url = new URL(endpoint);

    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.sessionToken = config.sessionToken;
    this.region = config.region;
    this.host = url.host;

    this.client = new BaseIntegrationClient({
      baseUrl: endpoint,
      authType: "custom",
      credentials: {},
      timeout: config.timeout ?? 60_000,
      rateLimit: { requestsPerMinute: 30 },
    });
  }

  // ==================== Public API ====================

  /**
   * Analyze a document for tables, forms, signatures, and/or layout.
   * Synchronous operation — max 10 MB, single-page for images, multi-page for PDFs.
   */
  async analyzeDocument(
    document: DocumentInput,
    featureTypes: TextractFeatureType[],
    queries?: Array<{ Text: string; Alias?: string; Pages?: string[] }>,
  ): Promise<AnalyzeDocumentResponse> {
    const body: AnalyzeDocumentRequest = {
      Document: document,
      FeatureTypes: featureTypes,
    };
    if (queries?.length) {
      body.QueriesConfig = { Queries: queries };
    }

    const response = await this.signedRequest<AnalyzeDocumentResponse>(
      "Textract.AnalyzeDocument",
      body,
    );
    return response;
  }

  /**
   * Detect raw text in a document (lines + words). No structural analysis.
   */
  async detectDocumentText(document: DocumentInput): Promise<DetectDocumentTextResponse> {
    const body: DetectDocumentTextRequest = { Document: document };
    return this.signedRequest<DetectDocumentTextResponse>("Textract.DetectDocumentText", body);
  }

  /**
   * Analyze a receipt or invoice, extracting structured expense fields and line items.
   */
  async analyzeExpense(document: DocumentInput): Promise<AnalyzeExpenseResponse> {
    const body: AnalyzeExpenseRequest = { Document: document };
    return this.signedRequest<AnalyzeExpenseResponse>("Textract.AnalyzeExpense", body);
  }

  // ==================== Convenience Helpers ====================

  /**
   * Extract key-value pairs from an AnalyzeDocument response.
   * Resolves block relationships to produce human-readable pairs.
   */
  static extractKeyValuePairs(response: AnalyzeDocumentResponse): KeyValuePair[] {
    const blockMap = new Map<string, Block>();
    for (const block of response.Blocks) {
      blockMap.set(block.Id, block);
    }

    const pairs: KeyValuePair[] = [];

    for (const block of response.Blocks) {
      if (block.BlockType !== "KEY_VALUE_SET" || !block.EntityTypes?.includes("KEY")) continue;

      const keyText = TextractClient.getTextFromRelationship(block, "CHILD", blockMap);
      const valueBlock = block.Relationships?.find((r) => r.Type === "VALUE");
      let valueText = "";
      let valueConfidence = 0;

      if (valueBlock) {
        for (const id of valueBlock.Ids) {
          const vBlock = blockMap.get(id);
          if (vBlock) {
            valueText = TextractClient.getTextFromRelationship(vBlock, "CHILD", blockMap);
            valueConfidence = vBlock.Confidence;
          }
        }
      }

      pairs.push({
        key: keyText,
        value: valueText,
        keyConfidence: block.Confidence,
        valueConfidence,
        geometry: block.Geometry,
      });
    }

    return pairs;
  }

  /**
   * Extract plain text lines from a DetectDocumentText or AnalyzeDocument response.
   */
  static extractLines(response: { Blocks: Block[] }): string[] {
    return response.Blocks
      .filter((b) => b.BlockType === "LINE")
      .sort((a, b) => (a.Page ?? 1) - (b.Page ?? 1))
      .map((b) => b.Text ?? "");
  }

  // ==================== Private ====================

  private static getTextFromRelationship(
    block: Block,
    relationshipType: string,
    blockMap: Map<string, Block>,
  ): string {
    const relationship = block.Relationships?.find((r) => r.Type === relationshipType);
    if (!relationship) return block.Text ?? "";

    return relationship.Ids
      .map((id) => blockMap.get(id)?.Text ?? "")
      .join(" ")
      .trim();
  }

  private async signedRequest<T>(target: string, body: unknown): Promise<T> {
    const { amzDate, dateStamp } = getAmzDateStrings();
    const service = "textract";
    const payloadStr = JSON.stringify(body);
    const payloadHash = await sha256Hex(payloadStr);

    // Canonical headers
    const headers: Record<string, string> = {
      "content-type": "application/x-amz-json-1.1",
      host: this.host,
      "x-amz-date": amzDate,
      "x-amz-target": target,
    };

    if (this.sessionToken) {
      headers["x-amz-security-token"] = this.sessionToken;
    }

    // Build canonical request
    const signedHeaderKeys = Object.keys(headers).sort();
    const signedHeaders = signedHeaderKeys.join(";");
    const canonicalHeaders = signedHeaderKeys
      .map((k) => `${k}:${headers[k]!.trim()}`)
      .join("\n") + "\n";

    const canonicalRequest = [
      "POST",
      "/",
      "", // no query string
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    // String to sign
    const credentialScope = `${dateStamp}/${this.region}/${service}/aws4_request`;
    const canonicalRequestHash = await sha256Hex(canonicalRequest);
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      canonicalRequestHash,
    ].join("\n");

    // Signing key & signature
    const signingKey = await getSignatureKey(this.secretAccessKey, dateStamp, this.region, service);
    const signatureBuffer = await hmacSha256(signingKey, stringToSign);
    const signature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Authorization header
    const authorization = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await this.client.request<T>({
      method: "POST",
      path: "/",
      body,
      headers: {
        ...headers,
        Authorization: authorization,
        // Override the default JSON content-type from BaseIntegrationClient
        "Content-Type": "application/x-amz-json-1.1",
      },
    });

    return response.data;
  }
}
