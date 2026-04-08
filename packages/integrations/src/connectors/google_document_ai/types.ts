// ==================== Google Document AI Types ====================

/** MIME types supported by Document AI */
export type DocumentAiMimeType =
  | "application/pdf"
  | "image/tiff"
  | "image/gif"
  | "image/jpeg"
  | "image/png"
  | "image/bmp"
  | "image/webp";

/** Provenance types for entity mentions */
export type ProvenanceType = "OPERATION_TYPE_UNSPECIFIED" | "ADD" | "REMOVE" | "UPDATE" | "REPLACE" | "EVAL_REQUESTED" | "EVAL_APPROVED" | "EVAL_SKIPPED";

/** State of a batch processing operation */
export type BatchOperationState =
  | "STATE_UNSPECIFIED"
  | "RUNNING"
  | "CANCELLING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED";

// ==================== Document Structure ====================

export interface NormalizedVertex {
  x: number;
  y: number;
}

export interface BoundingPoly {
  vertices: Array<{ x: number; y: number }>;
  normalizedVertices: NormalizedVertex[];
}

export interface TextAnchor {
  textSegments: Array<{
    startIndex: string;
    endIndex: string;
  }>;
  content?: string;
}

export interface PageAnchor {
  pageRefs: Array<{
    page: string;
    layoutType?: string;
    layoutId?: string;
    boundingPoly?: BoundingPoly;
    confidence?: number;
  }>;
}

export interface DetectedLanguage {
  languageCode: string;
  confidence: number;
}

export interface Layout {
  textAnchor: TextAnchor;
  boundingPoly: BoundingPoly;
  orientation: "PAGE_UP" | "PAGE_RIGHT" | "PAGE_DOWN" | "PAGE_LEFT";
  confidence: number;
}

export interface PageToken {
  layout: Layout;
  detectedBreak?: { type: "SPACE" | "WIDE_SPACE" | "HYPHEN" };
  detectedLanguages?: DetectedLanguage[];
  styleInfo?: {
    fontSize: number;
    fontWeight: number;
    fontType: string;
    bold: boolean;
    italic: boolean;
    underlined: boolean;
    strikeout: boolean;
    handwritten: boolean;
    backgroundColor?: { red: number; green: number; blue: number };
    textColor?: { red: number; green: number; blue: number };
  };
}

export interface PageLine {
  layout: Layout;
  detectedLanguages?: DetectedLanguage[];
}

export interface PageParagraph {
  layout: Layout;
  detectedLanguages?: DetectedLanguage[];
}

export interface PageBlock {
  layout: Layout;
  detectedLanguages?: DetectedLanguage[];
}

export interface TableCell {
  layout: Layout;
  rowSpan: number;
  colSpan: number;
  detectedLanguages?: DetectedLanguage[];
}

export interface TableRow {
  cells: TableCell[];
}

export interface PageTable {
  layout: Layout;
  headerRows: TableRow[];
  bodyRows: TableRow[];
  detectedLanguages?: DetectedLanguage[];
}

export interface FormField {
  fieldName: Layout;
  fieldValue: Layout;
  nameDetectedLanguages?: DetectedLanguage[];
  valueDetectedLanguages?: DetectedLanguage[];
  valueType: "unfilled_checkbox" | "filled_checkbox" | "plain_text";
  correctedKeyText?: string;
  correctedValueText?: string;
  provenance?: { type: ProvenanceType };
}

export interface Page {
  pageNumber: number;
  dimension: { width: number; height: number; unit: string };
  layout: Layout;
  detectedLanguages: DetectedLanguage[];
  blocks: PageBlock[];
  paragraphs: PageParagraph[];
  lines: PageLine[];
  tokens: PageToken[];
  tables: PageTable[];
  formFields: FormField[];
  image?: { content: string; mimeType: string; width: number; height: number };
  transforms?: Array<{ rows: number; cols: number; type: number; data: number[] }>;
  provenance?: { type: ProvenanceType };
}

// ==================== Entity Extraction ====================

export interface Entity {
  textAnchor?: TextAnchor;
  type: string;
  mentionText: string;
  mentionId?: string;
  confidence: number;
  pageAnchor?: PageAnchor;
  id: string;
  normalizedValue?: NormalizedValue;
  properties?: Entity[];
  provenance?: { type: ProvenanceType };
  redacted: boolean;
}

