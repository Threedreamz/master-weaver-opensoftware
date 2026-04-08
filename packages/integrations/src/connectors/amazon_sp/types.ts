// ==================== Amazon SP-API Types ====================
// Selling Partner API — OAuth2 (Login with Amazon)

/** Amazon marketplace identifiers */
export type AmazonMarketplaceId =
  | "ATVPDKIKX0DER"  // US
  | "A2EUQ1WTGCTBG2" // CA
  | "A1AM78C64UM0Y8"  // MX
  | "A1PA6795UKMFR9"  // DE
  | "A1RKKUPIHCS9HS"  // ES
  | "A13V1IB3VIYZZH"  // FR
  | "APJ6JRA9NG5V4"   // IT
  | "A1F83G8C2ARO7P"  // UK
  | "A21TJRUUN4KGV"   // IN
  | "A1VC38T7YXB528"  // JP
  | string;

/** Condition of a catalog item */
export type ItemCondition =
  | "New"
  | "Used"
  | "Collectible"
  | "Refurbished"
  | "Club";

/** Order status */
export type AmazonOrderStatus =
  | "Pending"
  | "Unshipped"
  | "PartiallyShipped"
  | "Shipped"
  | "InvoiceUnconfirmed"
  | "Canceled"
  | "Unfulfillable";

/** Fulfillment channel */
export type FulfillmentChannel = "AFN" | "MFN";

/** Feed processing status */
export type FeedProcessingStatus =
  | "CANCELLED"
  | "DONE"
  | "FATAL"
  | "IN_PROGRESS"
  | "IN_QUEUE";

/** Feed type */
export type FeedType =
  | "POST_PRODUCT_DATA"
  | "POST_INVENTORY_AVAILABILITY_DATA"
  | "POST_PRODUCT_PRICING_DATA"
  | "POST_ORDER_FULFILLMENT_DATA"
  | "POST_FLAT_FILE_INVLOADER_DATA"
  | string;

/** Report processing status */
export type ReportProcessingStatus =
  | "CANCELLED"
  | "DONE"
  | "FATAL"
  | "IN_PROGRESS"
  | "IN_QUEUE";

/** Report type */
export type ReportType =
  | "GET_FLAT_FILE_OPEN_LISTINGS_DATA"
  | "GET_MERCHANT_LISTINGS_ALL_DATA"
  | "GET_AFN_INVENTORY_DATA"
  | "GET_FLAT_FILE_ACTIONABLE_ORDER_DATA_SHIPPING"
  | "GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL"
  | string;

// ==================== Catalog Items ====================

export interface CatalogItem {
  asin: string;
  attributes?: Record<string, unknown>;
  identifiers?: ItemIdentifier[];
  images?: ItemImage[];
  productTypes?: ProductType[];
  salesRanks?: SalesRank[];
  summaries?: ItemSummary[];
  relationships?: ItemRelationship[];
}

export interface ItemIdentifier {
  marketplaceId: string;
  identifiers: Array<{
    identifierType: string;
    identifier: string;
  }>;
}

export interface ItemImage {
  marketplaceId: string;
  images: Array<{
    variant: string;
    link: string;
    height: number;
    width: number;
  }>;
}

export interface ProductType {
  marketplaceId: string;
  productType: string;
}

export interface SalesRank {
  marketplaceId: string;
  classificationRanks?: Array<{
    classificationId: string;
    title: string;
    rank: number;
  }>;
  displayGroupRanks?: Array<{
    websiteDisplayGroup: string;
    title: string;
    rank: number;
  }>;
}

export interface ItemSummary {
  marketplaceId: string;
  brandName?: string;
  browseClassification?: {
    displayName: string;
    classificationId: string;
  };
  color?: string;
  itemClassification?: string;
  itemName?: string;
  manufacturer?: string;
  modelNumber?: string;
  packageQuantity?: number;
  partNumber?: string;
  size?: string;
  style?: string;
  websiteDisplayGroup?: string;
  websiteDisplayGroupName?: string;
}

