// ==================== DHL Geschaeftskundenversand API Types ====================
// German business shipping (Paket & Express) via DHL Business Portal.
// Authentication: API key + DHL business account (EKP).

/** DHL shipment product codes (Produkte) */
export type DhlProduct =
  | "V01PAK"    // DHL Paket (domestic DE)
  | "V53WPAK"   // DHL Paket International
  | "V54EPAK"   // DHL Europaket
  | "V62WP"     // DHL Warenpost
  | "V66WPI"    // DHL Warenpost International
  | "V06PAK"    // DHL Paket Taggleich
  | "V86PARCEL" // DHL Paket Austria
  | "V87PARCEL" // DHL Paket Connect
  | "V82PARCEL";// DHL Paket International (non-EU)

/** Label output format */
export type DhlLabelFormat = "PDF" | "ZPL2" | "PNG";

/** Label size */
export type DhlLabelSize = "A4" | "910-300-700" | "910-300-700-oz" | "910-300-600" | "910-300-710" | "100x70mm";

/** Shipment status from DHL tracking */
export type DhlShipmentStatus =
  | "pre-transit"
  | "transit"
  | "delivered"
  | "failure"
  | "return"
  | "unknown";

/** DHL webhook event types */
export type DhlWebhookEventType =
  | "shipment-status-change"
  | "shipment-delivered"
  | "shipment-return"
  | "shipment-exception";

// ==================== Address ====================

export interface DhlAddress {
  /** Recipient name (max 50 chars) */
  name1: string;
  name2?: string;
  name3?: string;
  /** Street name */
  addressStreet: string;
  /** House number */
  addressHouse?: string;
  /** Postal code */
  postalCode: string;
  /** City */
  city: string;
  /** ISO 3166-1 alpha-3 country code (DEU, AUT, etc.) */
  country: string;
  /** Contact email */
  email?: string;
  /** Contact phone */
  phone?: string;
  /** State/province code */
  state?: string;
}

/** Packstation or Postfiliale delivery */
export interface DhlLocker {
  /** Postnummer of the recipient */
  postNumber: string;
  /** Packstation or Filiale number */
  lockerNumber: string;
  postalCode: string;
  city: string;
  country: string;
}

// ==================== Shipment ====================

export interface DhlWeight {
  /** Weight unit */
  uom: "kg" | "g";
  /** Weight value */
  value: number;
}

export interface DhlDimensions {
  uom: "cm" | "mm";
  length: number;
  width: number;
  height: number;
}

export interface DhlMonetaryValue {
  currency: string;
  value: number;
}

/** Value-added services (Zusatzleistungen) */
export interface DhlServices {
  /** Preferred delivery day (YYYY-MM-DD) */
  preferredDay?: string;
  /** Preferred delivery time slot */
  preferredTime?: string;
  /** Visual age check */
  visualCheckOfAge?: "A16" | "A18";
  /** Named person only delivery */
  namedPersonOnly?: boolean;
  /** Signature required */
  signedForByRecipient?: boolean;
  /** Cash on delivery */
  cashOnDelivery?: DhlMonetaryValue;
  /** Additional insurance */
  additionalInsurance?: DhlMonetaryValue;
  /** Bulky goods (Sperrgut) */
  bulkyGoods?: boolean;
  /** Delivery notification email to recipient */
  parcelOutletRouting?: string;
  /** Premium delivery */
  premium?: boolean;
  /** Return shipment enclosed */
  endorsement?: "RETURN" | "ABANDON";
  /** No neighbour delivery */
  noNeighbourDelivery?: boolean;
}

/** Customs details for international shipments */
export interface DhlCustomsDetails {
  invoiceNumber?: string;
  exportType: "OTHER" | "PRESENT" | "COMMERCIAL_SAMPLE" | "DOCUMENT" | "RETURN_OF_GOODS" | "COMMERCIAL_GOODS";
  exportDescription?: string;
  shippingConditions?: "DDU" | "DDP";
  items: DhlCustomsItem[];
}

