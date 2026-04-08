// ==================== FedEx API Types ====================
// FedEx RESTful APIs (v1). OAuth2 client credentials authentication.
// https://developer.fedex.com/

/** FedEx service types */
export type FedExServiceType =
  | "FEDEX_GROUND"
  | "FEDEX_HOME_DELIVERY"
  | "FEDEX_EXPRESS_SAVER"
  | "FEDEX_2_DAY"
  | "FEDEX_2_DAY_AM"
  | "STANDARD_OVERNIGHT"
  | "PRIORITY_OVERNIGHT"
  | "FIRST_OVERNIGHT"
  | "FEDEX_FREIGHT_ECONOMY"
  | "FEDEX_FREIGHT_PRIORITY"
  | "INTERNATIONAL_ECONOMY"
  | "INTERNATIONAL_PRIORITY"
  | "INTERNATIONAL_FIRST"
  | "INTERNATIONAL_GROUND"
  | "EUROPE_FIRST_INTERNATIONAL_PRIORITY"
  | "FEDEX_INTERNATIONAL_CONNECT_PLUS";

/** FedEx packaging types */
export type FedExPackagingType =
  | "YOUR_PACKAGING"
  | "FEDEX_ENVELOPE"
  | "FEDEX_BOX"
  | "FEDEX_SMALL_BOX"
  | "FEDEX_MEDIUM_BOX"
  | "FEDEX_LARGE_BOX"
  | "FEDEX_EXTRA_LARGE_BOX"
  | "FEDEX_10KG_BOX"
  | "FEDEX_25KG_BOX"
  | "FEDEX_PAK"
  | "FEDEX_TUBE";

/** FedEx label format */
export type FedExLabelFormat = "PDF" | "PNG" | "ZPLII" | "EPL2";

/** FedEx label stock type (paper size) */
export type FedExLabelStockType =
  | "PAPER_4X6"
  | "PAPER_4X675"
  | "PAPER_4X8"
  | "PAPER_4X9"
  | "PAPER_7X475"
  | "PAPER_85X11_BOTTOM_HALF_LABEL"
  | "PAPER_85X11_TOP_HALF_LABEL"
  | "PAPER_LETTER"
  | "STOCK_4X6"
  | "STOCK_4X675_LEADING_DOC_TAB"
  | "STOCK_4X8"
  | "STOCK_4X9_LEADING_DOC_TAB";

/** FedEx tracking status */
export type FedExTrackingStatus =
  | "PU"   // Picked up
  | "IT"   // In transit
  | "OD"   // Out for delivery
  | "DL"   // Delivered
  | "DE"   // Delivery exception
  | "CA"   // Cancelled
  | "HL"   // Hold at location
  | "RS"   // Return to shipper
  | "SE"   // Shipment exception
  | "CD";  // Clearance delay

/** FedEx pickup types */
export type FedExPickupType =
  | "CONTACT_FEDEX_TO_SCHEDULE"
  | "DROPOFF_AT_FEDEX_LOCATION"
  | "USE_SCHEDULED_PICKUP";

/** FedEx webhook event types */
export type FedExWebhookEventType =
  | "SHIPMENT_CREATED"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "DELIVERY_EXCEPTION"
  | "RETURN_TO_SHIPPER"
  | "CLEARANCE_DELAY"
  | "PICKUP_COMPLETED";

// ==================== Address ====================

export interface FedExAddress {
  streetLines: string[];
  city: string;
  stateOrProvinceCode?: string;
  postalCode: string;
  /** ISO 2-letter country code */
  countryCode: string;
  residential?: boolean;
}

export interface FedExContact {
  personName?: string;
  companyName?: string;
  phoneNumber?: string;
  emailAddress?: string;
}

export interface FedExParty {
  contact: FedExContact;
  address: FedExAddress;
}

// ==================== Package ====================

export interface FedExWeight {
  units: "LB" | "KG";
  value: number;
}

export interface FedExDimensions {
  length: number;
  width: number;
  height: number;
  units: "IN" | "CM";
}

export interface FedExMoney {
  amount: number;
  currency: string;
}

export interface FedExRequestedPackageLineItem {
  weight: FedExWeight;
  dimensions?: FedExDimensions;
  groupPackageCount?: number;
  /** Content description */
  itemDescription?: string;
  /** Customer reference */
  customerReferences?: { customerReferenceType: "CUSTOMER_REFERENCE" | "INVOICE_NUMBER" | "P_O_NUMBER"; value: string }[];
  /** Declared value for customs */
  declaredValue?: FedExMoney;
}

