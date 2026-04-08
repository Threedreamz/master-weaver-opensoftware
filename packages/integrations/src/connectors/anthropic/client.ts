import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  AnthropicClientConfig,
  AnthropicModel,
  MessagesRequest,
  MessagesResponse,
  Message,
  ToolDefinition,
  ToolChoice,
  ContentBlock,
  TextBlock,
  ToolUseBlock,
} from "./types.js";

// ==================== Anthropic Client ====================

export class AnthropicClient {
  private client: BaseIntegrationClient;
  private defaultModel: AnthropicModel;
  private defaultMaxTokens: number;

  constructor(config: AnthropicClientConfig) {
    this.defaultModel = config.defaultModel ?? "claude-sonnet-4-20250514";
    this.defaultMaxTokens = config.defaultMaxTokens ?? 4096;

    this.client = new BaseIntegrationClient({
      baseUrl: config.baseUrl ?? "https://api.anthropic.com/v1",
      authType: "api_key",
      credentials: {
        headerName: "x-api-key",
        apiKey: config.apiKey,
      },
      timeout: config.timeout ?? 120_000,
      rateLimit: { requestsPerMinute: 60 },
      defaultHeaders: {
        "anthropic-version": config.apiVersion ?? "2023-06-01",
      },
    });
  }

  // ==================== Messages API ====================

  /**
   * Create a message using the Messages API.
   */
  async createMessage(request: MessagesRequest): Promise<MessagesResponse> {
    const response = await this.client.post<MessagesResponse>("/messages", {
      ...request,
      stream: false,
    });
    return response.data;
  }

  /**
   * Convenience: simple message with a single user turn.
   */
  async message(
    content: string,
    options?: {
      model?: AnthropicModel;
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
    },
  ): Promise<string> {
    const response = await this.createMessage({
      model: options?.model ?? this.defaultModel,
      messages: [{ role: "user", content }],
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
      system: options?.systemPrompt,
      temperature: options?.temperature,
    });

    return AnthropicClient.extractText(response);
  }

  /**
   * Multi-turn conversation.
   */
  async converse(
    messages: Message[],
    options?: {
      model?: AnthropicModel;
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
    },
  ): Promise<MessagesResponse> {
    return this.createMessage({
      model: options?.model ?? this.defaultModel,
      messages,
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
      system: options?.systemPrompt,
      temperature: options?.temperature,
    });
  }

  /**
   * Message with tool use.
   */
  async messageWithTools(
    messages: Message[],
    tools: ToolDefinition[],
    options?: {
      model?: AnthropicModel;
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
      toolChoice?: ToolChoice;
    },
  ): Promise<MessagesResponse> {
    return this.createMessage({
      model: options?.model ?? this.defaultModel,
      messages,
      tools,
      tool_choice: options?.toolChoice ?? { type: "auto" },
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
      system: options?.systemPrompt,
      temperature: options?.temperature,
    });
  }

  /**
   * Message with extended thinking enabled (for complex reasoning tasks).
   */
  async messageWithThinking(
    messages: Message[],
    options?: {
      model?: AnthropicModel;
      systemPrompt?: string;
      maxTokens?: number;
      thinkingBudget?: number;
    },
  ): Promise<MessagesResponse> {
    return this.createMessage({
      model: options?.model ?? this.defaultModel,
      messages,
      max_tokens: options?.maxTokens ?? 16_384,
      system: options?.systemPrompt,
      thinking: {
        type: "enabled",
        budget_tokens: options?.thinkingBudget ?? 10_000,
      },
    });
  }

  /**
   * Process a document (PDF) with Claude's vision capabilities.
   */
  async analyzeDocument(
    documentBase64: string,
    prompt: string,
    options?: {
      model?: AnthropicModel;
      systemPrompt?: string;
      maxTokens?: number;
      title?: string;
    },
  ): Promise<string> {
    const response = await this.createMessage({
      model: options?.model ?? this.defaultModel,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: documentBase64,
              },
              title: options?.title,
            },
            { type: "text", text: prompt },
          ],
        },
      ],
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
      system: options?.systemPrompt,
    });

    return AnthropicClient.extractText(response);
  }

  /**
   * Analyze an image with Claude's vision capabilities.
   */
  async analyzeImage(
    imageBase64: string,
    mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp",
    prompt: string,
    options?: {
      model?: AnthropicModel;
      systemPrompt?: string;
      maxTokens?: number;
    },
  ): Promise<string> {
    const response = await this.createMessage({
      model: options?.model ?? this.defaultModel,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
      system: options?.systemPrompt,
    });

    return AnthropicClient.extractText(response);
  }

  // ==================== Structured Output Helpers ====================

  /**
   * Extract structured JSON from a response using tool use as a structured output mechanism.
   * Defines a single tool that forces Claude to return structured data.
   */
  async extractStructured<T>(
    messages: Message[],
    schema: {
      name: string;
      description: string;
      properties: Record<string, unknown>;
      required?: string[];
    },
    options?: {
      model?: AnthropicModel;
      systemPrompt?: string;
      maxTokens?: number;
    },
  ): Promise<T> {
    const tool: ToolDefinition = {
      name: schema.name,
      description: schema.description,
      input_schema: {
        type: "object",
        properties: schema.properties as Record<string, import("./types.js").JsonSchemaProperty>,
        required: schema.required,
      },
    };

    const response = await this.messageWithTools(messages, [tool], {
      ...options,
      toolChoice: { type: "tool", name: schema.name },
    });

    const toolUse = response.content.find(
      (block): block is ToolUseBlock => block.type === "tool_use",
    );

    if (!toolUse) {
      throw new Error("No tool use block in response — structured extraction failed");
    }

    return toolUse.input as T;
  }

  // ==================== Static Helpers ====================

  /**
   * Extract all text content from a MessagesResponse.
   */
  static extractText(response: MessagesResponse): string {
    return response.content
      .filter((block): block is TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");
  }

  /**
   * Extract tool use blocks from a MessagesResponse.
   */
  static extractToolUse(response: MessagesResponse): ToolUseBlock[] {
    return response.content.filter(
      (block): block is ToolUseBlock => block.type === "tool_use",
    );
  }

  /**
   * Extract thinking content from a MessagesResponse (extended thinking).
   */
  static extractThinking(response: MessagesResponse): string {
    return response.content
      .filter((block) => block.type === "thinking")
      .map((block) => (block as { type: "thinking"; thinking: string }).thinking)
      .join("");
  }

  /**
   * Check if the response contains tool use requests.
   */
  static hasToolUse(response: MessagesResponse): boolean {
    return response.content.some((block) => block.type === "tool_use");
  }

  /**
   * Get total token usage from a response.
   */
  static getTokenUsage(response: MessagesResponse): {
    input: number;
    output: number;
    total: number;
    cacheCreation: number;
    cacheRead: number;
  } {
    return {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      total: response.usage.input_tokens + response.usage.output_tokens,
      cacheCreation: response.usage.cache_creation_input_tokens ?? 0,
      cacheRead: response.usage.cache_read_input_tokens ?? 0,
    };
  }
}