export interface DhlCustomsItem {
  description: string;
  countryOfOrigin: string;
  hsCode: string;
  quantity: number;
  weight: DhlWeight;
  value: DhlMonetaryValue;
}

export interface DhlShipmentRequest {
  /** DHL business account number (EKP, 10 digits) */
  billingNumber: string;
  /** Reference number for the shipment */
  refNo?: string;
  /** Shipment product code */
  product: DhlProduct;
  /** Shipper address */
  shipper: DhlAddress;
  /** Consignee address */
  consignee: DhlAddress | DhlLocker;
  /** Weight of the shipment */
  weight: DhlWeight;
  /** Dimensions (optional) */
  dimensions?: DhlDimensions;
  /** Value-added services */
  services?: DhlServices;
  /** Customs details (international only) */
  customs?: DhlCustomsDetails;
  /** Shipment date (YYYY-MM-DD, default: today) */
  shipDate?: string;
}

export interface DhlShipmentResponse {
  status: { title: string; statusCode: number };
  items: DhlShipmentItemResponse[];
}

export interface DhlShipmentItemResponse {
  /** Unique shipment ID */
  shipmentNo: string;
  /** Return shipment number (if applicable) */
  returnShipmentNo?: string;
  /** Label data as base64-encoded PDF/ZPL/PNG */
  label: {
    b64: string;
    fileFormat: DhlLabelFormat;
  };
  /** Return label (if endorsement is RETURN) */
  returnLabel?: {
    b64: string;
    fileFormat: DhlLabelFormat;
  };
  /** Customs document (CN23) */
  customsDoc?: {
    b64: string;
    fileFormat: "PDF";
  };
  /** Validation messages */
  validationMessages?: DhlValidationMessage[];
}

export interface DhlValidationMessage {
  property: string;
  validationMessage: string;
  validationState: "Warning" | "Error";
}

// ==================== Tracking ====================

export interface DhlTrackingResponse {
  shipments: DhlTrackingShipment[];
}

export interface DhlTrackingShipment {
  id: string;
  service: string;
  origin: DhlTrackingLocation;
  destination: DhlTrackingLocation;
  status: {
    timestamp: string;
    location: DhlTrackingLocation;
    statusCode: DhlShipmentStatus;
    status: string;
    description: string;
  };
  estimatedDeliveryDate?: string;
  events: DhlTrackingEvent[];
}

export interface DhlTrackingLocation {
  address?: {
    addressLocality: string;
    postalCode?: string;
    countryCode?: string;
  };
}

export interface DhlTrackingEvent {
  timestamp: string;
  location: DhlTrackingLocation;
  statusCode: string;
  status: string;
  description: string;
}

// ==================== Label ====================

export interface DhlLabelRequest {
  shipmentNo: string;
  labelFormat?: DhlLabelFormat;
  labelSize?: DhlLabelSize;
}

export interface DhlLabelResponse {
  label: {
    b64: string;
    fileFormat: DhlLabelFormat;
  };
}

// ==================== Manifest / Close-out ====================

export interface DhlManifestRequest {
  /** Billing number (EKP + procedure + participation) */
  billingNumber: string;
  /** Shipment numbers to manifest */
  shipmentNumbers?: string[];
  /** Close all open shipments for this billing number */
  all?: boolean;
}

export interface DhlManifestResponse {
  status: { title: string; statusCode: number };
  manifestDate: string;
  items: { shipmentNo: string; status: string }[];
}

// ==================== Webhook ====================

export interface DhlWebhookPayload {
  eventType: DhlWebhookEventType;
  shipmentNo: string;
  timestamp: string;
  status: DhlShipmentStatus;
  description: string;
  location?: DhlTrackingLocation;
  /** Raw event payload */
  details?: Record<string, unknown>;
}

// ==================== Client Config ====================

export interface DhlClientConfig {
  /** DHL API key (from developer portal) */
  apiKey: string;
  /** DHL API secret */
  apiSecret: string;
  /** DHL business account number (EKP, 10 digits) */
  accountNumber: string;
  /** Use sandbox environment (default: false) */
  sandbox?: boolean;
  /** Request timeout in ms */
  timeout?: number;
}
