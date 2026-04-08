// ==================== AWS Textract Types ====================

/** Supported feature types for AnalyzeDocument */
export type TextractFeatureType = "TABLES" | "FORMS" | "SIGNATURES" | "LAYOUT";

/** Block types returned by Textract */
export type BlockType =
  | "KEY_VALUE_SET"
  | "PAGE"
  | "LINE"
  | "WORD"
  | "TABLE"
  | "CELL"
  | "MERGED_CELL"
  | "SELECTION_ELEMENT"
  | "SIGNATURE"
  | "QUERY"
  | "QUERY_RESULT"
  | "TABLE_TITLE"
  | "TABLE_FOOTER"
  | "LAYOUT_TEXT"
  | "LAYOUT_TITLE"
  | "LAYOUT_HEADER"
  | "LAYOUT_FOOTER"
  | "LAYOUT_SECTION_HEADER"
  | "LAYOUT_PAGE_NUMBER"
  | "LAYOUT_LIST"
  | "LAYOUT_FIGURE"
  | "LAYOUT_TABLE"
  | "LAYOUT_KEY_VALUE";

export type EntityType = "KEY" | "VALUE" | "COLUMN_HEADER" | "TABLE_TITLE" | "TABLE_FOOTER" | "TABLE_SUMMARY" | "TABLE_SECTION_TITLE";

export type SelectionStatus = "SELECTED" | "NOT_SELECTED";

/** Entity type for expense analysis */
export type ExpenseType =
  | "VENDOR_NAME"
  | "VENDOR_ADDRESS"
  | "VENDOR_PHONE"
  | "RECEIVER_NAME"
  | "RECEIVER_ADDRESS"
  | "INVOICE_RECEIPT_ID"
  | "INVOICE_RECEIPT_DATE"
  | "DUE_DATE"
  | "PAYMENT_TERMS"
  | "SUBTOTAL"
  | "TAX"
  | "TOTAL"
  | "DISCOUNT"
  | "AMOUNT_PAID"
  | "AMOUNT_DUE"
  | "GRATUITY"
  | "CURRENCY_CODE"
  | "PO_NUMBER"
  | "ACCOUNT_NUMBER"
  | "OTHER";

// ==================== Geometry ====================

export interface BoundingBox {
  Width: number;
  Height: number;
  Left: number;
  Top: number;
}

export interface Point {
  X: number;
  Y: number;
}

export interface Geometry {
  BoundingBox: BoundingBox;
  Polygon: Point[];
}

// ==================== Document Input ====================

export interface S3Object {
  Bucket: string;
  Name: string;
  Version?: string;
}

export interface DocumentInput {
  /** Base64-encoded document bytes (max 10 MB) */
  Bytes?: string;
  S3Object?: S3Object;
}

// ==================== Block & Relationships ====================

export interface Relationship {
  Type: "VALUE" | "CHILD" | "COMPLEX_FEATURES" | "MERGED_CELL" | "TITLE" | "ANSWER" | "TABLE" | "TABLE_TITLE" | "TABLE_FOOTER";
  Ids: string[];
}

export interface Block {
  BlockType: BlockType;
  Confidence: number;
  Text?: string;
  TextType?: "HANDWRITING" | "PRINTED";
  RowIndex?: number;
  ColumnIndex?: number;
  RowSpan?: number;
  ColumnSpan?: number;
  Geometry: Geometry;
  Id: string;
  Relationships?: Relationship[];
  EntityTypes?: EntityType[];
  SelectionStatus?: SelectionStatus;
  Page?: number;
  Query?: { Text: string; Alias?: string };
}

// ==================== Key-Value Pair (extracted from blocks) ====================

export interface KeyValuePair {
  key: string;
  value: string;
  keyConfidence: number;
  valueConfidence: number;
  geometry: Geometry;
}

// ==================== Expense Analysis ====================

export interface ExpenseFieldType {
  Text: string;
  Confidence: number;
}

export interface ExpenseField {
  Type: ExpenseFieldType;
  LabelDetection?: {
    Text: string;
    Geometry: Geometry;
    Confidence: number;
  };
  ValueDetection: {
    Text: string;
    Geometry: Geometry;
    Confidence: number;
  };
  Currency?: {
    Code: string;
    Confidence: number;
  };
  GroupProperties?: Array<{
    Types: string[];
    Id: string;
  }>;
  PageNumber: number;
}

export interface LineItemField {
  Type: ExpenseFieldType;
  LabelDetection?: {
    Text: string;
    Geometry: Geometry;
    Confidence: number;
  };
  ValueDetection: {
    Text: string;
    Geometry: Geometry;
    Confidence: number;
  };
  PageNumber: number;
}

export interface LineItemGroup {
  LineItemGroupIndex: number;
  LineItems: Array<{
    LineItemExpenseFields: LineItemField[];
  }>;
}

export interface ExpenseDocument {
  ExpenseIndex: number;
  SummaryFields: ExpenseField[];
  LineItemGroups: LineItemGroup[];
  Blocks: Block[];
}

// ==================== Request / Response ====================

export interface AnalyzeDocumentRequest {
  Document: DocumentInput;
  FeatureTypes: TextractFeatureType[];
  QueriesConfig?: {
    Queries: Array<{ Text: string; Alias?: string; Pages?: string[] }>;
  };
}

export interface AnalyzeDocumentResponse {
  DocumentMetadata: {
    Pages: number;
  };
  Blocks: Block[];
  AnalyzeDocumentModelVersion: string;
}

export interface DetectDocumentTextRequest {
  Document: DocumentInput;
}

export interface DetectDocumentTextResponse {
  DocumentMetadata: {
    Pages: number;
  };
  Blocks: Block[];
  DetectDocumentTextModelVersion: string;
}

export interface AnalyzeExpenseRequest {
  Document: DocumentInput;
}

export interface AnalyzeExpenseResponse {
  DocumentMetadata: {
    Pages: number;
  };
  ExpenseDocuments: ExpenseDocument[];
}

// ==================== Client Config ====================

export interface TextractClientConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  sessionToken?: string;
  /** Override endpoint URL (for localstack/testing) */
  endpoint?: string;
  /** Request timeout in ms (default: 60000) */
  timeout?: number;
}