export interface ItemRelationship {
  marketplaceId: string;
  relationships: Array<{
    childAsins?: string[];
    parentAsins?: string[];
    type: string;
  }>;
}

export interface CatalogSearchParams {
  keywords?: string[];
  marketplaceIds: string[];
  includedData?: string[];
  brandNames?: string[];
  classificationIds?: string[];
  pageSize?: number;
  pageToken?: string;
  identifiers?: string[];
  identifiersType?: "ASIN" | "EAN" | "GTIN" | "ISBN" | "JAN" | "MINSAN" | "SKU" | "UPC";
}

export interface CatalogSearchResponse {
  numberOfResults: number;
  pagination?: { nextToken?: string; previousToken?: string };
  items: CatalogItem[];
}

// ==================== Inventory ====================

export interface InventorySummary {
  asin: string;
  fnSku: string;
  sellerSku: string;
  condition: string;
  inventoryDetails?: {
    fulfillableQuantity?: number;
    inboundWorkingQuantity?: number;
    inboundShippedQuantity?: number;
    inboundReceivingQuantity?: number;
    totalQuantity?: number;
    reservedQuantity?: {
      totalReservedQuantity?: number;
      pendingCustomerOrderQuantity?: number;
      pendingTransshipmentQuantity?: number;
      fcProcessingQuantity?: number;
    };
    researchingQuantity?: {
      totalResearchingQuantity?: number;
    };
    unfulfillableQuantity?: {
      totalUnfulfillableQuantity?: number;
      customerDamagedQuantity?: number;
      warehouseDamagedQuantity?: number;
      distributorDamagedQuantity?: number;
      carrierDamagedQuantity?: number;
      defectiveQuantity?: number;
      expiredQuantity?: number;
    };
  };
  lastUpdatedTime?: string;
  productName?: string;
  totalQuantity?: number;
}

export interface InventorySummariesParams {
  granularityType: "Marketplace";
  granularityId: string;
  marketplaceIds: string[];
  details?: boolean;
  startDateTime?: string;
  sellerSkus?: string[];
  nextToken?: string;
}

export interface InventorySummariesResponse {
  pagination?: { nextToken?: string };
  inventorySummaries: InventorySummary[];
  granularity: {
    granularityType: string;
    granularityId: string;
  };
}

// ==================== Orders ====================

export interface AmazonOrder {
  AmazonOrderId: string;
  SellerOrderId?: string;
  PurchaseDate: string;
  LastUpdateDate: string;
  OrderStatus: AmazonOrderStatus;
  FulfillmentChannel: FulfillmentChannel;
  SalesChannel?: string;
  ShipServiceLevel?: string;
  OrderTotal?: {
    CurrencyCode: string;
    Amount: string;
  };
  NumberOfItemsShipped?: number;
  NumberOfItemsUnshipped?: number;
  PaymentMethod?: string;
  PaymentMethodDetails?: string[];
  MarketplaceId: string;
  ShipmentServiceLevelCategory?: string;
  ShippingAddress?: AmazonAddress;
  BuyerInfo?: {
    BuyerEmail?: string;
    BuyerName?: string;
  };
  OrderType?: string;
  EarliestShipDate?: string;
  LatestShipDate?: string;
  EarliestDeliveryDate?: string;
  LatestDeliveryDate?: string;
  IsBusinessOrder?: boolean;
  IsPrime?: boolean;
  IsGlobalExpressEnabled?: boolean;
  IsPremiumOrder?: boolean;
  IsSoldByAB?: boolean;
  IsISPU?: boolean;
}

