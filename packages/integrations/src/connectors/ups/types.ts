// ==================== UPS API Types ====================
// UPS Developer Kit RESTful APIs. OAuth2 authentication.
// https://developer.ups.com/

/** UPS service codes */
export type UpsServiceCode =
  | "01"   // UPS Next Day Air
  | "02"   // UPS 2nd Day Air
  | "03"   // UPS Ground
  | "07"   // UPS Worldwide Express
  | "08"   // UPS Worldwide Expedited
  | "11"   // UPS Standard (CA/MX)
  | "12"   // UPS 3 Day Select
  | "13"   // UPS Next Day Air Saver
  | "14"   // UPS Next Day Air Early
  | "54"   // UPS Worldwide Express Plus
  | "59"   // UPS 2nd Day Air A.M.
  | "65"   // UPS Worldwide Saver
  | "70"   // UPS Access Point Economy
  | "71"   // UPS Worldwide Express Freight Midday
  | "72"   // UPS Worldwide Economy DDP
  | "74"   // UPS Express 12:00
  | "82"   // UPS Today Standard
  | "83"   // UPS Today Dedicated Courier
  | "84"   // UPS Today Intercity
  | "85"   // UPS Today Express
  | "86"   // UPS Today Express Saver
  | "96";  // UPS Worldwide Express Freight

/** UPS label image format */
export type UpsLabelFormat = "PDF" | "ZPL" | "EPL" | "SPL" | "GIF" | "PNG";

/** UPS package type codes */
export type UpsPackagingType =
  | "00"   // Unknown / Customer supplied
  | "01"   // UPS Letter
  | "02"   // Customer supplied package
  | "03"   // Tube
  | "04"   // PAK
  | "21"   // UPS Express Box
  | "24"   // UPS 25KG Box
  | "25"   // UPS 10KG Box
  | "30"   // Pallet
  | "2a"   // Small Express Box
  | "2b"   // Medium Express Box
  | "2c";  // Large Express Box

/** UPS shipment tracking status */
export type UpsTrackingStatus =
  | "P"   // Pickup
  | "I"   // In Transit
  | "D"   // Delivered
  | "X"   // Exception
  | "M"   // Billing / Manifest
  | "RS"  // Returned to Shipper
  | "MV"  // Voided
  | "NA"; // Not Available

/** UPS webhook event types */
export type UpsWebhookEventType =
  | "tracking_update"
  | "delivery_confirmation"
  | "exception_notification"
  | "pickup_notification";

// ==================== Address ====================

export interface UpsAddress {
  name: string;
  attentionName?: string;
  companyName?: string;
  phone?: { number: string; extension?: string };
  addressLine: string[];
  city: string;
  stateProvinceCode?: string;
  postalCode: string;
  /** ISO 2-letter country code */
  countryCode: string;
  emailAddress?: string;
  /** UPS account number (for billing) */
  accountNumber?: string;
}

// ==================== Package ====================

export interface UpsPackage {
  packaging: { code: UpsPackagingType };
  dimensions?: {
    unitOfMeasurement: { code: "IN" | "CM" };
    length: string;
    width: string;
    height: string;
  };
  packageWeight: {
    unitOfMeasurement: { code: "LBS" | "KGS" };
    weight: string;
  };
  /** Declared value for customs */
  declaredValue?: {
    currencyCode: string;
    monetaryValue: string;
  };
  /** Package reference numbers */
  referenceNumber?: {
    code: string;
    value: string;
  }[];
  /** Additional handling flag */
  additionalHandlingIndicator?: string;
}

/** UPS value-added services */
export interface UpsShipmentServices {
  /** Saturday delivery */
  saturdayDelivery?: boolean;
  /** Signature required type */
  deliveryConfirmation?: {
    /** 1=Delivery Confirmation, 2=Delivery Confirmation Signature Required, 3=Adult Signature Required */
    dcisType: "1" | "2" | "3";
  };
  /** Cash on delivery */
  codAmount?: { currencyCode: string; monetaryValue: string };
  /** Return service */
  returnService?: { code: "2" | "3" | "5" | "8" | "9" };
  /** Declared value (insurance) */
  insuredValue?: { currencyCode: string; monetaryValue: string };
  /** Direct delivery only */
  directDeliveryOnlyIndicator?: string;
}

/** International forms / customs */
export interface UpsInternationalForms {
  formType: "01" | "03" | "04" | "06" | "07" | "11";
  invoiceNumber?: string;
  invoiceDate?: string;
  reasonForExport?: string;
  currencyCode: string;
  products: UpsCustomsProduct[];
}

export interface UpsCustomsProduct {
  description: string;
  unit: { number: string; value: string; unitOfMeasurement: { code: string } };
  commodityCode?: string;
  originCountryCode: string;
  scheduleBInfo?: { scheduleBNumber: string };
}

// ==================== Ship ====================