/** Value-added services */
export interface FedExShipmentSpecialServices {
  specialServiceTypes: string[];
  /** Signature option */
  signatureOptionType?: "SERVICE_DEFAULT" | "ADULT" | "DIRECT" | "INDIRECT" | "NO_SIGNATURE_REQUIRED";
  /** Cash on delivery */
  codDetail?: {
    codCollectionType: "ANY" | "CASH" | "GUARANTEED_FUNDS";
    codCollectionAmount: FedExMoney;
  };
  /** Hold at location */
  holdAtLocationDetail?: {
    locationId: string;
    locationContactAndAddress: FedExParty;
  };
  /** Return shipment */
  returnShipmentDetail?: {
    returnType: "PRINT_RETURN_LABEL" | "EMAIL_LABEL" | "PENDING";
  };
  /** Delivery on invoice acceptance (international) */
  internationalTrafficInArmsRegulationsDetail?: {
    licenseOrExemptionNumber: string;
  };
}

/** Customs clearance for international */
export interface FedExCustomsClearanceDetail {
  dutiesPayment: {
    paymentType: "SENDER" | "RECIPIENT" | "THIRD_PARTY";
    payor?: { responsibleParty: { accountNumber: { value: string } } };
  };
  commodities: FedExCommodity[];
  commercialInvoice?: {
    termsOfSale?: "DDP" | "DDU" | "DAP" | "FCA" | "CPT";
    purpose?: "SOLD" | "GIFT" | "SAMPLE" | "RETURN" | "REPAIR_AND_RETURN";
  };
  isDocumentOnly?: boolean;
}

export interface FedExCommodity {
  description: string;
  countryOfManufacture: string;
  harmonizedCode?: string;
  quantity: number;
  quantityUnits: string;
  weight: FedExWeight;
  customsValue: FedExMoney;
}

// ==================== Ship ====================

export interface FedExShipmentRequest {
  /** FedEx account number */
  accountNumber: { value: string };
  /** Service type */
  serviceType: FedExServiceType;
  /** Packaging type */
  packagingType: FedExPackagingType;
  /** Pickup type */
  pickupType: FedExPickupType;
  /** Shipper */
  shipper: FedExParty;
  /** Recipients */
  recipients: FedExParty[];
  /** Ship date (YYYY-MM-DD) */
  shipDatestamp?: string;
  /** Packages */
  requestedPackageLineItems: FedExRequestedPackageLineItem[];
  /** Label specification */
  labelSpecification: {
    imageType: FedExLabelFormat;
    labelStockType: FedExLabelStockType;
    labelOrder?: "SHIPPING_LABEL_FIRST" | "SHIPPING_LABEL_LAST";
  };
  /** Shipment special services */
  shipmentSpecialServices?: FedExShipmentSpecialServices;
  /** Customs clearance (international) */
  customsClearanceDetail?: FedExCustomsClearanceDetail;
  /** Shipping charges payment */
  shippingChargesPayment?: {
    paymentType: "SENDER" | "RECIPIENT" | "THIRD_PARTY" | "COLLECT";
    payor?: { responsibleParty: { accountNumber: { value: string } } };
  };
}

export interface FedExShipmentResponse {
  transactionId: string;
  output: {
    transactionShipments: FedExTransactionShipment[];
    alerts?: FedExAlert[];
  };
}

export interface FedExTransactionShipment {
  masterTrackingNumber: string;
  serviceType: string;
  shipDatestamp: string;
  pieceResponses: FedExPieceResponse[];
  shipmentAdvisoryDetails?: { regulatoryAdvisory?: { prohibitions?: string[] } };
  completedShipmentDetail?: {
    operationalDetail?: { transitTime?: string };
    shipmentRating?: {
      actualRateType: string;
      shipmentRateDetail: {
        totalNetCharge: number;
        totalBaseCharge: number;
        currency: string;
        surCharges?: { type: string; amount: number }[];
      };
    };
  };
}

export interface FedExPieceResponse {
  trackingNumber: string;
  packageDocuments: FedExPackageDocument[];
  customerReferences?: { type: string; value: string }[];
}

export interface FedExPackageDocument {
  contentType: string;
  docType: "LABEL" | "COMMERCIAL_INVOICE" | "RETURN_LABEL";
  encodedLabel: string; // base64
  url?: string;
}

export interface FedExAlert {
  code: string;
  message: string;
  alertType: "NOTE" | "WARNING" | "ERROR";
}

// ==================== Rate ====================

