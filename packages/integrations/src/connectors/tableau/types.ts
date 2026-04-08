// ==================== Tableau REST API Types ====================
// Workbooks, Views, Datasources, Publish
// API key (personal access token) authentication

/** Tableau client configuration */
export interface TableauClientConfig {
  /** Personal access token name */
  tokenName: string;
  /** Personal access token value */
  tokenValue: string;
  /** Tableau site ID (content URL) */
  siteId: string;
  /** Tableau server base URL */
  serverUrl?: string;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Authentication ====================

export interface TableauAuthRequest {
  credentials: {
    personalAccessTokenName: string;
    personalAccessTokenSecret: string;
    site: {
      contentUrl: string;
    };
  };
}

export interface TableauAuthResponse {
  credentials: {
    site: { id: string; contentUrl: string };
    user: { id: string };
    token: string;
    estimatedTimeToExpiration?: string;
  };
}

// ==================== Workbooks ====================

export interface TableauWorkbook {
  id: string;
  name: string;
  description?: string;
  contentUrl: string;
  webpageUrl?: string;
  showTabs?: boolean;
  size?: number;
  createdAt: string;
  updatedAt: string;
  encryptExtracts?: string;
  defaultViewId?: string;
  project: { id: string; name: string };
  owner: { id: string; name?: string };
  tags?: { tag: { label: string }[] };
}

export interface TableauWorkbookListResponse {
  pagination: TableauPagination;
  workbooks: { workbook: TableauWorkbook[] };
}

// ==================== Views ====================

export interface TableauView {
  id: string;
  name: string;
  contentUrl: string;
  createdAt: string;
  updatedAt: string;
  workbook: { id: string };
  owner: { id: string };
  project?: { id: string };
  tags?: { tag: { label: string }[] };
  viewUrlName?: string;
}

export interface TableauViewListResponse {
  pagination: TableauPagination;
  views: { view: TableauView[] };
}

// ==================== Datasources ====================

export interface TableauDatasource {
  id: string;
  name: string;
  description?: string;
  contentUrl: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  encryptExtracts?: string;
  isCertified?: boolean;
  certificationNote?: string;
  hasExtracts?: boolean;
  useRemoteQueryAgent?: boolean;
  webpageUrl?: string;
  project: { id: string; name: string };
  owner: { id: string; name?: string };
  tags?: { tag: { label: string }[] };
}

export interface TableauDatasourceListResponse {
  pagination: TableauPagination;
  datasources: { datasource: TableauDatasource[] };
}

// ==================== Projects ====================

export interface TableauProject {
  id: string;
  name: string;
  description?: string;
  contentPermissions?: string;
  parentProjectId?: string;
  controllingPermissionsProjectId?: string;
  createdAt: string;
  updatedAt: string;
  owner: { id: string };
}

export interface TableauProjectListResponse {
  pagination: TableauPagination;
  projects: { project: TableauProject[] };
}

export interface TableauCreateProjectRequest {
  project: {
    name: string;
    description?: string;
    contentPermissions?: "ManagedByOwner" | "LockedToProject" | "LockedToProjectWithoutNested";
    parentProjectId?: string;
  };
}

// ==================== Users ====================

export interface TableauUser {
  id: string;
  name: string;
  fullName?: string;
  email?: string;
  siteRole: string;
  authSetting?: string;
  lastLogin?: string;
}

// ==================== Jobs ====================

export interface TableauJob {
  id: string;
  mode?: string;
  type?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  progress: number;
  finishCode?: number;
  notes?: string;
}

// ==================== Publish ====================

export interface TableauPublishWorkbookRequest {
  workbook: {
    name: string;
    project: { id: string };
    showTabs?: boolean;
    connectionCredentials?: {
      name: string;
      password: string;
      embed?: boolean;
    };
  };
}

export interface TableauPublishDatasourceRequest {
  datasource: {
    name: string;
    project: { id: string };
    connectionCredentials?: {
      name: string;
      password: string;
      embed?: boolean;
    };
  };
}

// ==================== Pagination ====================

export interface TableauPagination {
  pageNumber: string;
  pageSize: string;
  totalAvailable: string;
}

export interface TableauQueryParams {
  pageSize?: number;
  pageNumber?: number;
  filter?: string;
  sort?: string;
}