export interface AmazonOrderItem {
  ASIN: string;
  SellerSKU?: string;
  OrderItemId: string;
  Title?: string;
  QuantityOrdered: number;
  QuantityShipped: number;
  ItemPrice?: {
    CurrencyCode: string;
    Amount: string;
  };
  ItemTax?: {
    CurrencyCode: string;
    Amount: string;
  };
  PromotionDiscount?: {
    CurrencyCode: string;
    Amount: string;
  };
  IsGift?: boolean;
  ConditionId?: string;
  ConditionSubtypeId?: string;
  ConditionNote?: string;
}

export interface AmazonAddress {
  Name?: string;
  AddressLine1?: string;
  AddressLine2?: string;
  AddressLine3?: string;
  City?: string;
  County?: string;
  District?: string;
  StateOrRegion?: string;
  PostalCode?: string;
  CountryCode?: string;
  Phone?: string;
}

export interface OrdersParams {
  MarketplaceIds: string[];
  CreatedAfter?: string;
  CreatedBefore?: string;
  LastUpdatedAfter?: string;
  LastUpdatedBefore?: string;
  OrderStatuses?: AmazonOrderStatus[];
  FulfillmentChannels?: FulfillmentChannel[];
  MaxResultsPerPage?: number;
  NextToken?: string;
}

export interface OrdersResponse {
  Orders: AmazonOrder[];
  NextToken?: string;
  LastUpdatedBefore?: string;
  CreatedBefore?: string;
}

export interface OrderItemsResponse {
  OrderItems: AmazonOrderItem[];
  NextToken?: string;
  AmazonOrderId: string;
}

// ==================== Feeds ====================

export interface Feed {
  feedId: string;
  feedType: FeedType;
  marketplaceIds?: string[];
  createdTime: string;
  processingStatus: FeedProcessingStatus;
  processingStartTime?: string;
  processingEndTime?: string;
  resultFeedDocumentId?: string;
}

export interface CreateFeedParams {
  feedType: FeedType;
  marketplaceIds: string[];
  inputFeedDocumentId: string;
}

export interface CreateFeedDocumentParams {
  contentType: string;
}

export interface FeedDocument {
  feedDocumentId: string;
  url: string;
  compressionAlgorithm?: string;
}

export interface FeedsParams {
  feedTypes?: FeedType[];
  marketplaceIds?: string[];
  processingStatuses?: FeedProcessingStatus[];
  pageSize?: number;
  nextToken?: string;
  createdSince?: string;
  createdUntil?: string;
}

export interface FeedsResponse {
  feeds: Feed[];
  nextToken?: string;
}

// ==================== Reports ====================

export interface Report {
  reportId: string;
  reportType: ReportType;
  marketplaceIds?: string[];
  dataStartTime?: string;
  dataEndTime?: string;
  reportScheduleId?: string;
  createdTime: string;
  processingStatus: ReportProcessingStatus;
  processingStartTime?: string;
  processingEndTime?: string;
  reportDocumentId?: string;
}

export interface CreateReportParams {
  reportType: ReportType;
  marketplaceIds: string[];
  dataStartTime?: string;
  dataEndTime?: string;
  reportOptions?: Record<string, string>;
}

export interface ReportDocument {
  reportDocumentId: string;
  url: string;
  compressionAlgorithm?: string;
}

export interface ReportsParams {
  reportTypes?: ReportType[];
  processingStatuses?: ReportProcessingStatus[];
  marketplaceIds?: string[];
  pageSize?: number;
  nextToken?: string;
  createdSince?: string;
  createdUntil?: string;
}

export interface ReportsResponse {
  reports: Report[];
  nextToken?: string;
}

// ==================== Client Config ====================

export interface AmazonSpClientConfig {
  /** OAuth2 access token (Login with Amazon) */
  accessToken: string;
  /** OAuth2 refresh token */
  refreshToken?: string;
  /** LWA client ID */
  clientId: string;
  /** LWA client secret */
  clientSecret: string;
  /** AWS region endpoint: na, eu, fe */
  region?: "na" | "eu" | "fe";
  /** Request timeout in ms */
  timeout?: number;
}
