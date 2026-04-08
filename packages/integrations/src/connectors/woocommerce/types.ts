// ==================== WooCommerce REST API Types ====================
// REST API v3 — Basic auth (consumer key/secret)

/** WooCommerce product status */
export type WooProductStatus = "draft" | "pending" | "private" | "publish" | "any";

/** WooCommerce product type */
export type WooProductType = "simple" | "grouped" | "external" | "variable";

/** WooCommerce order status */
export type WooOrderStatus =
  | "pending"
  | "processing"
  | "on-hold"
  | "completed"
  | "cancelled"
  | "refunded"
  | "failed"
  | "trash"
  | "any";

/** WooCommerce tax status */
export type WooTaxStatus = "taxable" | "shipping" | "none";

/** WooCommerce stock status */
export type WooStockStatus = "instock" | "outofstock" | "onbackorder";

// ==================== Products ====================

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  permalink?: string;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  type: WooProductType;
  status: WooProductStatus;
  featured: boolean;
  catalog_visibility: "visible" | "catalog" | "search" | "hidden";
  description?: string;
  short_description?: string;
  sku?: string;
  price: string;
  regular_price: string;
  sale_price?: string;
  date_on_sale_from?: string;
  date_on_sale_to?: string;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  tax_status: WooTaxStatus;
  tax_class?: string;
  manage_stock: boolean;
  stock_quantity?: number;
  stock_status: WooStockStatus;
  backorders: "no" | "notify" | "yes";
  backorders_allowed: boolean;
  backordered: boolean;
  sold_individually: boolean;
  weight?: string;
  dimensions?: WooDimensions;
  shipping_required: boolean;
  shipping_taxable: boolean;
  shipping_class?: string;
  shipping_class_id?: number;
  reviews_allowed: boolean;
  average_rating: string;
  rating_count: number;
  parent_id: number;
  categories?: WooCategory[];
  tags?: WooTag[];
  images?: WooImage[];
  attributes?: WooAttribute[];
  variations?: number[];
  menu_order?: number;
  meta_data?: WooMetaData[];
}

export interface WooDimensions {
  length: string;
  width: string;
  height: string;
}

export interface WooCategory {
  id: number;
  name: string;
  slug: string;
}

export interface WooTag {
  id: number;
  name: string;
  slug: string;
}

export interface WooImage {
  id: number;
  date_created?: string;
  date_modified?: string;
  src: string;
  name?: string;
  alt?: string;
}

export interface WooAttribute {
  id: number;
  name: string;
  position: number;
  visible: boolean;
  variation: boolean;
  options: string[];
}

export interface WooMetaData {
  id?: number;
  key: string;
  value: unknown;
}

export interface WooProductsParams {
  page?: number;
  per_page?: number;
  search?: string;
  after?: string;
  before?: string;
  modified_after?: string;
  modified_before?: string;
  dates_are_gmt?: boolean;
  exclude?: number[];
  include?: number[];
  offset?: number;
  order?: "asc" | "desc";
  orderby?: "date" | "id" | "include" | "title" | "slug" | "price" | "popularity" | "rating";
  parent?: number[];
  parent_exclude?: number[];
  slug?: string;
  status?: WooProductStatus;
  type?: WooProductType;
  sku?: string;
  featured?: boolean;
  category?: string;
  tag?: string;
  on_sale?: boolean;
  min_price?: string;
  max_price?: string;
  stock_status?: WooStockStatus;
}

// ==================== Orders ====================

export interface WooOrder {
  id: number;
  parent_id: number;
  status: WooOrderStatus;
  currency: string;
  version?: string;
  prices_include_tax: boolean;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total: string;
  total_tax: string;
  customer_id: number;
  order_key?: string;
  billing: WooAddress;
  shipping: WooAddress;
  payment_method?: string;
  payment_method_title?: string;
  transaction_id?: string;
  customer_ip_address?: string;
  customer_note?: string;
  date_completed?: string;
  date_paid?: string;
  cart_hash?: string;
  number: string;
  line_items: WooLineItem[];
  tax_lines?: WooTaxLine[];
  shipping_lines?: WooShippingLine[];
  fee_lines?: WooFeeLine[];
  coupon_lines?: WooCouponLine[];
  refunds?: WooRefund[];
  meta_data?: WooMetaData[];
  date_completed_gmt?: string;
  date_paid_gmt?: string;
  currency_symbol?: string;
}

