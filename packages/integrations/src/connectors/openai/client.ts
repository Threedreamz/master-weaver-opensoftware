import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  OpenAiClientConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ChatMessage,
  OpenAiModel,
  ToolDefinition,
  ToolChoice,
  ResponseFormat,
  JsonSchema,
  InvoiceExtractionResult,
  LegalDocumentAnalysis,
  BookkeepingClassification,
} from "./types.js";

// ==================== OpenAI Client ====================

export class OpenAiClient {
  private client: BaseIntegrationClient;

  constructor(config: OpenAiClientConfig) {
    const defaultHeaders: Record<string, string> = {};
    if (config.organizationId) {
      defaultHeaders["OpenAI-Organization"] = config.organizationId;
    }
    if (config.projectId) {
      defaultHeaders["OpenAI-Project"] = config.projectId;
    }

    this.client = new BaseIntegrationClient({
      baseUrl: config.baseUrl ?? "https://api.openai.com/v1",
      authType: "api_key",
      credentials: { apiKey: config.apiKey },
      timeout: config.timeout ?? 60_000,
      rateLimit: { requestsPerMinute: 60 },
      defaultHeaders,
    });
  }

  // ==================== Chat Completions ====================

  /**
   * Create a chat completion.
   */
  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const response = await this.client.post<ChatCompletionResponse>("/chat/completions", request);
    return response.data;
  }

  /**
   * Convenience: simple chat completion with a single user message.
   */
  async chat(
    message: string,
    options?: {
      model?: OpenAiModel;
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<string> {
    const messages: ChatMessage[] = [];
    if (options?.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: message });

    const response = await this.createChatCompletion({
      model: options?.model ?? "gpt-4o",
      messages,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
    });

    return response.choices[0]?.message.content ?? "";
  }

  /**
   * Chat completion with tool/function calling.
   */
  async chatWithTools(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    options?: {
      model?: OpenAiModel;
      toolChoice?: ToolChoice;
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<ChatCompletionResponse> {
    return this.createChatCompletion({
      model: options?.model ?? "gpt-4o",
      messages,
      tools,
      tool_choice: options?.toolChoice ?? "auto",
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
    });
  }

  /**
   * Chat completion with structured JSON output.
   * Returns parsed JSON of type T.
   */
  async chatStructured<T>(
    messages: ChatMessage[],
    schema: {
      name: string;
      description?: string;
      schema: JsonSchema;
    },
    options?: {
      model?: OpenAiModel;
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<T> {
    const responseFormat: ResponseFormat = {
      type: "json_schema",
      json_schema: {
        name: schema.name,
        description: schema.description,
        schema: schema.schema,
        strict: true,
      },
    };

    const response = await this.createChatCompletion({
      model: options?.model ?? "gpt-4o",
      messages,
      response_format: responseFormat,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
    });

    const content = response.choices[0]?.message.content;
    if (!content) {
      throw new Error("No content in structured output response");
    }
    return JSON.parse(content) as T;
  }

  // ==================== Embeddings ====================

  /**
   * Create embeddings for one or more inputs.
   */
  async createEmbeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const response = await this.client.post<EmbeddingResponse>("/embeddings", request);
    return response.data;
  }

  /**
   * Convenience: embed a single text string.
   */
  async embed(
    text: string,
    options?: { model?: string; dimensions?: number },
  ): Promise<number[]> {
    const response = await this.createEmbeddings({
      input: text,
      model: options?.model ?? "text-embedding-3-small",
      dimensions: options?.dimensions,
    });
    return response.data[0]!.embedding;
  }

  /**
   * Convenience: embed multiple text strings in a single request.
   */
  async embedBatch(
    texts: string[],
    options?: { model?: string; dimensions?: number },
  ): Promise<number[][]> {
    const response = await this.createEmbeddings({
      input: texts,
      model: options?.model ?? "text-embedding-3-small",
      dimensions: options?.dimensions,
    });
    return response.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
  }

  // ==================== Accounting / Legal Use Case Helpers ====================

  /**
   * Extract structured invoice data from OCR text or a document description.
   */
  async extractInvoiceData(
    documentText: string,
    options?: { model?: OpenAiModel; language?: string },
  ): Promise<InvoiceExtractionResult> {
    const lang = options?.language ?? "en";
    const systemPrompt = `You are a financial document extraction assistant. Extract structured invoice/receipt data from the provided text. Be precise with numbers and dates. Use ISO 8601 date format (YYYY-MM-DD). Language context: ${lang}.`;

    return this.chatStructured<InvoiceExtractionResult>(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: documentText },
      ],
      {
        name: "invoice_extraction",
        description: "Structured invoice/receipt data",
        schema: {
          type: "object",
          properties: {
            vendor_name: { type: "string" },
            vendor_address: { type: "string" },
            invoice_number: { type: "string" },
            invoice_date: { type: "string" },
            due_date: { type: "string" },
            currency: { type: "string" },
            subtotal: { type: "number" },
            tax_amount: { type: "number" },
            total_amount: { type: "number" },
            line_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  quantity: { type: "number" },
                  unit_price: { type: "number" },
                  amount: { type: "number" },
                  tax_rate: { type: "number" },
                },
                required: ["description", "amount"],
                additionalProperties: false,
              },
            },
            payment_terms: { type: "string" },
            notes: { type: "string" },
          },
          required: ["vendor_name", "currency", "total_amount", "line_items"],
          additionalProperties: false,
        },
      },
      { model: options?.model ?? "gpt-4o" },
    );
  }

  /**
   * Analyze a legal document and extract structured information.
   */
  async analyzeLegalDocument(
    documentText: string,
    options?: { model?: OpenAiModel; documentType?: string },
  ): Promise<LegalDocumentAnalysis> {
    const typeHint = options?.documentType ? ` The document is a ${options.documentType}.` : "";
    const systemPrompt = `You are a legal document analysis assistant. Extract structured information from the provided legal document.${typeHint} Be thorough and identify all parties, terms, obligations, and potential risks.`;

    return this.chatStructured<LegalDocumentAnalysis>(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: documentText },
      ],
      {
        name: "legal_document_analysis",
        description: "Structured legal document analysis",
        schema: {
          type: "object",
          properties: {
            document_type: { type: "string" },
            parties: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  role: { type: "string" },
                  address: { type: "string" },
                },
                required: ["name", "role"],
                additionalProperties: false,
              },
            },
            effective_date: { type: "string" },
            expiration_date: { type: "string" },
            key_terms: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  term: { type: "string" },
                  description: { type: "string" },
                  section: { type: "string" },
                },
                required: ["term", "description"],
                additionalProperties: false,
              },
            },
            obligations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  party: { type: "string" },
                  description: { type: "string" },
                  deadline: { type: "string" },
                },
                required: ["party", "description"],
                additionalProperties: false,
              },
            },
            risks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  severity: { type: "string", enum: ["low", "medium", "high"] },
                  section: { type: "string" },
                },
                required: ["description", "severity"],
                additionalProperties: false,
              },
            },
            summary: { type: "string" },
          },
          required: ["document_type", "parties", "key_terms", "obligations", "risks", "summary"],
          additionalProperties: false,
        },
      },
      { model: options?.model ?? "gpt-4o" },
    );
  }

  /**
   * Classify a transaction for bookkeeping purposes.
   */
  async classifyTransaction(
    description: string,
    options?: {
      model?: OpenAiModel;
      chartOfAccounts?: string;
      language?: string;
    },
  ): Promise<BookkeepingClassification> {
    const lang = options?.language ?? "en";
    const coaContext = options?.chartOfAccounts
      ? `\n\nChart of accounts:\n${options.chartOfAccounts}`
      : "";
    const systemPrompt = `You are an accounting assistant. Classify the given transaction into the appropriate account and category. Use standard accounting conventions. Language context: ${lang}.${coaContext}`;

    return this.chatStructured<BookkeepingClassification>(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: description },
      ],
      {
        name: "bookkeeping_classification",
        description: "Transaction classification for bookkeeping",
        schema: {
          type: "object",
          properties: {
            account_name: { type: "string" },
            account_number: { type: "string" },
            category: { type: "string" },
            tax_relevant: { type: "boolean" },
            vat_rate: { type: "number" },
            cost_center: { type: "string" },
            description: { type: "string" },
            confidence: { type: "number" },
          },
          required: ["account_name", "category", "tax_relevant", "description", "confidence"],
          additionalProperties: false,
        },
      },
      { model: options?.model ?? "gpt-4o" },
    );
  }
}
