// ==================== GLS Shipping API Types ====================
// GLS Web API for parcel shipping in Europe.
// Authentication: Basic auth (username + password) + Contact ID.
// https://api.gls-group.eu/

/** GLS product types */
export type GlsProduct =
  | "PARCEL"           // Standard GLS parcel
  | "EXPRESS"          // GLS Express
  | "FREIGHT"          // GLS Freight
  | "EUROPARCEL"       // Cross-border EU
  | "GLOBALPARCEL"     // Worldwide
  | "LETTER"           // GLS Letter
  | "RETURN";          // Return parcel

/** GLS label output format */
export type GlsLabelFormat = "PDF" | "PNG" | "ZPL";

/** GLS label paper size */
export type GlsLabelSize = "A4" | "A5" | "A6" | "4x6";

/** GLS shipment tracking status */
export type GlsTrackingStatus =
  | "PREADVICE"
  | "INWARDSCAN"
  | "INSCAN"
  | "INTRANSIT"
  | "OUTTRANSIT"
  | "OUTFORDELIVERY"
  | "DELIVERED"
  | "NOTDELIVERED"
  | "RETURNED"
  | "STORED"
  | "UNKNOWN";

// ==================== Address ====================

export interface GlsAddress {
  /** Recipient name */
  name1: string;
  name2?: string;
  name3?: string;
  street1: string;
  street2?: string;
  zipCode: string;
  city: string;
  /** ISO 2-letter country code */
  country: string;
  province?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  /** Contact person */
  contactPerson?: string;
}

// ==================== Parcel ====================

export interface GlsParcel {
  /** Weight in kg */
  weight: number;
  /** Length in cm */
  length?: number;
  /** Width in cm */
  width?: number;
  /** Height in cm */
  height?: number;
  /** Content description */
  comment?: string;
  /** Customer reference for this parcel */
  reference?: string;
}

/** GLS value-added services */
export interface GlsServices {
  /** ShopDeliveryService (ParcelShop delivery) */
  shopDelivery?: {
    parcelShopId: string;
  };
  /** FlexDeliveryService (recipient selects delivery options) */
  flexDelivery?: {
    email?: string;
    mobile?: string;
  };
  /** Cash on delivery */
  cashOnDelivery?: {
    amount: number;
    currency: string;
    reference: string;
  };
  /** Guaranteed24Service */
  guaranteed24?: boolean;
  /** AddOnInsuranceService (higher insurance) */
  insurance?: {
    amount: number;
    currency: string;
  };
  /** Saturday delivery */
  saturdayDelivery?: boolean;
  /** Intercompany delivery */
  intercompany?: boolean;
  /** Return label enclosed */
  returnLabel?: boolean;
  /** ShopReturnService */
  shopReturn?: {
    parcelShopId: string;
  };
  /** Hazardous goods */
  hazardousGoods?: {
    unNumber: string;
    hazardClass: string;
    packingGroup?: string;
  };
  /** Deposit (Nachnahme) */
  deposit?: boolean;
}

/** Customs details for international shipments */
export interface GlsCustomsDetails {
  invoiceNumber?: string;
  exportReason: "SALE" | "GIFT" | "SAMPLE" | "RETURN" | "REPAIR" | "OTHER";
  currency: string;
  items: GlsCustomsItem[];
}

export interface GlsCustomsItem {
  description: string;
  countryOfOrigin: string;
  tarifNumber?: string; // HS code
  quantity: number;
  weight: number;
  value: number;
}

// ==================== Shipment ====================

export interface GlsShipmentRequest {
  /** Shipper address */
  shipper: GlsAddress;
  /** Consignee (receiver) address */
  consignee: GlsAddress;
  /** Return address (if different from shipper) */
  returnAddress?: GlsAddress;
  /** Product type */
  product: GlsProduct;
  /** Parcels in this shipment */
  parcels: GlsParcel[];
  /** Value-added services */
  services?: GlsServices;
  /** Customs data (international shipments) */
  customs?: GlsCustomsDetails;
  /** Shipment date (YYYY-MM-DD, default: today) */
  shipDate?: string;
  /** Incoterms */
  incoterm?: "10" | "20" | "30"; // 10=DDP, 20=DAP, 30=FCA
  /** Customer reference */
  reference?: string;
}

export interface GlsShipmentResponse {
  /** GLS shipment ID */
  shipmentId: string;
  /** Individual parcel results */
  parcels: GlsParcelResponse[];
  /** Any warnings or messages */
  messages?: GlsMessage[];
}

export interface GlsParcelResponse {
  /** GLS parcel number (tracking number) */
  parcelNumber: string;
  /** Tracking URL */
  trackingUrl: string;
  /** Label as base64-encoded data */
  label: {
    data: string;
    format: GlsLabelFormat;
  };
  /** Return label (if requested) */
  returnLabel?: {
    data: string;
    format: GlsLabelFormat;
  };
}

export interface GlsMessage {
  code: string;
  message: string;
  severity: "INFO" | "WARNING" | "ERROR";
}

// ==================== Tracking ====================

export interface GlsTrackingResponse {
  parcelNumber: string;
  status: GlsTrackingStatus;
  statusDescription: string;
  product: string;
  weight?: number;
  deliveryDate?: string;
  signature?: string;
  events: GlsTrackingEvent[];
}

export interface GlsTrackingEvent {
  timestamp: string;
  status: GlsTrackingStatus;
  description: string;
  location?: {
    city: string;
    country: string;
  };
  depot?: string;
}

// ==================== Label ====================

export interface GlsLabelRequest {
  parcelNumber: string;
  format?: GlsLabelFormat;
  size?: GlsLabelSize;
}

// ==================== ParcelShop ====================

export interface GlsParcelShop {
  parcelShopId: string;
  name: string;
  address: GlsAddress;
  openingHours: {
    dayOfWeek: string;
    open: string;
    close: string;
  }[];
  distance?: number;
}

export interface GlsParcelShopSearchRequest {
  zipCode?: string;
  city?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  /** Maximum number of results */
  limit?: number;
  /** Maximum distance in km */
  maxDistance?: number;
}

// ==================== Client Config ====================

export interface GlsClientConfig {
  /** GLS username (login) */
  username: string;
  /** GLS password */
  password: string;
  /** GLS Contact ID (customer identifier) */
  contactId: string;
  /** Use sandbox environment (default: false) */
  sandbox?: boolean;
  /** Request timeout in ms */
  timeout?: number;
}
