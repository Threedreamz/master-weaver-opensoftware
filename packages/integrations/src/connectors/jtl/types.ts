// ==================== JTL-Wawi / JTL API Types ====================
// REST API — API key authentication

/** JTL article (Artikel) status */
export type JtlArticleStatus = "active" | "inactive" | "archived";

/** JTL order status */
export type JtlOrderStatus =
  | "new"
  | "in_progress"
  | "partially_shipped"
  | "shipped"
  | "completed"
  | "cancelled"
  | "returned";

/** JTL stock change type */
export type JtlStockChangeType = "inbound" | "outbound" | "correction" | "reservation";

// ==================== Articles (Artikel) ====================

export interface JtlArticle {
  id: number;
  articleNumber: string;
  name: string;
  description?: string;
  shortDescription?: string;
  ean?: string;
  isbn?: string;
  upc?: string;
  manufacturer?: string;
  manufacturerNumber?: string;
  status: JtlArticleStatus;
  weight?: number;
  weightUnit?: string;
  width?: number;
  height?: number;
  length?: number;
  dimensionUnit?: string;
  purchasePrice?: number;
  recommendedRetailPrice?: number;
  prices: JtlPrice[];
  taxClassId?: number;
  taxRate?: number;
  stockLevel?: number;
  minStockLevel?: number;
  stockManagement: boolean;
  categories?: JtlArticleCategory[];
  images?: JtlArticleImage[];
  attributes?: JtlArticleAttribute[];
  variations?: JtlArticleVariation[];
  createdAt: string;
  updatedAt: string;
}

export interface JtlPrice {
  id?: number;
  customerGroupId?: number;
  customerGroupName?: string;
  amount: number;
  currency: string;
  fromQuantity?: number;
}

export interface JtlArticleCategory {
  id: number;
  name: string;
  path?: string;
}

export interface JtlArticleImage {
  id: number;
  url: string;
  position: number;
  altText?: string;
}

export interface JtlArticleAttribute {
  id?: number;
  name: string;
  value: string;
  language?: string;
}

export interface JtlArticleVariation {
  id: number;
  articleNumber?: string;
  ean?: string;
  name: string;
  stockLevel?: number;
  prices: JtlPrice[];
  attributes: JtlArticleAttribute[];
  weight?: number;
  status: JtlArticleStatus;
}

export interface JtlArticlesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: JtlArticleStatus;
  categoryId?: number;
  modifiedSince?: string;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
}

export interface JtlArticlesResponse {
  items: JtlArticle[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ==================== Orders ====================

export interface JtlOrder {
  id: number;
  orderNumber: string;
  externalOrderNumber?: string;
  status: JtlOrderStatus;
  customerId?: number;
  customerEmail?: string;
  billingAddress: JtlAddress;
  shippingAddress: JtlAddress;
  orderDate: string;
  currency: string;
  subtotal: number;
  shippingCost: number;
  taxTotal: number;
  total: number;
  paymentMethod?: string;
  paymentStatus?: string;
  shippingMethod?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  note?: string;
  internalNote?: string;
  items: JtlOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface JtlOrderItem {
  id: number;
  articleId?: number;
  articleNumber?: string;
  name: string;
  sku?: string;
  ean?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  taxAmount: number;
  discount?: number;
}

export interface JtlAddress {
  company?: string;
  firstName: string;
  lastName: string;
  street: string;
  streetNumber?: string;
  additionalAddressLine?: string;
  postalCode: string;
  city: string;
  state?: string;
  countryCode: string;
  phone?: string;
  email?: string;
}

export interface JtlOrdersParams {
  page?: number;
  pageSize?: number;
  status?: JtlOrderStatus;
  customerId?: number;
  dateFrom?: string;
  dateTo?: string;
  modifiedSince?: string;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
}

export interface JtlOrdersResponse {
  items: JtlOrder[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ==================== Stock ====================

export interface JtlStockEntry {
  articleId: number;
  articleNumber?: string;
  warehouseId: number;
  warehouseName?: string;
  stockLevel: number;
  reservedStock: number;
  availableStock: number;
  reorderLevel?: number;
  lastUpdated: string;
}

export interface JtlStockUpdate {
  articleId: number;
  warehouseId: number;
  quantity: number;
  changeType: JtlStockChangeType;
  reason?: string;
  referenceNumber?: string;
}

export interface JtlStockParams {
  page?: number;
  pageSize?: number;
  warehouseId?: number;
  articleIds?: number[];
  belowReorderLevel?: boolean;
}

export interface JtlStockResponse {
  items: JtlStockEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// ==================== Customers ====================

export interface JtlCustomer {
  id: number;
  customerNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  billingAddress: JtlAddress;
  shippingAddresses?: JtlAddress[];
  customerGroupId?: number;
  customerGroupName?: string;
  taxId?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JtlCustomersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  customerGroupId?: number;
  modifiedSince?: string;
}

export interface JtlCustomersResponse {
  items: JtlCustomer[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ==================== Client Config ====================

export interface JtlClientConfig {
  /** JTL API base URL */
  apiUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Request timeout in ms */
  timeout?: number;
}