export interface NormalizedValue {
  text?: string;
  moneyValue?: { currencyCode: string; units: string; nanos?: number };
  dateValue?: { year: number; month: number; day: number };
  datetimeValue?: {
    year: number; month: number; day: number;
    hours?: number; minutes?: number; seconds?: number;
    timeZone?: { id: string };
  };
  addressValue?: {
    regionCode?: string;
    languageCode?: string;
    postalCode?: string;
    administrativeArea?: string;
    locality?: string;
    addressLines?: string[];
  };
  booleanValue?: boolean;
  integerValue?: number;
  floatValue?: number;
  structuredValue?: Record<string, unknown>;
}

// ==================== Document ====================

export interface Document {
  uri?: string;
  content?: string;
  mimeType: string;
  text: string;
  pages: Page[];
  entities: Entity[];
  entityRelations: Array<{
    subjectId: string;
    objectId: string;
    relation: string;
  }>;
  textChanges?: Array<{
    textAnchor: TextAnchor;
    changedText: string;
    provenance?: { type: ProvenanceType };
  }>;
  error?: { code: number; message: string; details?: unknown[] };
}

// ==================== Process Request / Response ====================

export interface RawDocumentInput {
  /** Base64-encoded document content */
  content: string;
  mimeType: DocumentAiMimeType;
  displayName?: string;
}

export interface GcsDocumentInput {
  gcsUri: string;
  mimeType: DocumentAiMimeType;
}

export interface ProcessRequest {
  /** Inline document content */
  rawDocument?: RawDocumentInput;
  /** GCS-based document */
  gcsDocument?: GcsDocumentInput;
  /** Skip human review (if configured) */
  skipHumanReview?: boolean;
  /** Field mask to limit returned fields */
  fieldMask?: string;
  /** Process options */
  processOptions?: {
    ocrConfig?: {
      enableNativePdfParsing?: boolean;
      enableImageQualityScores?: boolean;
      advancedOcrOptions?: string[];
      enableSymbol?: boolean;
      premiumFeatures?: { computeStyleInfo?: boolean };
    };
    schemaOverride?: {
      description?: string;
      displayName?: string;
      metadata?: Record<string, string>;
      entityTypes?: Array<{
        type: string;
        baseTypes?: string[];
        properties?: Array<{
          name: string;
          valueType: string;
          occurrenceType: "OPTIONAL_ONCE" | "OPTIONAL_MULTIPLE" | "REQUIRED_ONCE" | "REQUIRED_MULTIPLE";
        }>;
        enumValues?: string[];
      }>;
    };
  };
}

export interface ProcessResponse {
  document: Document;
  humanReviewStatus?: {
    state: "STATE_UNSPECIFIED" | "SKIPPED" | "VALIDATION_PASSED" | "IN_PROGRESS" | "ERROR";
    stateMessage?: string;
    humanReviewOperation?: string;
  };
}

// ==================== Batch Process ====================

export interface BatchDocumentInput {
  gcsPrefix?: { gcsUriPrefix: string };
  gcsDocuments?: {
    documents: Array<{ gcsUri: string; mimeType: DocumentAiMimeType }>;
  };
}

export interface BatchOutputConfig {
  gcsOutputConfig: {
    gcsUri: string;
    fieldMask?: string;
    shardingConfig?: { pagesPerShard: number; pagesOverlap?: number };
  };
}

export interface BatchProcessRequest {
  inputDocuments: BatchDocumentInput;
  documentOutputConfig: BatchOutputConfig;
  skipHumanReview?: boolean;
  processOptions?: ProcessRequest["processOptions"];
}

export interface BatchProcessOperation {
  name: string;
  metadata: {
    "@type": string;
    state: BatchOperationState;
    createTime: string;
    updateTime: string;
    individualProcessStatuses?: Array<{
      inputGcsSource: string;
      status: { code: number; message?: string };
      outputGcsDestination: string;
      humanReviewStatus?: ProcessResponse["humanReviewStatus"];
    }>;
  };
  done: boolean;
  error?: { code: number; message: string };
  response?: { "@type": string };
}

// ==================== Client Config ====================

export interface DocumentAiClientConfig {
  /** GCP project ID */
  projectId: string;
  /** Processor location (e.g., "eu", "us") */
  location: string;
  /** Processor ID to use for processing */
  processorId: string;
  /** OAuth2 access token (use OAuthManager to obtain) */
  accessToken: string;
  /** Override endpoint URL */
  endpoint?: string;
  /** Request timeout in ms (default: 120000) */
  timeout?: number;
}