export interface UpsShipmentRequest {
  /** Service code */
  service: { code: UpsServiceCode };
  /** Shipper info */
  shipper: UpsAddress & { shipperNumber: string };
  /** Ship-to address */
  shipTo: UpsAddress;
  /** Ship-from (if different from shipper) */
  shipFrom?: UpsAddress;
  /** Packages */
  packages: UpsPackage[];
  /** Payment info */
  paymentInformation: {
    shipmentCharge: {
      type: "01" | "02"; // 01=Transportation, 02=Duties and Taxes
      billShipper?: { accountNumber: string };
      billReceiver?: { accountNumber: string };
      billThirdParty?: { accountNumber: string; address: Partial<UpsAddress> };
    }[];
  };
  /** Additional services */
  shipmentServiceOptions?: UpsShipmentServices;
  /** International paperwork */
  internationalForms?: UpsInternationalForms;
  /** Description of goods */
  description?: string;
  /** Label spec */
  labelSpecification: {
    labelImageFormat: { code: UpsLabelFormat };
    labelStockSize?: { width: string; height: string };
  };
}

export interface UpsShipmentResponse {
  shipmentResults: {
    shipmentIdentificationNumber: string;
    packageResults: UpsPackageResult[];
    billingWeight: { unitOfMeasurement: { code: string }; weight: string };
    shipmentCharges: {
      transportationCharges: { currencyCode: string; monetaryValue: string };
      serviceOptionsCharges: { currencyCode: string; monetaryValue: string };
      totalCharges: { currencyCode: string; monetaryValue: string };
    };
    form?: { image: { imageFormat: { code: string }; graphicImage: string } };
  };
}

export interface UpsPackageResult {
  trackingNumber: string;
  shippingLabel: {
    imageFormat: { code: UpsLabelFormat };
    graphicImage: string; // base64 encoded
  };
  itemizedCharges?: { code: string; currencyCode: string; monetaryValue: string }[];
}

// ==================== Rate ====================

export interface UpsRateRequest {
  /** Service code (omit for all available rates) */
  service?: { code: UpsServiceCode };
  shipper: UpsAddress & { shipperNumber: string };
  shipTo: UpsAddress;
  shipFrom?: UpsAddress;
  packages: UpsPackage[];
  /** Return "Shop" for all rates or "Rate" for a specific service */
  requestOption: "Shop" | "Rate";
}

export interface UpsRateResponse {
  ratedShipment: UpsRatedShipment[];
}

export interface UpsRatedShipment {
  service: { code: string; description: string };
  billingWeight: { unitOfMeasurement: { code: string }; weight: string };
  transportationCharges: { currencyCode: string; monetaryValue: string };
  serviceOptionsCharges: { currencyCode: string; monetaryValue: string };
  totalCharges: { currencyCode: string; monetaryValue: string };
  guaranteedDelivery?: {
    businessDaysInTransit: string;
    deliveryByTime?: string;
  };
  ratedPackage: {
    transportationCharges: { currencyCode: string; monetaryValue: string };
    totalCharges: { currencyCode: string; monetaryValue: string };
    weight: string;
  }[];
}

// ==================== Track ====================

export interface UpsTrackingResponse {
  trackResponse: {
    shipment: UpsTrackingShipment[];
  };
}

export interface UpsTrackingShipment {
  inquiryNumber: string;
  package: UpsTrackingPackage[];
}

export interface UpsTrackingPackage {
  trackingNumber: string;
  currentStatus: {
    code: UpsTrackingStatus;
    description: string;
  };
  deliveryDate?: { date: string };
  deliveryTime?: { endTime: string };
  weight?: { unitOfMeasurement: { code: string }; weight: string };
  activity: UpsTrackingActivity[];
}

export interface UpsTrackingActivity {
  date: string;
  time: string;
  location: {
    address: {
      city: string;
      stateProvinceCode?: string;
      countryCode: string;
      postalCode?: string;
    };
  };
  status: {
    code: UpsTrackingStatus;
    type: string;
    description: string;
  };
}

// ==================== Address Validation ====================

export interface UpsAddressValidationRequest {
  addressKeyFormat: {
    addressLine: string[];
    politicalDivision2: string; // city
    politicalDivision1: string; // state
    postcodePrimaryLow: string; // zip
    countryCode: string;
  };
}

export interface UpsAddressValidationResponse {
  validationResult: {
    /** Indicator: 1=valid, 0=ambiguous/invalid */
    validIndicator: string;
    ambiguousIndicator?: string;
    noCandidatesIndicator?: string;
  };
  candidate?: UpsAddressCandidate[];
}

export interface UpsAddressCandidate {
  addressClassification: { code: string; description: string };
  addressKeyFormat: {
    addressLine: string[];
    politicalDivision2: string;
    politicalDivision1: string;
    postcodePrimaryLow: string;
    postcodeExtendedLow?: string;
    countryCode: string;
  };
}

// ==================== Webhook ====================

export interface UpsWebhookPayload {
  eventType: UpsWebhookEventType;
  trackingNumber: string;
  shipmentIdentificationNumber?: string;
  timestamp: string;
  status: UpsTrackingStatus;
  description: string;
  location?: {
    city: string;
    stateProvinceCode?: string;
    countryCode: string;
  };
  details?: Record<string, unknown>;
}

// ==================== Client Config ====================

export interface UpsClientConfig {
  /** OAuth2 client ID from UPS developer portal */
  clientId: string;
  /** OAuth2 client secret */
  clientSecret: string;
  /** UPS shipper account number */
  accountNumber: string;
  /** Use sandbox / CIE environment (default: false) */
  sandbox?: boolean;
  /** Request timeout in ms */
  timeout?: number;
}
