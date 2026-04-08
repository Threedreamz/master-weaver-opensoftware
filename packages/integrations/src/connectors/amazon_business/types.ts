// ==================== Amazon Business API Types ====================
// Purchase orders, invoices, spending reports
// OAuth2 authentication

/** Amazon Business client configuration */
export interface AmazonBusinessClientConfig {
  /** OAuth2 access token */
  accessToken: string;
  /** Amazon Business marketplace ID */
  marketplaceId?: string;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Purchase Orders ====================

export interface AmazonBusinessPurchaseOrder {
  purchaseOrderId: string;
  purchaseOrderNumber?: string;
  status: AmazonBusinessOrderStatus;
  orderDate: string;
  totalAmount: AmazonBusinessMoney;
  shippingAddress?: AmazonBusinessAddress;
  buyer?: AmazonBusinessBuyer;
  items: AmazonBusinessOrderItem[];
  paymentMethod?: string;
  approvalStatus?: string;
  approvedBy?: string;
  costCenter?: string;
  department?: string;
  createdAt: string;
  updatedAt: string;
}

export type AmazonBusinessOrderStatus =
  | "pending_approval"
  | "approved"
  | "ordered"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned"
  | "partially_delivered";

export interface AmazonBusinessOrderItem {
  itemId: string;
  asin?: string;
  title: string;
  quantity: number;
  unitPrice: AmazonBusinessMoney;
  totalPrice: AmazonBusinessMoney;
  status?: string;
  deliveryDate?: string;
  trackingNumber?: string;
  category?: string;
}

export interface AmazonBusinessMoney {
  amount: number;
  currencyCode: string;
}

export interface AmazonBusinessAddress {
  name?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateOrRegion?: string;
  postalCode?: string;
  countryCode?: string;
}

export interface AmazonBusinessBuyer {
  buyerId: string;
  name: string;
  email?: string;
  department?: string;
  costCenter?: string;
}

export interface AmazonBusinessOrderListParams {
  status?: AmazonBusinessOrderStatus;
  fromDate?: string;
  toDate?: string;
  buyerId?: string;
  costCenter?: string;
  department?: string;
  page?: number;
  pageSize?: number;
}

// ==================== Invoices ====================

export interface AmazonBusinessInvoice {
  invoiceId: string;
  purchaseOrderId: string;
  invoiceNumber?: string;
  invoiceDate: string;
  dueDate?: string;
  totalAmount: AmazonBusinessMoney;
  taxAmount?: AmazonBusinessMoney;
  status: AmazonBusinessInvoiceStatus;
  seller?: AmazonBusinessSeller;
  lineItems: AmazonBusinessInvoiceLineItem[];
  pdfUrl?: string;
  createdAt: string;
}

export type AmazonBusinessInvoiceStatus =
  | "pending"
  | "paid"
  | "overdue"
  | "disputed"
  | "cancelled"
  | "credited";

export interface AmazonBusinessSeller {
  sellerId: string;
  name: string;
  taxId?: string;
  address?: AmazonBusinessAddress;
}

export interface AmazonBusinessInvoiceLineItem {
  itemId: string;
  description: string;
  quantity: number;
  unitPrice: AmazonBusinessMoney;
  totalPrice: AmazonBusinessMoney;
  taxRate?: number;
  taxAmount?: AmazonBusinessMoney;
  asin?: string;
}

export interface AmazonBusinessInvoiceListParams {
  purchaseOrderId?: string;
  status?: AmazonBusinessInvoiceStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

// ==================== Spending Reports ====================

export interface AmazonBusinessSpendingReport {
  reportId: string;
  reportType: AmazonBusinessReportType;
  status: "pending" | "processing" | "completed" | "failed";
  fromDate: string;
  toDate: string;
  generatedAt?: string;
  downloadUrl?: string;
  summary?: AmazonBusinessSpendingSummary;
}

export type AmazonBusinessReportType =
  | "spending_by_department"
  | "spending_by_cost_center"
  | "spending_by_category"
  | "spending_by_buyer"
  | "spending_by_seller"
  | "spending_over_time"
  | "detailed_transactions";

export interface AmazonBusinessSpendingSummary {
  totalSpend: AmazonBusinessMoney;
  orderCount: number;
  averageOrderValue: AmazonBusinessMoney;
  topCategories?: { category: string; amount: AmazonBusinessMoney }[];
  topDepartments?: { department: string; amount: AmazonBusinessMoney }[];
}

export interface AmazonBusinessCreateReportRequest {
  reportType: AmazonBusinessReportType;
  fromDate: string;
  toDate: string;
  filters?: {
    departments?: string[];
    costCenters?: string[];
    buyers?: string[];
    categories?: string[];
  };
}

// ==================== Groups & Users ====================

export interface AmazonBusinessGroup {
  groupId: string;
  name: string;
  type: "department" | "cost_center" | "custom";
  parentGroupId?: string;
  memberCount?: number;
  spendingLimit?: AmazonBusinessMoney;
}

export interface AmazonBusinessUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  costCenter?: string;
  spendingLimit?: AmazonBusinessMoney;
  isActive: boolean;
}

// ==================== Pagination ====================

export interface AmazonBusinessPagedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    nextPageToken?: string;
  };
}
