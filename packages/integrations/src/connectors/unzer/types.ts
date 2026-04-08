// ==================== Unzer API Types ====================

/** Unzer currency amount (decimal string) */
export type UnzerCurrency = string;

/** Unzer transaction status */
export type UnzerTransactionStatus =
  | "pending"
  | "completed"
  | "canceled"
  | "partly"
  | "payment review"
  | "chargeback";

/** Unzer payment state */
export type UnzerPaymentState =
  | 0  // pending
  | 1  // completed
  | 2  // canceled
  | 3  // partly
  | 4; // payment review

/** Unzer payment method types */
export type UnzerPaymentType =
  | "card"
  | "sepa-direct-debit"
  | "sepa-direct-debit-guaranteed"
  | "invoice"
  | "invoice-guaranteed"
  | "sofort"
  | "giropay"
  | "paypal"
  | "prepayment"
  | "eps"
  | "ideal"
  | "alipay"
  | "wechatpay"
  | "przelewy24"
  | "bancontact"
  | string;

// ==================== Resources ====================

export interface UnzerCustomer {
  id?: string;
  firstname?: string;
  lastname?: string;
  salutation?: "mr" | "mrs" | "unknown";
  company?: string;
  customerId?: string;
  birthDate?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  billingAddress?: UnzerAddress;
  shippingAddress?: UnzerAddress;
  companyInfo?: UnzerCompanyInfo;
}

export interface UnzerAddress {
  name?: string;
  street?: string;
  state?: string;
  zip?: string;
  city?: string;
  country?: string;
}

export interface UnzerCompanyInfo {
  registrationType?: "registered" | "not_registered";
  commercialRegisterNumber?: string;
  function?: string;
  commercialSector?: string;
}

export interface UnzerMetadata {
  id?: string;
  [key: string]: unknown;
}

export interface UnzerBasket {
  id?: string;
  amountTotalGross: number;
  amountTotalDiscount?: number;
  amountTotalVat?: number;
  currencyCode: string;
  orderId?: string;
  note?: string;
  basketItems: UnzerBasketItem[];
}

export interface UnzerBasketItem {
  basketItemReferenceId?: string;
  title: string;
  quantity: number;
  amountPerUnit: number;
  amountNet?: number;
  amountDiscount?: number;
  amountGross: number;
  vat?: number;
  type?: "goods" | "shipment" | "voucher" | "digital";
  subTitle?: string;
  imageUrl?: string;
  unit?: string;
}

// ==================== Payment Types (Resources) ====================

export interface UnzerCardResource {
  id?: string;
  number?: string;
  cvc?: string;
  expiryDate?: string;
  brand?: string;
  holder?: string;
  method?: string;
  "3ds"?: boolean;
}

export interface UnzerSepaResource {
  id?: string;
  iban?: string;
  bic?: string;
  holder?: string;
}

// ==================== Charges & Authorizations ====================

export interface UnzerAuthorizeRequest {
  amount: number;
  currency: string;
  returnUrl?: string;
  typeId: string;
  customerId?: string;
  metadataId?: string;
  basketId?: string;
  orderId?: string;
  invoiceId?: string;
  card3ds?: boolean;
}

export interface UnzerChargeRequest {
  amount: number;
  currency: string;
  returnUrl?: string;
  typeId: string;
  customerId?: string;
  metadataId?: string;
  basketId?: string;
  orderId?: string;
  invoiceId?: string;
  paymentReference?: string;
}

export interface UnzerTransaction {
  id: string;
  isSuccess: boolean;
  isPending: boolean;
  isError: boolean;
  message: {
    code: string;
    merchant: string;
    customer: string;
  };
  amount: string;
  currency: string;
  date: string;
  resources: {
    customerId?: string;
    paymentId?: string;
    basketId?: string;
    metadataId?: string;
    typeId?: string;
    traceId?: string;
    uniqueId?: string;
    shortId?: string;
  };
  processing: {
    uniqueId?: string;
    shortId?: string;
    traceId?: string;
  };
  redirectUrl?: string;
}

// ==================== Payments ====================

export interface UnzerPayment {
  id: string;
  state: {
    id: UnzerPaymentState;
    name: string;
  };
  currency: string;
  orderId?: string;
  invoiceId?: string;
  resources: {
    customerId?: string;
    paymentId: string;
    basketId?: string;
    metadataId?: string;
    typeId?: string;
  };
  transactions: UnzerTransactionRef[];
  amount: {
    total: string;
    charged: string;
    canceled: string;
    remaining: string;
  };
}

export interface UnzerTransactionRef {
  type: "authorize" | "charge" | "cancel-authorize" | "cancel-charge";
  url: string;
  amount: string;
  date: string;
  status: string;
}

// ==================== Cancel / Refund ====================

export interface UnzerCancelRequest {
  amount?: number;
  paymentReference?: string;
  reasonCode?: "CANCEL" | "RETURN" | "CREDIT";
}

// ==================== Client Config ====================

export interface UnzerClientConfig {
  privateKey: string;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}