export interface WooLineItem {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  tax_class: string;
  subtotal: string;
  subtotal_tax: string;
  total: string;
  total_tax: string;
  taxes?: Array<{ id: number; total: string; subtotal: string }>;
  meta_data?: WooMetaData[];
  sku?: string;
  price: number;
  parent_name?: string;
}

export interface WooTaxLine {
  id: number;
  rate_code: string;
  rate_id: number;
  label: string;
  compound: boolean;
  tax_total: string;
  shipping_tax_total: string;
  rate_percent: number;
  meta_data?: WooMetaData[];
}

export interface WooShippingLine {
  id: number;
  method_title: string;
  method_id: string;
  instance_id?: string;
  total: string;
  total_tax: string;
  taxes?: Array<{ id: number; total: string }>;
  meta_data?: WooMetaData[];
}

export interface WooFeeLine {
  id: number;
  name: string;
  tax_class: string;
  tax_status: WooTaxStatus;
  amount: string;
  total: string;
  total_tax: string;
  taxes?: Array<{ id: number; total: string; subtotal: string }>;
  meta_data?: WooMetaData[];
}

export interface WooCouponLine {
  id: number;
  code: string;
  discount: string;
  discount_tax: string;
  meta_data?: WooMetaData[];
}

export interface WooRefund {
  id: number;
  reason: string;
  total: string;
}

export interface WooAddress {
  first_name?: string;
  last_name?: string;
  company?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  email?: string;
  phone?: string;
}

export interface WooOrdersParams {
  page?: number;
  per_page?: number;
  search?: string;
  after?: string;
  before?: string;
  modified_after?: string;
  modified_before?: string;
  exclude?: number[];
  include?: number[];
  offset?: number;
  order?: "asc" | "desc";
  orderby?: "date" | "id" | "include" | "title" | "slug";
  parent?: number[];
  parent_exclude?: number[];
  status?: WooOrderStatus;
  customer?: number;
  product?: number;
  dp?: number;
}

// ==================== Customers ====================

export interface WooCustomer {
  id: number;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  username: string;
  billing: WooAddress;
  shipping: WooAddress;
  is_paying_customer: boolean;
  avatar_url?: string;
  meta_data?: WooMetaData[];
  orders_count?: number;
  total_spent?: string;
}

export interface WooCustomersParams {
  page?: number;
  per_page?: number;
  search?: string;
  exclude?: number[];
  include?: number[];
  offset?: number;
  order?: "asc" | "desc";
  orderby?: "id" | "include" | "name" | "registered_date";
  email?: string;
  role?: string;
}

// ==================== Inventory ====================

export interface WooProductVariation {
  id: number;
  date_created: string;
  date_modified: string;
  description?: string;
  permalink?: string;
  sku?: string;
  price: string;
  regular_price: string;
  sale_price?: string;
  on_sale: boolean;
  status: WooProductStatus;
  purchasable: boolean;
  virtual: boolean;
  downloadable: boolean;
  tax_status: WooTaxStatus;
  tax_class?: string;
  manage_stock: boolean | "parent";
  stock_quantity?: number;
  stock_status: WooStockStatus;
  backorders: "no" | "notify" | "yes";
  weight?: string;
  dimensions?: WooDimensions;
  shipping_class?: string;
  image?: WooImage;
  attributes?: Array<{ id: number; name: string; option: string }>;
  menu_order: number;
  meta_data?: WooMetaData[];
}

// ==================== Webhooks ====================

export type WooWebhookTopic =
  | "order.created"
  | "order.updated"
  | "order.deleted"
  | "order.restored"
  | "product.created"
  | "product.updated"
  | "product.deleted"
  | "product.restored"
  | "customer.created"
  | "customer.updated"
  | "customer.deleted"
  | "coupon.created"
  | "coupon.updated"
  | "coupon.deleted"
  | string;

export interface WooWebhook {
  id: number;
  name: string;
  status: "active" | "paused" | "disabled";
  topic: WooWebhookTopic;
  resource: string;
  event: string;
  hooks?: string[];
  delivery_url: string;
  secret: string;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
}

export interface WooWebhookPayload {
  topic: WooWebhookTopic;
  resource: string;
  body: Record<string, unknown>;
}

// ==================== Client Config ====================

export interface WooCommerceClientConfig {
  /** WooCommerce store URL (e.g., "https://mystore.com") */
  storeUrl: string;
  /** Consumer key */
  consumerKey: string;
  /** Consumer secret */
  consumerSecret: string;
  /** API version (default: "wc/v3") */
  apiVersion?: string;
  /** Request timeout in ms */
  timeout?: number;
}
