// ── Shared ──────────────────────────────────────────────────────────────────

export interface VeryfiClientConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

// ── Line Items ─────────────────────────────────────────────────────────────

export interface VeryfiLineItem {
  id: number;
  order: number;
  description: string;
  quantity: number;
  price: number;
  total: number;
  tax: number;
  tax_rate: number;
  discount: number;
  discount_rate: number;
  sku: string | null;
  category: string | null;
  unit_of_measure: string | null;
  upc: string | null;
  date: string | null;
  start_date: string | null;
  end_date: string | null;
  hsn: string | null;
  section: string | null;
  type: string;
  text: string;
  full_description: string;
}

// ── Document ───────────────────────────────────────────────────────────────

export interface VeryfiVendor {
  name: string | null;
  address: string | null;
  phone_number: string | null;
  email: string | null;
  web: string | null;
  vat_number: string | null;
  reg_number: string | null;
  iban: string | null;
  category: string | null;
  raw_name: string | null;
  raw_address: string | null;
  type: string | null;
  abn_number: string | null;
}

export interface VeryfiPayment {
  card_number: string | null;
  display_name: string | null;
  type: string | null;
  terms: string | null;
}

export interface VeryfiTaxLine {
  name: string | null;
  rate: number | null;
  total: number | null;
  base: number | null;
}

export interface VeryfiDocument {
  id: number;
  external_id: string | null;
  created_date: string;
  updated_date: string;
  document_type: string;
  category: string;
  img_url: string | null;
  img_file_name: string | null;
  img_thumbnail_url: string | null;
  pdf_url: string | null;
  invoice_number: string | null;
  reference_number: string | null;
  purchase_order_number: string | null;
  date: string | null;
  due_date: string | null;
  delivery_date: string | null;
  total: number;
  subtotal: number;
  tax: number;
  tip: number;
  discount: number;
  shipping: number;
  currency_code: string;
  currency_exchange_rate: number;
  cashback: number;
  rounding: number;
  total_weight: string | null;
  vendor: VeryfiVendor;
  bill_to: {
    name: string | null;
    address: string | null;
    vat_number: string | null;
  };
  ship_to: {
    name: string | null;
    address: string | null;
  };
  payment: VeryfiPayment;
  tax_lines: VeryfiTaxLine[];
  line_items: VeryfiLineItem[];
  notes: string | null;
  ocr_text: string;
  confidence: number;
  is_duplicate: boolean;
  status: string;
  tags: string[];
  meta: Record<string, unknown>;
}

// ── Request Params ─────────────────────────────────────────────────────────

export interface VeryfiProcessDocumentParams {
  /** Base64-encoded file content. */
  file_data: string;
  /** Original filename with extension. */
  file_name?: string;
  /** Categories to try to match. */
  categories?: string[];
  /** Whether to extract line items. */
  auto_delete?: boolean;
  /** Boost mode for faster processing. */
  boost_mode?: boolean;
  /** External ID for your reference. */
  external_id?: string;
  /** Tags to attach. */
  tags?: string[];
}

export interface VeryfiProcessUrlParams {
  /** Public URL of the document. */
  file_url: string;
  file_urls?: string[];
  categories?: string[];
  auto_delete?: boolean;
  boost_mode?: boolean;
  external_id?: string;
  tags?: string[];
}

export interface VeryfiDocumentListParams {
  page?: number;
  page_size?: number;
  created_date__gte?: string;
  created_date__lte?: string;
  tag?: string;
  external_id?: string;
  q?: string;
}

export interface VeryfiDocumentListResponse {
  documents: VeryfiDocument[];
  total_count: number;
}

// ── Tags ───────────────────────────────────────────────────────────────────

export interface VeryfiTag {
  id: number;
  name: string;
}
