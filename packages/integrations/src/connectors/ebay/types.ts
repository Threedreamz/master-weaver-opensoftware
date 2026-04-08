// ==================== eBay API Types ====================
// RESTful API — OAuth2 authentication

/** eBay marketplace global IDs */
export type EbayMarketplaceId =
  | "EBAY_US"
  | "EBAY_GB"
  | "EBAY_DE"
  | "EBAY_AU"
  | "EBAY_AT"
  | "EBAY_CA"
  | "EBAY_CH"
  | "EBAY_ES"
  | "EBAY_FR"
  | "EBAY_IT"
  | "EBAY_NL"
  | string;

/** Item condition */
export type EbayCondition =
  | "NEW"
  | "LIKE_NEW"
  | "NEW_OTHER"
  | "NEW_WITH_DEFECTS"
  | "MANUFACTURER_REFURBISHED"
  | "SELLER_REFURBISHED"
  | "USED_EXCELLENT"
  | "USED_VERY_GOOD"
  | "USED_GOOD"
  | "USED_ACCEPTABLE"
  | "FOR_PARTS_OR_NOT_WORKING";

/** Order fulfillment status */
export type EbayOrderFulfillmentStatus =
  | "FULFILLED"
  | "IN_PROGRESS"
  | "NOT_STARTED";

/** Order payment status */
export type EbayPaymentStatus =
  | "FAILED"
  | "FULLY_REFUNDED"
  | "PAID"
  | "PARTIALLY_REFUNDED"
  | "PENDING";

/** Order cancel status */
export type EbayCancelStatus =
  | "NONE_REQUESTED"
  | "CANCEL_REQUESTED"
  | "CANCEL_PENDING"
  | "CANCEL_REJECTED"
  | "CANCEL_CLOSED";

// ==================== Inventory ====================

export interface EbayInventoryItem {
  sku: string;
  locale?: string;
  product: EbayProduct;
  condition?: EbayCondition;
  conditionDescription?: string;
  availability: EbayAvailability;
  packageWeightAndSize?: EbayPackageWeightAndSize;
}

export interface EbayProduct {
  title: string;
  description?: string;
  aspects?: Record<string, string[]>;
  brand?: string;
  mpn?: string;
  ean?: string[];
  upc?: string[];
  isbn?: string[];
  imageUrls?: string[];
  subtitle?: string;
}

export interface EbayAvailability {
  shipToLocationAvailability: {
    quantity: number;
    allocationByFormat?: {
      fixedPrice?: number;
      auction?: number;
    };
  };
}

export interface EbayPackageWeightAndSize {
  dimensions?: {
    height: number;
    length: number;
    width: number;
    unit: "INCH" | "FEET" | "CENTIMETER" | "METER";
  };
  weight?: {
    value: number;
    unit: "POUND" | "KILOGRAM" | "OUNCE" | "GRAM";
  };
  packageType?: string;
}

export interface EbayInventoryItemsResponse {
  href: string;
  limit: number;
  next?: string;
  offset: number;
  prev?: string;
  size: number;
  total: number;
  inventoryItems: EbayInventoryItem[];
}

// ==================== Orders ====================

export interface EbayOrder {
  orderId: string;
  legacyOrderId?: string;
  creationDate: string;
  lastModifiedDate: string;
  orderFulfillmentStatus: EbayOrderFulfillmentStatus;
  orderPaymentStatus: EbayPaymentStatus;
  cancelStatus: {
    cancelState: EbayCancelStatus;
    cancelRequests?: Array<{
      cancelCompletedDate?: string;
      cancelInitiator?: string;
      cancelReason?: string;
      cancelRequestedDate?: string;
      cancelRequestId?: string;
    }>;
  };
  pricingSummary: {
    priceSubtotal: EbayAmount;
    deliveryCost?: EbayAmount;
    tax?: EbayAmount;
    total: EbayAmount;
    priceDiscount?: EbayAmount;
    adjustment?: EbayAmount;
  };
  buyer: {
    username: string;
    taxAddress?: EbayAddress;
  };
  lineItems: EbayLineItem[];
  fulfillmentStartInstructions?: EbayFulfillmentInstruction[];
  fulfillmentHrefs?: string[];
  salesRecordReference?: string;
}

