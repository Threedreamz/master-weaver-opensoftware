// ==================== Anthropic Claude API Types ====================

/** Available Claude models */
export type AnthropicModel =
  | "claude-sonnet-4-20250514"
  | "claude-opus-4-20250514"
  | "claude-haiku-35-20241022"
  | "claude-3-5-sonnet-20241022"
  | "claude-3-5-haiku-20241022"
  | "claude-3-opus-20240229"
  | "claude-3-haiku-20240307"
  | (string & {});

/** Stop reason for message completion */
export type StopReason = "end_turn" | "max_tokens" | "stop_sequence" | "tool_use";

/** Supported API versions */
export type AnthropicApiVersion = "2023-06-01" | (string & {});

// ==================== Content Blocks ====================

export interface TextBlock {
  type: "text";
  text: string;
}

export interface ImageSource {
  type: "base64";
  media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  data: string;
}

export interface ImageBlock {
  type: "image";
  source: ImageSource;
}

export interface DocumentSource {
  type: "base64";
  media_type: "application/pdf";
  data: string;
}

export interface DocumentBlock {
  type: "document";
  source: DocumentSource;
  title?: string;
  context?: string;
  citations?: { enabled: boolean };
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string | ContentBlock[];
  is_error?: boolean;
}

export interface ThinkingBlock {
  type: "thinking";
  thinking: string;
}

export interface RedactedThinkingBlock {
  type: "redacted_thinking";
  data: string;
}

export type ContentBlock =
  | TextBlock
  | ImageBlock
  | DocumentBlock
  | ToolUseBlock
  | ToolResultBlock
  | ThinkingBlock
  | RedactedThinkingBlock;

export type RequestContentBlock =
  | TextBlock
  | ImageBlock
  | DocumentBlock
  | ToolUseBlock
  | ToolResultBlock;

// ==================== Messages ====================

export interface Message {
  role: "user" | "assistant";
  content: string | RequestContentBlock[];
}

// ==================== Tool Definitions ====================

export interface ToolInputSchema {
  type: "object";
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface JsonSchemaProperty {
  type?: string;
  description?: string;
  enum?: string[];
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  anyOf?: JsonSchemaProperty[];
  additionalProperties?: boolean;
  [key: string]: unknown;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: ToolInputSchema;
  cache_control?: { type: "ephemeral" };
}

export type ToolChoice =
  | { type: "auto" }
  | { type: "any" }
  | { type: "tool"; name: string };

// ==================== Messages Request ====================

export interface MessagesRequest {
  model: AnthropicModel;
  messages: Message[];
  max_tokens: number;
  system?: string | Array<TextBlock & { cache_control?: { type: "ephemeral" } }>;
  stop_sequences?: string[];
  temperature?: number;
  top_p?: number;
  top_k?: number;
  tools?: ToolDefinition[];
  tool_choice?: ToolChoice;
  metadata?: {
    user_id?: string;
  };
  stream?: boolean;
  /** Enable extended thinking (Claude 3.7+ models) */
  thinking?: {
    type: "enabled";
    budget_tokens: number;
  };
}

// ==================== Messages Response ====================

export interface MessagesResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: ContentBlock[];
  model: string;
  stop_reason: StopReason;
  stop_sequence: string | null;
  usage: Usage;
}

export interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

// ==================== Streaming ====================

export interface MessageStartEvent {
  type: "message_start";
  message: MessagesResponse;
}

export interface ContentBlockStartEvent {
  type: "content_block_start";
  index: number;
  content_block: ContentBlock;
}

export interface ContentBlockDeltaEvent {
  type: "content_block_delta";
  index: number;
  delta: TextDelta | InputJsonDelta | ThinkingDelta;
}

export interface TextDelta {
  type: "text_delta";
  text: string;
}

export interface InputJsonDelta {
  type: "input_json_delta";
  partial_json: string;
}

export interface ThinkingDelta {
  type: "thinking_delta";
  thinking: string;
}

export interface ContentBlockStopEvent {
  type: "content_block_stop";
  index: number;
}

export interface MessageDeltaEvent {
  type: "message_delta";
  delta: {
    stop_reason: StopReason;
    stop_sequence: string | null;
  };
  usage: { output_tokens: number };
}

export interface MessageStopEvent {
  type: "message_stop";
}

export interface PingEvent {
  type: "ping";
}

export interface ErrorEvent {
  type: "error";
  error: { type: string; message: string };
}

export type StreamEvent =
  | MessageStartEvent
  | ContentBlockStartEvent
  | ContentBlockDeltaEvent
  | ContentBlockStopEvent
  | MessageDeltaEvent
  | MessageStopEvent
  | PingEvent
  | ErrorEvent;

// ==================== Error Response ====================

export interface AnthropicErrorResponse {
  type: "error";
  error: {
    type:
      | "invalid_request_error"
      | "authentication_error"
      | "permission_error"
      | "not_found_error"
      | "rate_limit_error"
      | "api_error"
      | "overloaded_error";
    message: string;
  };
}

// ==================== Client Config ====================

export interface AnthropicClientConfig {
  apiKey: string;
  /** API version header (default: "2023-06-01") */
  apiVersion?: AnthropicApiVersion;
  /** Override base URL */
  baseUrl?: string;
  /** Request timeout in ms (default: 120000) */
  timeout?: number;
  /** Default model to use */
  defaultModel?: AnthropicModel;
  /** Default max tokens */
  defaultMaxTokens?: number;
}