export interface FedExRateRequest {
  accountNumber: { value: string };
  /** Omit for rate shopping across all services */
  requestedShipment: {
    shipper: FedExParty;
    recipient: FedExParty;
    serviceType?: FedExServiceType;
    pickupType: FedExPickupType;
    packagingType: FedExPackagingType;
    requestedPackageLineItems: FedExRequestedPackageLineItem[];
    shipDateStamp?: string;
    customsClearanceDetail?: FedExCustomsClearanceDetail;
  };
  /** "LIST" or "ACCOUNT" or "INCENTIVE" or "PREFERRED" */
  rateRequestType?: string[];
}

export interface FedExRateResponse {
  output: {
    rateReplyDetails: FedExRateDetail[];
    alerts?: FedExAlert[];
  };
}

export interface FedExRateDetail {
  serviceType: string;
  serviceName: string;
  packagingType: string;
  commit?: { dateDetail: { dayOfWeek: string; dayCxsFormat: string } };
  ratedShipmentDetails: {
    rateType: string;
    totalNetCharge: number;
    totalBaseCharge: number;
    totalNetChargeWithDutiesAndTaxes?: number;
    currency: string;
    shipmentRateDetail: {
      surCharges?: { type: string; description: string; amount: number }[];
    };
    ratedPackages: {
      packageRateDetail: {
        netCharge: number;
        billingWeight: { units: string; value: number };
      };
    }[];
  }[];
}

// ==================== Track ====================

export interface FedExTrackingRequest {
  trackingInfo: {
    trackingNumberInfo: {
      trackingNumber: string;
    };
  }[];
  includeDetailedScans: boolean;
}

export interface FedExTrackingResponse {
  output: {
    completeTrackResults: FedExCompleteTrackResult[];
  };
}

export interface FedExCompleteTrackResult {
  trackingNumber: string;
  trackResults: FedExTrackResult[];
}

export interface FedExTrackResult {
  trackingNumberInfo: { trackingNumber: string; trackingNumberUniqueId: string };
  latestStatusDetail: {
    code: FedExTrackingStatus;
    derivedCode: string;
    statusByLocale: string;
    description: string;
    scanLocation?: FedExScanLocation;
  };
  dateAndTimes: { type: string; dateTime: string }[];
  estimatedDeliveryTimeWindow?: { window: { begins: string; ends?: string } };
  packageDetails?: { physicalPackagingType: string; count: string; weightAndDimensions?: { weight: { value: string; unit: string }[] } };
  shipperInformation?: { contact: FedExContact; address: FedExAddress };
  recipientInformation?: { contact: FedExContact; address: FedExAddress };
  scanEvents: FedExScanEvent[];
}

export interface FedExScanEvent {
  date: string;
  eventType: string;
  eventDescription: string;
  scanLocation: FedExScanLocation;
  derivedStatus?: string;
  derivedStatusCode?: FedExTrackingStatus;
}

export interface FedExScanLocation {
  city?: string;
  stateOrProvinceCode?: string;
  countryCode?: string;
  postalCode?: string;
}

// ==================== Pickup ====================

export interface FedExPickupRequest {
  associatedAccountNumber: { value: string };
  originDetail: {
    pickupAddressDetail: FedExParty;
    pickupLocation: "FRONT" | "REAR" | "SIDE" | "NONE";
    readyDateTimestamp: string; // ISO datetime
    customerCloseTime: string; // HH:MM
    packageCount: number;
    totalWeight: FedExWeight;
  };
  carrierCode: "FDXE" | "FDXG";
  remarks?: string;
}

export interface FedExPickupResponse {
  output: {
    pickupConfirmationCode: string;
    location: string;
    message?: string;
    alerts?: FedExAlert[];
  };
}

export interface FedExCancelPickupRequest {
  associatedAccountNumber: { value: string };
  pickupConfirmationCode: string;
  scheduledDate: string; // YYYY-MM-DD
  carrierCode: "FDXE" | "FDXG";
}

// ==================== Webhook ====================

export interface FedExWebhookPayload {
  eventType: FedExWebhookEventType;
  trackingNumber: string;
  masterTrackingNumber?: string;
  timestamp: string;
  status: FedExTrackingStatus;
  description: string;
  location?: FedExScanLocation;
  details?: Record<string, unknown>;
}

// ==================== Client Config ====================

export interface FedExClientConfig {
  /** OAuth2 client ID (API key) from FedEx developer portal */
  clientId: string;
  /** OAuth2 client secret (secret key) */
  clientSecret: string;
  /** FedEx account number */
  accountNumber: string;
  /** Use sandbox environment (default: false) */
  sandbox?: boolean;
  /** Request timeout in ms */
  timeout?: number;
}
