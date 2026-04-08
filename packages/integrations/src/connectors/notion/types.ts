// ==================== Notion API Types ====================
// OAuth2 authentication. Database CRUD, page creation and querying.

/** Notion rich text object. */
export interface NotionRichText {
  type: "text";
  text: {
    content: string;
    link?: { url: string } | null;
  };
  plain_text?: string;
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
    color?: string;
  };
}

/** Notion property value types used when creating/updating pages. */
export type NotionPropertyValue =
  | { type: "title"; title: NotionRichText[] }
  | { type: "rich_text"; rich_text: NotionRichText[] }
  | { type: "number"; number: number | null }
  | { type: "select"; select: { name: string } | null }
  | { type: "multi_select"; multi_select: Array<{ name: string }> }
  | { type: "date"; date: { start: string; end?: string } | null }
  | { type: "checkbox"; checkbox: boolean }
  | { type: "url"; url: string | null }
  | { type: "email"; email: string | null }
  | { type: "phone_number"; phone_number: string | null }
  | { type: "status"; status: { name: string } | null };

/** Notion page object. */
export interface NotionPage {
  id: string;
  object: "page";
  created_time: string;
  last_edited_time: string;
  archived: boolean;
  url: string;
  properties: Record<string, NotionPropertyValue>;
  parent:
    | { type: "database_id"; database_id: string }
    | { type: "page_id"; page_id: string }
    | { type: "workspace"; workspace: true };
}

/** Notion database object. */
export interface NotionDatabase {
  id: string;
  object: "database";
  title: NotionRichText[];
  description: NotionRichText[];
  created_time: string;
  last_edited_time: string;
  archived: boolean;
  url: string;
  properties: Record<string, NotionDatabaseProperty>;
}

/** Notion database property schema. */
export interface NotionDatabaseProperty {
  id: string;
  name: string;
  type: string;
  [key: string]: unknown;
}

/** Notion paginated list response. */
export interface NotionListResponse<T> {
  object: "list";
  results: T[];
  has_more: boolean;
  next_cursor: string | null;
  type: string;
}

/** Filter for querying a Notion database. */
export interface NotionDatabaseFilter {
  /** Property name. */
  property: string;
  /** Filter condition — structure depends on property type. */
  [condition: string]: unknown;
}

/** Sort for querying a Notion database. */
export interface NotionDatabaseSort {
  property?: string;
  timestamp?: "created_time" | "last_edited_time";
  direction: "ascending" | "descending";
}

/** Parameters for querying a Notion database. */
export interface NotionQueryDatabaseParams {
  /** Optional filter object. */
  filter?: NotionDatabaseFilter | { or: NotionDatabaseFilter[] } | { and: NotionDatabaseFilter[] };
  /** Optional sorts. */
  sorts?: NotionDatabaseSort[];
  /** Pagination cursor. */
  start_cursor?: string;
  /** Page size (max 100). */
  page_size?: number;
}

/** Input for creating a page in a Notion database. */
export interface NotionCreatePageInput {
  /** Parent database ID. */
  databaseId: string;
  /** Property values keyed by property name. */
  properties: Record<string, NotionPropertyValue>;
}

/** Input for updating an existing Notion page. */
export interface NotionUpdatePageInput {
  /** Properties to update. */
  properties: Record<string, NotionPropertyValue>;
  /** Whether to archive the page. */
  archived?: boolean;
}

/** Configuration for the Notion connector. */
export interface NotionClientConfig {
  /** OAuth2 access token (internal integration token or OAuth token). */
  accessToken: string;
  /** Request timeout in ms. */
  timeout?: number;
}
