// ==================== Microsoft Power BI API Types ====================
// Datasets, Reports, Dashboards, Push rows
// OAuth2 authentication (Azure AD)

/** Power BI client configuration */
export interface PowerBIClientConfig {
  /** OAuth2 access token */
  accessToken: string;
  /** Optional group (workspace) ID — omit for "My Workspace" */
  groupId?: string;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Datasets ====================

export interface PowerBIDataset {
  id: string;
  name: string;
  addRowsAPIEnabled?: boolean;
  configuredBy?: string;
  isRefreshable?: boolean;
  isEffectiveIdentityRequired?: boolean;
  isEffectiveIdentityRolesRequired?: boolean;
  isOnPremGatewayRequired?: boolean;
  targetStorageMode?: string;
  createdDate?: string;
  webUrl?: string;
}

export interface PowerBIDatasetCreateRequest {
  name: string;
  defaultMode?: "Push" | "Streaming" | "PushStreaming" | "AsAzure" | "AsOnPrem";
  tables: PowerBITableDefinition[];
}

export interface PowerBITableDefinition {
  name: string;
  columns: PowerBIColumnDefinition[];
  measures?: PowerBIMeasureDefinition[];
}

export interface PowerBIColumnDefinition {
  name: string;
  dataType: "Int64" | "Double" | "Boolean" | "Datetime" | "String";
  formatString?: string;
}

export interface PowerBIMeasureDefinition {
  name: string;
  expression: string;
}

export interface PowerBIRefreshRequest {
  notifyOption?: "NoNotification" | "MailOnFailure" | "MailOnCompletion";
}

export interface PowerBIRefreshHistoryEntry {
  requestId: string;
  id: number;
  refreshType: string;
  startTime: string;
  endTime?: string;
  status: "Unknown" | "Completed" | "Failed" | "Cancelled" | "Disabled";
  serviceExceptionJson?: string;
}

// ==================== Reports ====================

export interface PowerBIReport {
  id: string;
  name: string;
  datasetId?: string;
  webUrl?: string;
  embedUrl?: string;
  reportType?: string;
  isFromPbix?: boolean;
}

export interface PowerBIExportRequest {
  format: "PDF" | "PPTX" | "PNG";
  powerBIReportConfiguration?: {
    pages?: { pageName: string }[];
    defaultBookmark?: { name?: string; state?: string };
  };
}

export interface PowerBIExportStatus {
  id: string;
  createdDateTime: string;
  lastActionDateTime: string;
  reportId: string;
  reportName: string;
  status: "Undefined" | "NotStarted" | "Running" | "Succeeded" | "Failed";
  percentComplete: number;
  resourceLocation?: string;
  resourceFileExtension?: string;
  expirationTime?: string;
}

// ==================== Dashboards ====================

export interface PowerBIDashboard {
  id: string;
  displayName: string;
  isReadOnly?: boolean;
  webUrl?: string;
  embedUrl?: string;
  dataClassification?: string;
}

export interface PowerBITile {
  id: string;
  title?: string;
  subTitle?: string;
  embedUrl?: string;
  embedData?: string;
  rowSpan?: number;
  colSpan?: number;
  reportId?: string;
  datasetId?: string;
}

// ==================== Push Rows ====================

export interface PowerBIPushRowsRequest {
  rows: Record<string, unknown>[];
}

// ==================== Gateways ====================

export interface PowerBIGateway {
  id: string;
  name: string;
  type: string;
  publicKey?: { exponent: string; modulus: string };
}

// ==================== Embed Token ====================

export interface PowerBIEmbedTokenRequest {
  accessLevel?: "View" | "Edit" | "Create";
  allowSaveAs?: boolean;
  identities?: PowerBIEffectiveIdentity[];
  lifetimeInMinutes?: number;
}

export interface PowerBIEffectiveIdentity {
  username: string;
  roles?: string[];
  datasets: string[];
}

export interface PowerBIEmbedToken {
  token: string;
  tokenId: string;
  expiration: string;
}

// ==================== List Responses ====================

export interface PowerBIListResponse<T> {
  value: T[];
}
