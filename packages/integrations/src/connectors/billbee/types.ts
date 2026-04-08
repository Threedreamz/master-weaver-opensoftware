// ==================== Billbee API Types ====================
// REST API v1 — API key + Basic auth (API key + username/password)

/** Billbee order state */
export type BillbeeOrderState =
  | 1  // Ordered
  | 2  // Confirmed
  | 3  // Paid
  | 4  // Shipped
  | 5  // Reclamation
  | 6  // Deleted
  | 7  // Completed
  | 8  // Cancelled
  | 9  // Archived
  | 10 // Not yet confirmed
  | 11 // Payment pending
  | 12 // Draft
  | 13; // Returned

/** Billbee shipment carrier */
export type BillbeeCarrier =
  | "DHL"
  | "DPD"
  | "GLS"
  | "Hermes"
  | "UPS"
  | "FedEx"
  | "TNT"
  | "PostAT"
  | "PostCH"
  | "DeutschePost"
  | "AmazonLogistics"
  | "Other"
  | string;

// ==================== Orders ====================

export interface BillbeeOrder {
  Id: number;
  OrderNumber: string;
  State: BillbeeOrderState;
  VatMode: number;
  CreatedAt: string;
  ShippedAt?: string;
  ConfirmedAt?: string;
  PayedAt?: string;
  SellerComment?: string;
  Comments?: BillbeeComment[];
  InvoiceNumberPrefix?: string;
  InvoiceNumberPostfix?: string;
  InvoiceNumber?: number;
  InvoiceDate?: string;
  InvoiceAddress?: BillbeeAddress;
  ShippingAddress?: BillbeeAddress;
  PaymentMethod?: number;
  ShippingCost: number;
  TotalCost: number;
  OrderItems: BillbeeOrderItem[];
  Currency: string;
  Seller?: BillbeeSeller;
  Buyer?: BillbeeBuyer;
  UpdatedAt?: string;
  TaxRate1?: number;
  TaxRate2?: number;
  BillBeeOrderId?: number;
  BillBeeParentOrderId?: number;
  VatId?: string;
  Tags?: string[];
  ShipWeightKg?: number;
  LanguageCode?: string;
  PaidAmount?: number;
  ShippingProfileId?: string;
  ShippingProfileName?: string;
  ShippingProviderId?: number;
  ShippingProviderProductId?: number;
  ShippingProviderName?: string;
  ShippingProviderProductName?: string;
  PaymentReference?: string;
  PaymentTransactionId?: string;
  DeliverySourceCountryCode?: string;
  CustomInvoiceNote?: string;
}

export interface BillbeeOrderItem {
  BillbeeId: number;
  TransactionId?: string;
  Product?: BillbeeOrderProduct;
  Quantity: number;
  TotalPrice: number;
  TaxAmount?: number;
  TaxIndex?: number;
  Discount?: number;
  SerialNumber?: string;
}

export interface BillbeeOrderProduct {
  OldId?: string;
  Id?: string;
  Title?: string;
  Weight?: number;
  SKU?: string;
  SkuOrId?: string;
  IsDigital?: boolean;
  EAN?: string;
  PlatformData?: string;
  BillbeeId?: number;
  CountryOfOrigin?: string;
  HsCode?: string;
}

export interface BillbeeAddress {
  BillbeeId?: number;
  FirstName?: string;
  LastName?: string;
  Company?: string;
  NameAddition?: string;
  Street?: string;
  Housenumber?: string;
  Zip?: string;
  City?: string;
  State?: string;
  CountryISO2?: string;
  Country?: string;
  Phone?: string;
  Email?: string;
}

export interface BillbeeComment {
  Id: number;
  FromCustomer: boolean;
  Text: string;
  Name?: string;
  Created: string;
}

export interface BillbeeSeller {
  Platform?: string;
  BillbeeShopName?: string;
  BillbeeShopId?: number;
  Id?: string;
  Nick?: string;
  Email?: string;
}

export interface BillbeeBuyer {
  Platform?: string;
  BillbeeShopName?: string;
  BillbeeShopId?: number;
  Id?: string;
  Nick?: string;
  Email?: string;
}

export interface BillbeeOrdersParams {
  /** Minimum order date */
  minOrderDate?: string;
  /** Maximum order date */
  maxOrderDate?: string;
  /** Page number (1-based) */
  page?: number;
  /** Page size (max 250) */
  pageSize?: number;
  /** Filter by shop ID */
  shopId?: number;
  /** Filter by order state (comma-separated) */
  orderStateId?: BillbeeOrderState[];
  /** Filter by tag */
  tag?: string;
  /** Minimum last update date */
  minimumBillBeeOrderId?: number;
  /** Modified after date */
  modifiedAtMin?: string;
  /** Modified before date */
  modifiedAtMax?: string;
  /** Include article images */
  articleTitleSource?: number;
  /** Exclude tags */
  excludeTags?: boolean;
}

