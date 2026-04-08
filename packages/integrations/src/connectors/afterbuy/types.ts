// ==================== Afterbuy API Types ====================
// XML/REST API — API key authentication (Partner ID + Account Token)

/** Afterbuy product listing type */
export type AfterbuySellType = "auction" | "fixed_price" | "store";

/** Afterbuy order status */
export type AfterbuyOrderStatus =
  | "new"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled"
  | "returned";

/** Afterbuy payment status */
export type AfterbuyPaymentStatus = "unpaid" | "paid" | "partially_paid" | "refunded";

// ==================== Products ====================

export interface AfterbuyProduct {
  productId: number;
  anr: number; // Afterbuy article number
  ean?: string;
  name: string;
  description?: string;
  shortDescription?: string;
  manufacturer?: string;
  manufacturerPartNumber?: string;
  quantity: number;
  price: number;
  buyingPrice?: number;
  dealerPrice?: number;
  taxRate: number;
  weight?: number;
  imageSmallUrl?: string;
  imageLargeUrl?: string;
  additionalImages?: string[];
  freeValue1?: string;
  freeValue2?: string;
  freeValue3?: string;
  freeValue4?: string;
  freeValue5?: string;
  freeValue6?: string;
  freeValue7?: string;
  freeValue8?: string;
  freeValue9?: string;
  freeValue10?: string;
  categories?: AfterbuyCategory[];
  attributes?: AfterbuyAttribute[];
  variants?: AfterbuyVariant[];
  lastModified?: string;
}

export interface AfterbuyCategory {
  categoryId: number;
  categoryName: string;
  categoryPath?: string;
}

export interface AfterbuyAttribute {
  name: string;
  value: string;
  position?: number;
}

export interface AfterbuyVariant {
  variationId: number;
  name: string;
  value: string;
  quantity: number;
  price?: number;
  ean?: string;
  sku?: string;
}

export interface AfterbuyProductsParams {
  /** Maximum number of products to return */
  maxProducts?: number;
  /** Return products modified after this date (YYYY-MM-DD HH:MM:SS) */
  lastModifiedFrom?: string;
  /** Return products modified before this date */
  lastModifiedTo?: string;
  /** Filter by product IDs */
  productIds?: number[];
  /** Filter by ANR (Afterbuy article numbers) */
  anrs?: number[];
  /** Page number for pagination */
  page?: number;
  /** Only return active products */
  onlyActiveProducts?: boolean;
}

export interface AfterbuyProductsResponse {
  products: AfterbuyProduct[];
  totalCount: number;
  hasMoreProducts: boolean;
  lastProductId?: number;
}

// ==================== Orders ====================

export interface AfterbuyOrder {
  orderId: number;
  orderDate: string;
  buyerEmail?: string;
  buyerNote?: string;
  sellerNote?: string;
  status: AfterbuyOrderStatus;
  paymentStatus: AfterbuyPaymentStatus;
  paymentMethod?: string;
  paymentDate?: string;
  shippingMethod?: string;
  shippingDate?: string;
  trackingNumber?: string;
  billingAddress: AfterbuyAddress;
  shippingAddress: AfterbuyAddress;
  items: AfterbuyOrderItem[];
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  total: number;
  currency: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  lastModified: string;
}

export interface AfterbuyOrderItem {
  itemId: number;
  productId?: number;
  anr?: number;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  sku?: string;
  ean?: string;
}

export interface AfterbuyAddress {
  company?: string;
  firstName: string;
  lastName: string;
  street: string;
  street2?: string;
  postalCode: string;
  city: string;
  stateOrProvince?: string;
  countryCode: string;
  phone?: string;
  email?: string;
}

export interface AfterbuyOrdersParams {
  /** Maximum number of orders to return */
  maxOrders?: number;
  /** Orders created after this date */
  dateFrom?: string;
  /** Orders created before this date */
  dateTo?: string;
  /** Filter by order IDs */
  orderIds?: number[];
  /** Filter by status */
  status?: AfterbuyOrderStatus;
  /** Page number */
  page?: number;
}

export interface AfterbuyOrdersResponse {
  orders: AfterbuyOrder[];
  totalCount: number;
  hasMoreOrders: boolean;
}

// ==================== Stock ====================

export interface AfterbuyStockUpdate {
  productId?: number;
  anr?: number;
  /** New absolute stock quantity */
  quantity?: number;
  /** Relative stock adjustment (+/- value) */
  quantityAdjustment?: number;
}

export interface AfterbuyStockUpdateResponse {
  success: boolean;
  productId: number;
  newQuantity: number;
  errorMessage?: string;
}

// ==================== Client Config ====================

export interface AfterbuyClientConfig {
  /** Afterbuy Partner ID */
  partnerId: string;
  /** Afterbuy Account Token */
  accountToken: string;
  /** Afterbuy User ID (optional, for some endpoints) */
  userId?: string;
  /** Use sandbox environment */
  sandbox?: boolean;
  /** Request timeout in ms */
  timeout?: number;
}
