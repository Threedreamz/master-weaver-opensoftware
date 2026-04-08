// ==================== Shopify Admin API Types ====================
// REST Admin API — API key (X-Shopify-Access-Token)

/** Shopify product status */
export type ShopifyProductStatus = "active" | "archived" | "draft";

/** Shopify financial status */
export type ShopifyFinancialStatus =
  | "authorized"
  | "pending"
  | "paid"
  | "partially_paid"
  | "refunded"
  | "voided"
  | "partially_refunded"
  | "unpaid";

/** Shopify fulfillment status */
export type ShopifyFulfillmentStatus =
  | "fulfilled"
  | "partial"
  | "unfulfilled"
  | "restocked"
  | null;

/** Shopify order cancel reason */
export type ShopifyCancelReason =
  | "customer"
  | "fraud"
  | "inventory"
  | "declined"
  | "other"
  | null;

/** Shopify fulfillment event status */
export type ShopifyFulfillmentEventStatus =
  | "label_printed"
  | "label_purchased"
  | "attempted_delivery"
  | "ready_for_pickup"
  | "picked_up"
  | "confirmed"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failure";

// ==================== Products ====================

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  created_at: string;
  handle: string;
  updated_at: string;
  published_at?: string;
  template_suffix?: string;
  published_scope?: string;
  tags?: string;
  status: ShopifyProductStatus;
  admin_graphql_api_id?: string;
  variants: ShopifyVariant[];
  options: ShopifyProductOption[];
  images: ShopifyImage[];
  image?: ShopifyImage;
}

export interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;
  price: string;
  compare_at_price?: string;
  sku?: string;
  position: number;
  inventory_policy: "deny" | "continue";
  fulfillment_service?: string;
  inventory_management?: string;
  option1?: string;
  option2?: string;
  option3?: string;
  created_at: string;
  updated_at: string;
  taxable: boolean;
  barcode?: string;
  grams?: number;
  weight?: number;
  weight_unit?: string;
  inventory_item_id?: number;
  inventory_quantity?: number;
  old_inventory_quantity?: number;
  requires_shipping?: boolean;
  admin_graphql_api_id?: string;
  image_id?: number;
}

export interface ShopifyProductOption {
  id: number;
  product_id: number;
  name: string;
  position: number;
  values: string[];
}

export interface ShopifyImage {
  id: number;
  product_id?: number;
  position: number;
  created_at: string;
  updated_at: string;
  alt?: string;
  width: number;
  height: number;
  src: string;
  variant_ids?: number[];
  admin_graphql_api_id?: string;
}

export interface ShopifyProductsParams {
  ids?: string;
  limit?: number;
  since_id?: number;
  title?: string;
  vendor?: string;
  handle?: string;
  product_type?: string;
  collection_id?: number;
  status?: ShopifyProductStatus;
  created_at_min?: string;
  created_at_max?: string;
  updated_at_min?: string;
  updated_at_max?: string;
  published_at_min?: string;
  published_at_max?: string;
  fields?: string;
  page_info?: string;
}

// ==================== Inventory ====================

export interface ShopifyInventoryItem {
  id: number;
  sku?: string;
  created_at: string;
  updated_at: string;
  requires_shipping: boolean;
  cost?: string;
  country_code_of_origin?: string;
  province_code_of_origin?: string;
  harmonized_system_code?: string;
  tracked: boolean;
  country_harmonized_system_codes?: Array<{
    harmonized_system_code: string;
    country_code: string;
  }>;
  admin_graphql_api_id?: string;
}

export interface ShopifyInventoryLevel {
  inventory_item_id: number;
  location_id: number;
  available?: number;
  updated_at: string;
  admin_graphql_api_id?: string;
}

export interface ShopifyLocation {
  id: number;
  name: string;
  address1?: string;
  address2?: string;
  city?: string;
  zip?: string;
  province?: string;
  country?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  country_code?: string;
  country_name?: string;
  province_code?: string;
  legacy: boolean;
  active: boolean;
  admin_graphql_api_id?: string;
}

// ==================== Orders ====================

