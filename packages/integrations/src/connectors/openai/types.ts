// ==================== OpenAI Types ====================

/** Available chat models */
export type OpenAiModel =
  | "gpt-4o"
  | "gpt-4o-mini"
  | "gpt-4o-2024-11-20"
  | "gpt-4-turbo"
  | "gpt-4"
  | "gpt-3.5-turbo"
  | "o1"
  | "o1-mini"
  | "o1-preview"
  | "o3"
  | "o3-mini"
  | "o4-mini"
  | (string & {});

/** Available embedding models */
export type EmbeddingModel =
  | "text-embedding-3-small"
  | "text-embedding-3-large"
  | "text-embedding-ada-002"
  | (string & {});

/** Role for chat messages */
export type MessageRole = "system" | "user" | "assistant" | "tool";

/** Finish reason for completions */
export type FinishReason = "stop" | "length" | "content_filter" | "tool_calls" | "function_call";

// ==================== Content Parts ====================

export interface TextContentPart {
  type: "text";
  text: string;
}

export interface ImageUrlContentPart {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
}

export type ContentPart = TextContentPart | ImageUrlContentPart;

// ==================== Messages ====================

export interface SystemMessage {
  role: "system";
  content: string;
  name?: string;
}

export interface UserMessage {
  role: "user";
  content: string | ContentPart[];
  name?: string;
}

export interface AssistantMessage {
  role: "assistant";
  content: string | null;
  name?: string;
  tool_calls?: ToolCall[];
  refusal?: string | null;
}

export interface ToolMessage {
  role: "tool";
  content: string;
  tool_call_id: string;
}

export type ChatMessage = SystemMessage | UserMessage | AssistantMessage | ToolMessage;

// ==================== Tools / Function Calling ====================

export interface FunctionDefinition {
  name: string;
  description?: string;
  parameters: JsonSchema;
  strict?: boolean;
}

export interface ToolDefinition {
  type: "function";
  function: FunctionDefinition;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export type ToolChoice =
  | "none"
  | "auto"
  | "required"
  | { type: "function"; function: { name: string } };

// ==================== JSON Schema (for structured output) ====================

export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: string[];
  description?: string;
  additionalProperties?: boolean | JsonSchema;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  $ref?: string;
  $defs?: Record<string, JsonSchema>;
  [key: string]: unknown;
}

// ==================== Structured Output / Response Format ====================

export interface ResponseFormatText {
  type: "text";
}

export interface ResponseFormatJsonObject {
  type: "json_object";
}

export interface ResponseFormatJsonSchema {
  type: "json_schema";
  json_schema: {
    name: string;
    description?: string;
    schema: JsonSchema;
    strict?: boolean;
  };
}

export type ResponseFormat = ResponseFormatText | ResponseFormatJsonObject | ResponseFormatJsonSchema;

// ==================== Chat Completion Request ====================

export interface ChatCompletionRequest {
  model: OpenAiModel;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  n?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  stop?: string | string[];
  presence_penalty?: number;
  frequency_penalty?: number;
  logit_bias?: Record<string, number>;
  user?: string;
  tools?: ToolDefinition[];
  tool_choice?: ToolChoice;
  response_format?: ResponseFormat;
  seed?: number;
  stream?: boolean;
  /** Reasoning effort for o-series models */
  reasoning_effort?: "low" | "medium" | "high";
}

// ==================== Chat Completion Response ====================

export interface ChatCompletionChoice {
  index: number;
  message: AssistantMessage;
  finish_reason: FinishReason;
  logprobs?: null | {
    content: Array<{
      token: string;
      logprob: number;
      bytes: number[] | null;
      top_logprobs: Array<{ token: string; logprob: number; bytes: number[] | null }>;
    }> | null;
  };
}

export interface CompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_tokens_details?: {
    cached_tokens?: number;
    audio_tokens?: number;
  };
  completion_tokens_details?: {
    reasoning_tokens?: number;
    audio_tokens?: number;
    accepted_prediction_tokens?: number;
    rejected_prediction_tokens?: number;
  };
}

export interface ChatCompletionResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: CompletionUsage;
  system_fingerprint?: string;
  service_tier?: string;
}

// ==================== Embeddings ====================

export interface EmbeddingRequest {
  input: string | string[];
  model: EmbeddingModel;
  encoding_format?: "float" | "base64";
  dimensions?: number;
  user?: string;
}

export interface EmbeddingData {
  object: "embedding";
  embedding: number[];
  index: number;
}

export interface EmbeddingResponse {
  object: "list";
  data: EmbeddingData[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// ==================== Accounting / Legal Structured Output Schemas ====================

/** Structured output for invoice/receipt data extraction */
export interface InvoiceExtractionResult {
  vendor_name: string;
  vendor_address?: string;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  currency: string;
  subtotal?: number;
  tax_amount?: number;
  total_amount: number;
  line_items: Array<{
    description: string;
    quantity?: number;
    unit_price?: number;
    amount: number;
    tax_rate?: number;
  }>;
  payment_terms?: string;
  notes?: string;
}

/** Structured output for legal document analysis */
export interface LegalDocumentAnalysis {
  document_type: string;
  parties: Array<{
    name: string;
    role: string;
    address?: string;
  }>;
  effective_date?: string;
  expiration_date?: string;
  key_terms: Array<{
    term: string;
    description: string;
    section?: string;
  }>;
  obligations: Array<{
    party: string;
    description: string;
    deadline?: string;
  }>;
  risks: Array<{
    description: string;
    severity: "low" | "medium" | "high";
    section?: string;
  }>;
  summary: string;
}

/** Structured output for bookkeeping classification */
export interface BookkeepingClassification {
  account_name: string;
  account_number?: string;
  category: string;
  tax_relevant: boolean;
  vat_rate?: number;
  cost_center?: string;
  description: string;
  confidence: number;
}

// ==================== Client Config ====================

export interface OpenAiClientConfig {
  apiKey: string;
  /** Organization ID (optional) */
  organizationId?: string;
  /** Project ID (optional) */
  projectId?: string;
  /** Override base URL (for Azure OpenAI, proxies, etc.) */
  baseUrl?: string;
  /** Request timeout in ms (default: 60000) */
  timeout?: number;
}
