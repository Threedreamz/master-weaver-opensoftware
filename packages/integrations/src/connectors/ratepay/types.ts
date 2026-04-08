// ==================== Ratepay XML API Types ====================

/** Ratepay payment method types */
export type RatepayPaymentMethod =
  | "INSTALLMENT"
  | "INVOICE"
  | "ELV"           // Direct debit (SEPA)
  | "PREPAYMENT";

/** Ratepay operation types */
export type RatepayOperation =
  | "PAYMENT_INIT"
  | "PAYMENT_REQUEST"
  | "PAYMENT_CONFIRM"
  | "PAYMENT_CHANGE"
  | "PAYMENT_QUERY"
  | "CALCULATION_REQUEST"
  | "CONFIGURATION_REQUEST";

/** Ratepay result codes */
export type RatepayResultCode =
  | "OK"
  | "NOK"
  | "ERROR"
  | "UNKNOWN";

/** Ratepay sub-operation for PAYMENT_CHANGE */
export type RatepaySubOperation =
  | "credit"
  | "return"
  | "cancellation"
  | "partial-cancellation"
  | "full-cancellation";

// ==================== Customer / Address ====================

export interface RatepayCustomer {
  firstName: string;
  lastName: string;
  gender?: "M" | "F" | "U";
  dateOfBirth?: string;  // YYYY-MM-DD
  ipAddress?: string;
  company?: string;
  vatId?: string;
  email?: string;
  phone?: string;
  fax?: string;
  nationality?: string;  // ISO 3166-1 alpha-2
  language?: string;     // ISO 639-1
  addresses: RatepayAddress[];
  bankAccount?: RatepayBankAccount;
}

export interface RatepayAddress {
  type: "BILLING" | "DELIVERY";
  firstName?: string;
  lastName?: string;
  company?: string;
  street: string;
  streetAdditional?: string;
  streetNumber?: string;
  zipCode: string;
  city: string;
  countryCode: string; // ISO 3166-1 alpha-2
}

export interface RatepayBankAccount {
  owner?: string;
  iban: string;
  bic?: string;
  bankName?: string;
}

// ==================== Shopping Basket ====================

export interface RatepayBasket {
  amount: number;       // Total amount in minor units (cents)
  currency: string;     // ISO 4217
  items: RatepayBasketItem[];
}

export interface RatepayBasketItem {
  articleNumber: string;
  uniqueArticleNumber?: string;
  description?: string;
  quantity: number;
  unitPriceGross: number;   // Minor units
  taxRate: number;           // Percentage (e.g., 19.0)
  discount?: number;         // Minor units
  descriptionAddition?: string;
  category?: string;
}

// ==================== Payment Init ====================

export interface RatepayPaymentInitRequest {
  profileId: string;
  securityCode: string;
  orderId?: string;
  operation: "PAYMENT_INIT";
}

export interface RatepayPaymentInitResponse {
  resultCode: RatepayResultCode;
  resultText?: string;
  reasonCode?: number;
  reasonText?: string;
  transactionId?: string;
  transactionShortId?: string;
}

// ==================== Payment Request ====================

export interface RatepayPaymentRequestParams {
  profileId: string;
  securityCode: string;
  transactionId: string;
  orderId?: string;
  method: RatepayPaymentMethod;
  customer: RatepayCustomer;
  basket: RatepayBasket;
  deviceToken?: string;
  installmentDetails?: RatepayInstallmentDetails;
}

export interface RatepayPaymentRequestResponse {
  resultCode: RatepayResultCode;
  resultText?: string;
  reasonCode?: number;
  reasonText?: string;
  transactionId: string;
  descriptor?: string;
}

// ==================== Payment Confirm ====================

export interface RatepayPaymentConfirmParams {
  profileId: string;
  securityCode: string;
  transactionId: string;
  orderId?: string;
}

export interface RatepayPaymentConfirmResponse {
  resultCode: RatepayResultCode;
  resultText?: string;
  reasonCode?: number;
  reasonText?: string;
  transactionId: string;
}

// ==================== Payment Change ====================

export interface RatepayPaymentChangeParams {
  profileId: string;
  securityCode: string;
  transactionId: string;
  subOperation: RatepaySubOperation;
  basket?: RatepayBasket;
  invoiceId?: string;
}

export interface RatepayPaymentChangeResponse {
  resultCode: RatepayResultCode;
  resultText?: string;
  reasonCode?: number;
  reasonText?: string;
  transactionId: string;
}

// ==================== Installment Calculation ====================

export interface RatepayInstallmentDetails {
  installmentNumber?: number;
  installmentAmount?: number;
  lastInstallmentAmount?: number;
  interestRate?: number;
  paymentFirstday?: number;
}

export interface RatepayCalculationRequest {
  profileId: string;
  securityCode: string;
  method: "INSTALLMENT";
  amount: number;
  currency: string;
  calculationType: "calculation-by-rate" | "calculation-by-time";
  installmentRate?: number;   // For calculation-by-rate
  installmentMonth?: number;  // For calculation-by-time
  paymentFirstday?: number;
}

export interface RatepayCalculationResponse {
  resultCode: RatepayResultCode;
  resultText?: string;
  successCode?: string;
  installmentPlans?: RatepayInstallmentPlan[];
}

export interface RatepayInstallmentPlan {
  numberOfRates: number;
  rate: number;
  lastRate: number;
  totalAmount: number;
  interestRate: number;
  annualPercentageRate: number;
  monthlyDebitInterest: number;
  interestAmount: number;
  serviceCharge: number;
  paymentFirstday: number;
}

// ==================== Configuration ====================

export interface RatepayConfigurationResponse {
  resultCode: RatepayResultCode;
  resultText?: string;
  interestRateMin?: number;
  interestRateDefault?: number;
  interestRateMax?: number;
  monthAllowed?: number[];
  paymentFirstday?: number;
  paymentAmount?: number;
  paymentLastrate?: number;
  rateMinNormal?: number;
  serviceCharge?: number;
  minAmount?: number;
  maxAmount?: number;
  b2b?: boolean;
  deliveryAddressEqualsShippingAddress?: boolean;
  eligibleCountries?: string[];
  deviceFingerprint?: string;
}

// ==================== Client Config ====================

export interface RatepayClientConfig {
  profileId: string;
  securityCode: string;
  /** Use sandbox environment (default: false) */
  sandbox?: boolean;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}
