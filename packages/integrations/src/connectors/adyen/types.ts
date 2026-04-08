// ==================== Adyen API Types ====================

/** Adyen currency amount */
export interface AdyenAmount {
  currency: string;
  value: number; // Minor units (e.g., 1000 = 10.00 EUR)
}

/** Adyen payment method types */
export type AdyenPaymentMethodType =
  | "scheme"
  | "ideal"
  | "giropay"
  | "sofort"
  | "sepadirectdebit"
  | "klarna"
  | "paypal"
  | "applepay"
  | "googlepay"
  | string;

/** Adyen result codes */
export type AdyenResultCode =
  | "Authorised"
  | "Refused"
  | "RedirectShopper"
  | "IdentifyShopper"
  | "ChallengeShopper"
  | "Pending"
  | "PresentToShopper"
  | "Received"
  | "Error"
  | "Cancelled";

// ==================== Checkout / Sessions ====================

export interface AdyenCreateSessionRequest {
  merchantAccount: string;
  amount: AdyenAmount;
  reference: string;
  returnUrl: string;
  countryCode?: string;
  shopperLocale?: string;
  shopperReference?: string;
  shopperEmail?: string;
  channel?: "Web" | "iOS" | "Android";
  lineItems?: AdyenLineItem[];
  metadata?: Record<string, string>;
  expiresAt?: string;
}

export interface AdyenCreateSessionResponse {
  id: string;
  sessionData: string;
  amount: AdyenAmount;
  reference: string;
  returnUrl: string;
  expiresAt: string;
  merchantAccount: string;
  countryCode?: string;
  shopperLocale?: string;
}

export interface AdyenLineItem {
  id?: string;
  description?: string;
  amountIncludingTax?: number;
  amountExcludingTax?: number;
  taxAmount?: number;
  taxPercentage?: number;
  quantity?: number;
  taxCategory?: string;
}

// ==================== Payments ====================

export interface AdyenPaymentRequest {
  merchantAccount: string;
  amount: AdyenAmount;
  reference: string;
  paymentMethod: Record<string, unknown>;
  returnUrl?: string;
  shopperReference?: string;
  shopperEmail?: string;
  shopperIP?: string;
  countryCode?: string;
  channel?: "Web" | "iOS" | "Android";
  lineItems?: AdyenLineItem[];
  metadata?: Record<string, string>;
  recurringProcessingModel?: "CardOnFile" | "Subscription" | "UnscheduledCardOnFile";
  shopperInteraction?: "Ecommerce" | "ContAuth" | "Moto" | "POS";
  storePaymentMethod?: boolean;
}

export interface AdyenPaymentResponse {
  pspReference: string;
  resultCode: AdyenResultCode;
  amount?: AdyenAmount;
  merchantReference?: string;
  action?: AdyenAction;
  refusalReason?: string;
  refusalReasonCode?: string;
  additionalData?: Record<string, string>;
}

export interface AdyenAction {
  type: "redirect" | "threeDS2" | "voucher" | "qrCode" | "await" | "sdk";
  paymentMethodType?: string;
  url?: string;
  method?: string;
  data?: Record<string, string>;
  token?: string;
  paymentData?: string;
}

export interface AdyenPaymentDetailsRequest {
  details: Record<string, string>;
  paymentData?: string;
}

// ==================== Modifications (Capture, Refund, Cancel) ====================

export interface AdyenCaptureRequest {
  merchantAccount: string;
  amount: AdyenAmount;
  reference?: string;
  lineItems?: AdyenLineItem[];
}

export interface AdyenCaptureResponse {
  pspReference: string;
  paymentPspReference: string;
  status: "received";
  amount: AdyenAmount;
  merchantAccount: string;
  reference?: string;
}

export interface AdyenRefundRequest {
  merchantAccount: string;
  amount: AdyenAmount;
  reference?: string;
  lineItems?: AdyenLineItem[];
}

export interface AdyenRefundResponse {
  pspReference: string;
  paymentPspReference: string;
  status: "received";
  amount: AdyenAmount;
  merchantAccount: string;
  reference?: string;
}

export interface AdyenCancelRequest {
  merchantAccount: string;
  reference?: string;
}

export interface AdyenCancelResponse {
  pspReference: string;
  paymentPspReference: string;
  status: "received";
  merchantAccount: string;
  reference?: string;
}

// ==================== Recurring / Stored Payment Methods ====================

export interface AdyenStoredPaymentMethod {
  id: string;
  brand?: string;
  expiryMonth?: string;
  expiryYear?: string;
  holderName?: string;
  lastFour?: string;
  name?: string;
  networkTxReference?: string;
  supportedShopperInteractions?: string[];
  type?: string;
}

export interface AdyenListStoredPaymentMethodsResponse {
  merchantAccount: string;
  shopperReference: string;
  storedPaymentMethods?: AdyenStoredPaymentMethod[];
}

export interface AdyenRemoveStoredPaymentMethodResponse {
  merchantAccount: string;
  shopperReference: string;
  recurringDetailReference: string;
}

// ==================== Payment Methods ====================

export interface AdyenPaymentMethodsRequest {
  merchantAccount: string;
  countryCode?: string;
  shopperLocale?: string;
  shopperReference?: string;
  amount?: AdyenAmount;
  channel?: "Web" | "iOS" | "Android";
}

export interface AdyenPaymentMethodGroup {
  name: string;
  type: string;
  brands?: string[];
}

export interface AdyenPaymentMethodsResponse {
  paymentMethods: AdyenPaymentMethodGroup[];
  storedPaymentMethods?: AdyenStoredPaymentMethod[];
}

// ==================== Webhooks ====================

export type AdyenWebhookEventCode =
  | "AUTHORISATION"
  | "CANCELLATION"
  | "REFUND"
  | "CANCEL_OR_REFUND"
  | "CAPTURE"
  | "CAPTURE_FAILED"
  | "REFUND_FAILED"
  | "REFUNDED_REVERSED"
  | "PAIDOUT_REVERSED"
  | "CHARGEBACK"
  | "CHARGEBACK_REVERSED"
  | "SECOND_CHARGEBACK"
  | "NOTIFICATION_OF_CHARGEBACK"
  | "PREARBITRATION_WON"
  | "PREARBITRATION_LOST"
  | "REPORT_AVAILABLE"
  | "ORDER_OPENED"
  | "ORDER_CLOSED"
  | "OFFER_CLOSED"
  | "RECURRING_CONTRACT"
  | string;

export interface AdyenNotificationItem {
  NotificationRequestItem: {
    additionalData?: Record<string, string>;
    amount: AdyenAmount;
    eventCode: AdyenWebhookEventCode;
    eventDate: string;
    merchantAccountCode: string;
    merchantReference: string;
    originalReference?: string;
    paymentMethod?: string;
    pspReference: string;
    reason?: string;
    success: "true" | "false";
  };
}

export interface AdyenWebhookPayload {
  live: "true" | "false";
  notificationItems: AdyenNotificationItem[];
}

// ==================== Client Config ====================

export interface AdyenClientConfig {
  apiKey: string;
  merchantAccount: string;
  /** "test" or "live" environment prefix */
  environment?: "test" | "live";
  /** Live URL prefix (required for live environment) */
  liveUrlPrefix?: string;
  /** HMAC key for webhook signature verification */
  hmacKey?: string;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}