export interface EbayLineItem {
  lineItemId: string;
  legacyItemId?: string;
  legacyVariationId?: string;
  sku?: string;
  title: string;
  quantity: number;
  lineItemCost: EbayAmount;
  deliveryCost?: {
    shippingCost?: EbayAmount;
    importCharges?: EbayAmount;
  };
  total: EbayAmount;
  lineItemFulfillmentStatus: EbayOrderFulfillmentStatus;
  soldFormat?: string;
  listingMarketplaceId?: string;
  purchaseMarketplaceId?: string;
  appliedPromotions?: Array<{
    promotionId: string;
    discountAmount: EbayAmount;
    description?: string;
  }>;
}

export interface EbayAmount {
  value: string;
  currency: string;
}

export interface EbayAddress {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateOrProvince?: string;
  postalCode?: string;
  countryCode?: string;
  county?: string;
}

export interface EbayFulfillmentInstruction {
  fulfillmentInstructionsType?: string;
  minEstimatedDeliveryDate?: string;
  maxEstimatedDeliveryDate?: string;
  shippingStep?: {
    shippingCarrierCode?: string;
    shippingServiceCode?: string;
    shipTo?: {
      fullName: string;
      contactAddress: EbayAddress;
      primaryPhone?: { phoneNumber: string };
      email?: string;
    };
  };
}

export interface EbayOrdersParams {
  filter?: string;
  limit?: number;
  offset?: number;
  orderIds?: string;
  fieldGroups?: string;
}

export interface EbayOrdersResponse {
  href: string;
  limit: number;
  next?: string;
  offset: number;
  prev?: string;
  total: number;
  orders: EbayOrder[];
}

// ==================== Catalog (Browse API) ====================

export interface EbayCatalogItem {
  itemId: string;
  title: string;
  shortDescription?: string;
  price: EbayAmount;
  categoryPath?: string;
  categoryIdPath?: string;
  condition?: string;
  conditionId?: string;
  image?: { imageUrl: string; height?: number; width?: number };
  additionalImages?: Array<{ imageUrl: string }>;
  itemLocation?: { postalCode?: string; country?: string; city?: string };
  seller?: { username: string; feedbackPercentage?: string; feedbackScore?: number };
  itemWebUrl?: string;
  estimatedAvailabilities?: Array<{
    deliveryOptions?: string[];
    estimatedAvailabilityStatus?: string;
    estimatedSoldQuantity?: number;
  }>;
  localizedAspects?: Array<{
    type: string;
    name: string;
    value: string;
  }>;
}

export interface EbayCatalogSearchParams {
  q?: string;
  category_ids?: string;
  filter?: string;
  sort?: string;
  limit?: number;
  offset?: number;
  aspect_filter?: string;
  fieldgroups?: string;
}

export interface EbayCatalogSearchResponse {
  href: string;
  limit: number;
  next?: string;
  offset: number;
  prev?: string;
  total: number;
  itemSummaries?: EbayCatalogItem[];
}

// ==================== Fulfillment ====================

export interface EbayShippingFulfillment {
  fulfillmentId?: string;
  lineItems: Array<{
    lineItemId: string;
    quantity: number;
  }>;
  shippedDate: string;
  shippingCarrierCode: string;
  trackingNumber: string;
}

export interface EbayShippingFulfillmentResponse {
  fulfillmentId: string;
  lineItems: Array<{
    lineItemId: string;
    quantity: number;
  }>;
  shipmentTrackingNumber: string;
  shippingCarrierCode: string;
  shippedDate: string;
}

// ==================== Webhook / Notifications ====================

export type EbayNotificationType =
  | "MARKETPLACE_ACCOUNT_DELETION"
  | "ITEM_SOLD"
  | "FIXED_PRICE_TRANSACTION"
  | "AUCTION_CHECKOUT_COMPLETE"
  | "ITEM_LISTED"
  | "ITEM_REVISED"
  | "ITEM_CLOSED";

export interface EbayNotification {
  metadata: {
    topic: EbayNotificationType;
    schemaVersion: string;
    deprecated: boolean;
  };
  notification: {
    notificationId: string;
    eventDate: string;
    publishDate: string;
    publishAttemptCount: number;
    data: Record<string, unknown>;
  };
}

// ==================== Client Config ====================

export interface EbayClientConfig {
  /** OAuth2 access token */
  accessToken: string;
  /** OAuth2 refresh token */
  refreshToken?: string;
  /** Application client ID */
  clientId: string;
  /** Application client secret */
  clientSecret: string;
  /** Redirect URI for OAuth */
  redirectUri?: string;
  /** Use sandbox environment */
  sandbox?: boolean;
  /** Default marketplace ID */
  marketplaceId?: EbayMarketplaceId;
  /** Request timeout in ms */
  timeout?: number;
}
