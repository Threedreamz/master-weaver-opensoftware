// ==================== DPD Shipping API Types ====================
// DPD Web Services (SOAP-wrapped REST). Authentication via DELIS-ID + password.

/** DPD shipment product types */
export type DpdProduct =
  | "CL"      // DPD Classic
  | "E830"    // DPD 8:30
  | "E10"     // DPD 10:00
  | "E12"     // DPD 12:00
  | "E18"     // DPD 18:00
  | "PL"      // DPD PARCELLetter
  | "MAIL"    // DPD Mail
  | "PM2"     // Predict (2h window)
  | "IE2"     // DPD International Express
  | "B2C";    // DPD Home

/** DPD label output format */
export type DpdLabelFormat = "PDF" | "ZPL" | "PNG";

/** DPD label paper size */
export type DpdLabelSize = "PDF_A4" | "PDF_A6";

/** DPD shipment tracking status codes */
export type DpdTrackingStatus =
  | "ACCEPTED"
  | "AT_SENDING_DEPOT"
  | "ON_THE_ROAD"
  | "AT_DELIVERY_DEPOT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "NOT_DELIVERED"
  | "RETURNED"
  | "UNKNOWN";

// ==================== Address ====================

export interface DpdAddress {
  /** Company or recipient name */
  name1: string;
  name2?: string;
  street: string;
  houseNo?: string;
  /** Country ISO 2-letter code */
  country: string;
  zipCode: string;
  city: string;
  /** State or province (required for some countries) */
  state?: string;
  phone?: string;
  email?: string;
  /** Customer reference */
  customerReference?: string;
}

// ==================== Parcel ====================

export interface DpdParcel {
  /** Weight in kg (max 31.5 for standard) */
  weight: number;
  /** Length in cm */
  length?: number;
  /** Width in cm */
  width?: number;
  /** Height in cm */
  height?: number;
  /** Content description (required for international) */
  content?: string;
  /** Customer reference for this parcel */
  reference1?: string;
  reference2?: string;
}

/** DPD additional services */
export interface DpdServices {
  /** Cash on delivery */
  cod?: {
    amount: number;
    currency: string;
    purpose: string;
  };
  /** Higher insurance value in EUR */
  higherInsurance?: number;
  /** Predict notification (SMS or email) */
  predict?: {
    channel: "email" | "sms";
    value: string; // email address or phone number
    language: string; // ISO 639-1 (de, en, fr, etc.)
  };
  /** Personal delivery (ID check) */
  personalDelivery?: boolean;
  /** Saturday delivery */
  saturdayDelivery?: boolean;
  /** Guarantee delivery */
  guarantee?: boolean;
  /** Return label enclosed */
  returnLabel?: boolean;
}

/** Customs info for international shipments */
export interface DpdCustomsInfo {
  invoiceNumber?: string;
  description: string;
  terms: "DAP" | "DDP";
  items: DpdCustomsItem[];
}

export interface DpdCustomsItem {
  description: string;
  hsCode?: string;
  originCountry: string;
  quantity: number;
  weight: number;
  /** Value in shipment currency */
  amount: number;
}

// ==================== Shipment ====================

export interface DpdShipmentRequest {
  /** DELIS-ID of the sender */
  delisId?: string;
  /** Product type */
  product: DpdProduct;
  /** Sender address */
  sender: DpdAddress;
  /** Recipient address */
  recipient: DpdAddress;
  /** Parcels in this shipment */
  parcels: DpdParcel[];
  /** Additional services */
  services?: DpdServices;
  /** Customs information (international) */
  customs?: DpdCustomsInfo;
  /** Shipment date (YYYY-MM-DD) */
  shipDate?: string;
}

export interface DpdShipmentResponse {
  /** Unique DPD shipment ID */
  shipmentId: string;
  /** Tracking numbers for each parcel */
  parcels: DpdParcelResponse[];
  /** Overall status message */
  status: string;
}

export interface DpdParcelResponse {
  /** DPD parcel number (14 digits) */
  parcelNo: string;
  /** Tracking URL */
  trackingUrl: string;
  /** Label data as base64 */
  label: {
    data: string;
    format: DpdLabelFormat;
  };
  /** Return label (if requested) */
  returnLabel?: {
    data: string;
    format: DpdLabelFormat;
  };
}

// ==================== Tracking ====================

export interface DpdTrackingResponse {
  parcelNo: string;
  status: DpdTrackingStatus;
  statusDescription: string;
  estimatedDeliveryDate?: string;
  events: DpdTrackingEvent[];
}

export interface DpdTrackingEvent {
  timestamp: string;
  status: DpdTrackingStatus;
  description: string;
  depot?: string;
  location?: {
    city: string;
    country: string;
  };
}

// ==================== Label ====================

export interface DpdLabelRequest {
  parcelNo: string;
  format?: DpdLabelFormat;
  size?: DpdLabelSize;
}

// ==================== Pickup ====================

export interface DpdPickupRequest {
  /** Pickup address */
  address: DpdAddress;
  /** Desired pickup date (YYYY-MM-DD) */
  pickupDate: string;
  /** Earliest pickup time (HH:MM) */
  timeFrom: string;
  /** Latest pickup time (HH:MM) */
  timeTo: string;
  /** Number of parcels */
  parcelCount: number;
  /** Total weight in kg */
  totalWeight: number;
  /** Special instructions */
  note?: string;
}

export interface DpdPickupResponse {
  /** Pickup confirmation number */
  confirmationNumber: string;
  /** Confirmed pickup date */
  pickupDate: string;
  /** Confirmed time window */
  timeFrom: string;
  timeTo: string;
  status: string;
}

// ==================== Authentication ====================

export interface DpdAuthToken {
  /** Session token returned by DPD login service */
  token: string;
  /** Token expiry (DPD tokens typically last for the session) */
  expiresAt?: number;
  /** DELIS-ID used to authenticate */
  delisId: string;
}

// ==================== Client Config ====================

export interface DpdClientConfig {
  /** DELIS-ID (DPD customer number / login) */
  delisId: string;
  /** DPD password */
  password: string;
  /** Customer number (Kundennummer) */
  customerNumber?: string;
  /** Use sandbox environment (default: false) */
  sandbox?: boolean;
  /** Request timeout in ms */
  timeout?: number;
}