export interface ShopifyOrder {
  id: number;
  admin_graphql_api_id?: string;
  app_id?: number;
  browser_ip?: string;
  buyer_accepts_marketing?: boolean;
  cancel_reason?: ShopifyCancelReason;
  cancelled_at?: string;
  cart_token?: string;
  checkout_id?: number;
  checkout_token?: string;
  closed_at?: string;
  confirmation_number?: string;
  confirmed?: boolean;
  contact_email?: string;
  created_at: string;
  currency: string;
  current_subtotal_price?: string;
  current_total_discounts?: string;
  current_total_price?: string;
  current_total_tax?: string;
  customer_locale?: string;
  email?: string;
  estimated_taxes?: boolean;
  financial_status: ShopifyFinancialStatus;
  fulfillment_status: ShopifyFulfillmentStatus;
  gateway?: string;
  landing_site?: string;
  name: string;
  note?: string;
  note_attributes?: Array<{ name: string; value: string }>;
  number: number;
  order_number: number;
  order_status_url?: string;
  phone?: string;
  presentment_currency?: string;
  processed_at?: string;
  referring_site?: string;
  source_name?: string;
  source_url?: string;
  subtotal_price?: string;
  tags?: string;
  tax_lines?: ShopifyTaxLine[];
  taxes_included?: boolean;
  test?: boolean;
  token?: string;
  total_discounts?: string;
  total_line_items_price?: string;
  total_outstanding?: string;
  total_price: string;
  total_price_usd?: string;
  total_shipping_price_set?: ShopifyPriceSet;
  total_tax?: string;
  total_tip_received?: string;
  total_weight?: number;
  updated_at: string;
  customer?: ShopifyCustomer;
  discount_codes?: Array<{ code: string; amount: string; type: string }>;
  fulfillments?: ShopifyFulfillment[];
  line_items: ShopifyLineItem[];
  refunds?: ShopifyRefund[];
  shipping_address?: ShopifyAddress;
  billing_address?: ShopifyAddress;
  shipping_lines?: ShopifyShippingLine[];
}

export interface ShopifyLineItem {
  id: number;
  admin_graphql_api_id?: string;
  fulfillable_quantity: number;
  fulfillment_service?: string;
  fulfillment_status?: string;
  gift_card?: boolean;
  grams?: number;
  name: string;
  price: string;
  product_exists?: boolean;
  product_id?: number;
  quantity: number;
  requires_shipping?: boolean;
  sku?: string;
  taxable?: boolean;
  title: string;
  total_discount?: string;
  variant_id?: number;
  variant_inventory_management?: string;
  variant_title?: string;
  vendor?: string;
  tax_lines?: ShopifyTaxLine[];
  discount_allocations?: Array<{
    amount: string;
    discount_application_index: number;
  }>;
}

export interface ShopifyTaxLine {
  title: string;
  price: string;
  rate: number;
  channel_liable?: boolean;
}

export interface ShopifyPriceSet {
  shop_money: { amount: string; currency_code: string };
  presentment_money: { amount: string; currency_code: string };
}

export interface ShopifyAddress {
  first_name?: string;
  last_name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  country?: string;
  zip?: string;
  phone?: string;
  name?: string;
  province_code?: string;
  country_code?: string;
  country_name?: string;
  company?: string;
  latitude?: number;
  longitude?: number;
}

export interface ShopifyShippingLine {
  id: number;
  carrier_identifier?: string;
  code?: string;
  delivery_category?: string;
  discounted_price?: string;
  phone?: string;
  price: string;
  requested_fulfillment_service_id?: string;
  source?: string;
  title: string;
  tax_lines?: ShopifyTaxLine[];
  discount_allocations?: Array<{
    amount: string;
    discount_application_index: number;
  }>;
}

export interface ShopifyOrdersParams {
  ids?: string;
  limit?: number;
  since_id?: number;
  created_at_min?: string;
  created_at_max?: string;
  updated_at_min?: string;
  updated_at_max?: string;
  processed_at_min?: string;
  processed_at_max?: string;
  status?: "open" | "closed" | "cancelled" | "any";
  financial_status?: ShopifyFinancialStatus | "any";
  fulfillment_status?: "shipped" | "partial" | "unshipped" | "unfulfilled" | "any";
  fields?: string;
  page_info?: string;
}