export interface BillbeeListResponse<T> {
  Paging: {
    Page: number;
    TotalPages: number;
    TotalRows: number;
    PageSize: number;
  };
  ErrorMessage?: string;
  ErrorCode?: number;
  Data: T[];
}

// ==================== Products ====================

export interface BillbeeProduct {
  Id?: number;
  Type?: number;
  Title?: string;
  ShortDescription?: string;
  Description?: string;
  BasicAttributes?: BillbeeProductAttribute[];
  Images?: BillbeeProductImage[];
  InvoiceText?: string;
  SKU?: string;
  EAN?: string;
  Manufacturer?: string;
  Weight?: number;
  WeightNet?: number;
  LowStock?: number;
  StockDesired?: number;
  StockCurrent?: number;
  StockWarning?: number;
  Price?: number;
  CostPrice?: number;
  Vat1Rate?: number;
  Vat2Rate?: number;
  VatIndex?: number;
  IsDigital?: boolean;
  IsCustomizable?: boolean;
  CountryOfOrigin?: string;
  HsCode?: string;
  TaricNumber?: string;
  Category1?: string;
  Category2?: string;
  Category3?: string;
  Unit?: number;
  UnitsPerItem?: number;
  SoldAmount?: number;
  SoldSumGross?: number;
  SoldSumNet?: number;
  SoldSumNetLast30Days?: number;
  SoldAmountLast30Days?: number;
  Tags?: string[];
  Sources?: BillbeeProductSource[];
  Stocks?: BillbeeProductStock[];
}

export interface BillbeeProductAttribute {
  Id?: string;
  Name?: string;
  Value?: string;
}

export interface BillbeeProductImage {
  Url?: string;
  Id?: number;
  ThumbPathExt?: string;
  ThumbUrl?: string;
  Position?: number;
  IsDefault?: boolean;
  ExternalId?: string;
}

export interface BillbeeProductSource {
  Id?: number;
  Source?: string;
  SourceId?: string;
  ApiAccountName?: string;
  ApiAccountId?: number;
  ExportFactor?: number;
  StockSyncInactive?: boolean;
  StockSyncMin?: number;
  StockSyncMax?: number;
  UnitsPerItem?: number;
  Custom?: Record<string, unknown>;
}

export interface BillbeeProductStock {
  Name?: string;
  StockId?: number;
  StockCurrent?: number;
  StockWarning?: number;
  StockDesired?: number;
  UnfulfilledAmount?: number;
}

export interface BillbeeProductsParams {
  page?: number;
  pageSize?: number;
  minCreatedAt?: string;
  type?: number;
}

// ==================== Stock ====================

export interface BillbeeStockUpdate {
  /** Billbee product ID */
  ProductId: number;
  /** Stock ID (warehouse) - leave empty for default */
  StockId?: number;
  /** New absolute stock value */
  NewQuantity?: number;
  /** Relative adjustment (delta) */
  DeltaQuantity?: number;
  /** Reason for stock change */
  Reason?: string;
  /** Old stock quantity (for optimistic locking) */
  OldQuantity?: number;
}

export interface BillbeeStockUpdateResponse {
  ProductId: number;
  StockId: number;
  OldStock: number;
  CurrentStock: number;
  Message?: string;
}

// ==================== Shipments ====================

export interface BillbeeShipment {
  OrderId: number;
  ShippingId: string;
  ShippingProviderId?: number;
  ShippingProviderProductId?: number;
  ShippingCarrier?: BillbeeCarrier;
  TrackingUrl?: string;
  Comment?: string;
}

export interface BillbeeCreateShipmentParams {
  OrderId: number;
  ShippingId: string;
  ShippingProviderId?: number;
  ShippingProviderProductId?: number;
  Comment?: string;
  ChangeStateToSend?: boolean;
}

// ==================== Webhooks ====================

export type BillbeeWebhookEvent =
  | "order:created"
  | "order:stateChanged"
  | "order:paymentChanged"
  | "order:shipped"
  | "product:stockChanged"
  | string;

export interface BillbeeWebhook {
  Id?: string;
  WebHookUri: string;
  Secret: string;
  Description?: string;
  IsPaused: boolean;
  Filters: BillbeeWebhookEvent[];
  Headers?: Record<string, string>;
  Properties?: Record<string, string>;
}

export interface BillbeeWebhookPayload {
  /** The event type */
  event: BillbeeWebhookEvent;
  /** The payload body */
  body: Record<string, unknown>;
}

// ==================== Client Config ====================

export interface BillbeeClientConfig {
  /** Billbee API key */
  apiKey: string;
  /** Billbee account username (email) */
  username: string;
  /** Billbee account password */
  password: string;
  /** Request timeout in ms */
  timeout?: number;
}