// ==================== Customers ====================

export interface ShopifyCustomer {
  id: number;
  email?: string;
  accepts_marketing?: boolean;
  created_at: string;
  updated_at: string;
  first_name?: string;
  last_name?: string;
  orders_count: number;
  state: string;
  total_spent: string;
  last_order_id?: number;
  note?: string;
  verified_email?: boolean;
  multipass_identifier?: string;
  tax_exempt?: boolean;
  tags?: string;
  last_order_name?: string;
  currency?: string;
  phone?: string;
  addresses?: ShopifyAddress[];
  default_address?: ShopifyAddress;
  admin_graphql_api_id?: string;
}

export interface ShopifyCustomersParams {
  ids?: string;
  limit?: number;
  since_id?: number;
  created_at_min?: string;
  created_at_max?: string;
  updated_at_min?: string;
  updated_at_max?: string;
  fields?: string;
  page_info?: string;
}

// ==================== Fulfillments ====================

export interface ShopifyFulfillment {
  id: number;
  admin_graphql_api_id?: string;
  created_at: string;
  location_id?: number;
  name: string;
  order_id: number;
  receipt?: Record<string, unknown>;
  service?: string;
  shipment_status?: string;
  status: "pending" | "open" | "success" | "cancelled" | "error" | "failure";
  tracking_company?: string;
  tracking_number?: string;
  tracking_numbers?: string[];
  tracking_url?: string;
  tracking_urls?: string[];
  updated_at: string;
  line_items?: ShopifyLineItem[];
}

export interface ShopifyRefund {
  id: number;
  admin_graphql_api_id?: string;
  created_at: string;
  note?: string;
  order_id: number;
  processed_at: string;
  restock?: boolean;
  user_id?: number;
  refund_line_items?: Array<{
    id: number;
    line_item_id: number;
    quantity: number;
    restock_type: string;
    subtotal: string;
    total_tax: string;
    line_item?: ShopifyLineItem;
  }>;
}

export interface CreateFulfillmentParams {
  line_items_by_fulfillment_order: Array<{
    fulfillment_order_id: number;
    fulfillment_order_line_items?: Array<{
      id: number;
      quantity: number;
    }>;
  }>;
  tracking_info?: {
    company?: string;
    number?: string;
    url?: string;
  };
  notify_customer?: boolean;
  message?: string;
}

// ==================== Webhooks ====================

export type ShopifyWebhookTopic =
  | "orders/create"
  | "orders/updated"
  | "orders/paid"
  | "orders/cancelled"
  | "orders/fulfilled"
  | "orders/partially_fulfilled"
  | "products/create"
  | "products/update"
  | "products/delete"
  | "inventory_items/create"
  | "inventory_items/update"
  | "inventory_items/delete"
  | "inventory_levels/connect"
  | "inventory_levels/update"
  | "inventory_levels/disconnect"
  | "customers/create"
  | "customers/update"
  | "customers/delete"
  | "fulfillments/create"
  | "fulfillments/update"
  | "refunds/create"
  | "app/uninstalled"
  | string;

export interface ShopifyWebhookSubscription {
  id: number;
  address: string;
  topic: ShopifyWebhookTopic;
  created_at: string;
  updated_at: string;
  format: "json" | "xml";
  fields?: string[];
  metafield_namespaces?: string[];
  api_version: string;
}

export interface ShopifyWebhookPayload {
  /** The webhook topic */
  topic: ShopifyWebhookTopic;
  /** The shop domain */
  shopDomain: string;
  /** The raw payload body */
  body: Record<string, unknown>;
}

// ==================== Client Config ====================

export interface ShopifyClientConfig {
  /** The shop domain (e.g., "my-store.myshopify.com") */
  shopDomain: string;
  /** Admin API access token */
  accessToken: string;
  /** API version (e.g., "2024-01") */
  apiVersion?: string;
  /** Request timeout in ms */
  timeout?: number;
}
