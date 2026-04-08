// ── Auth ────────────────────────────────────────────────────────────────────

export interface AmazonPayClientConfig {
  merchantId: string;
  publicKeyId: string;
  privateKey: string;
  region?: 'na' | 'eu' | 'jp';
  sandbox?: boolean;
  timeout?: number;
  retries?: number;
}

// ── Checkout Sessions ───────────────────────────────────────────────────────

export interface AmazonPayPrice {
  amount: string;
  currencyCode: string;
}

export interface AmazonPayAddress {
  name: string;
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  city?: string;
  county?: string;
  district?: string;
  stateOrRegion?: string;
  postalCode?: string;
  countryCode: string;
  phoneNumber?: string;
}

export type CheckoutSessionStatus =
  | 'Open'
  | 'Completed'
  | 'Canceled';

export interface AmazonPayCheckoutSession {
  checkoutSessionId: string;
  webCheckoutDetails: {
    checkoutReviewReturnUrl?: string;
    checkoutResultReturnUrl?: string;
    checkoutCancelUrl?: string;
    amazonPayRedirectUrl?: string;
  };
  chargePermissionType: 'OneTime' | 'Recurring';
  orderReferenceId?: string;
  paymentDetails: {
    paymentIntent: 'Confirm' | 'Authorize' | 'AuthorizeWithCapture';
    canHandlePendingAuthorization: boolean;
    chargeAmount: AmazonPayPrice;
    totalOrderAmount?: AmazonPayPrice;
    softDescriptor?: string;
    presentmentCurrency?: string;
  };
  merchantMetadata?: {
    merchantReferenceId?: string;
    merchantStoreName?: string;
    noteToBuyer?: string;
    customInformation?: string;
  };
  buyer?: {
    buyerId: string;
    name: string;
    email: string;
  };
  billingAddress?: AmazonPayAddress;
  shippingAddress?: AmazonPayAddress;
  statusDetails: {
    state: CheckoutSessionStatus;
    reasonCode?: string;
    reasonDescription?: string;
  };
  creationTimestamp: string;
  expirationTimestamp?: string;
  productType?: 'PayAndShip' | 'PayOnly';
}

export interface CreateCheckoutSessionParams {
  webCheckoutDetails: {
    checkoutReviewReturnUrl?: string;
    checkoutResultReturnUrl?: string;
    checkoutCancelUrl?: string;
    checkoutMode?: 'ProcessOrder';
  };
  storeId: string;
  chargePermissionType?: 'OneTime' | 'Recurring';
  scopes?: Array<'name' | 'email' | 'phoneNumber' | 'billingAddress'>;
  paymentDetails?: {
    paymentIntent: 'Confirm' | 'Authorize' | 'AuthorizeWithCapture';
    canHandlePendingAuthorization?: boolean;
    chargeAmount?: AmazonPayPrice;
    totalOrderAmount?: AmazonPayPrice;
    softDescriptor?: string;
    presentmentCurrency?: string;
  };
  merchantMetadata?: {
    merchantReferenceId?: string;
    merchantStoreName?: string;
    noteToBuyer?: string;
    customInformation?: string;
  };
  addressDetails?: {
    districtOrCounty?: string;
  };
  platformId?: string;
  providerMetadata?: {
    providerReferenceId: string;
  };
  deliverySpecifications?: {
    specialRestrictions: string[];
    addressRestrictions?: {
      type: 'Allowed' | 'NotAllowed';
      restrictions: Record<string, { zipCodes?: string[]; statesOrRegions?: string[] }>;
    };
  };
}

export interface UpdateCheckoutSessionParams {
  webCheckoutDetails?: {
    checkoutResultReturnUrl?: string;
    checkoutCancelUrl?: string;
  };
  paymentDetails?: {
    paymentIntent?: 'Confirm' | 'Authorize' | 'AuthorizeWithCapture';
    canHandlePendingAuthorization?: boolean;
    chargeAmount?: AmazonPayPrice;
    totalOrderAmount?: AmazonPayPrice;
    softDescriptor?: string;
  };
  merchantMetadata?: {
    merchantReferenceId?: string;
    merchantStoreName?: string;
    noteToBuyer?: string;
    customInformation?: string;
  };
}

export interface CompleteCheckoutSessionParams {
  chargeAmount: AmazonPayPrice;
  totalOrderAmount?: AmazonPayPrice;
}

// ── Charges ─────────────────────────────────────────────────────────────────

export type ChargeStatus = 'AuthorizationInitiated' | 'Authorized' | 'CaptureInitiated' | 'Captured' | 'Canceled' | 'Declined';

export interface AmazonPayCharge {
  chargeId: string;
  chargePermissionId: string;
  chargeAmount: AmazonPayPrice;
  captureAmount?: AmazonPayPrice;
  refundedAmount?: AmazonPayPrice;
  softDescriptor?: string;
  merchantMetadata?: {
    merchantReferenceId?: string;
    merchantStoreName?: string;
    noteToBuyer?: string;
    customInformation?: string;
  };
  providerMetadata?: {
    providerReferenceId: string;
  };
  statusDetails: {
    state: ChargeStatus;
    reasonCode?: string;
    reasonDescription?: string;
  };
  creationTimestamp: string;
  expirationTimestamp?: string;
  convertedAmount?: AmazonPayPrice;
  conversionRate?: number;
  releaseEnvironment?: string;
}

export interface CreateChargeParams {
  chargePermissionId: string;
  chargeAmount: AmazonPayPrice;
  captureNow?: boolean;
  softDescriptor?: string;
  canHandlePendingAuthorization?: boolean;
  merchantMetadata?: {
    merchantReferenceId?: string;
    merchantStoreName?: string;
    noteToBuyer?: string;
    customInformation?: string;
  };
  providerMetadata?: {
    providerReferenceId: string;
  };
}

export interface CaptureChargeParams {
  captureAmount: AmazonPayPrice;
  softDescriptor?: string;
}

// ── Refunds ─────────────────────────────────────────────────────────────────

export type RefundStatus = 'RefundInitiated' | 'Refunded' | 'Declined';

export interface AmazonPayRefund {
  refundId: string;
  chargeId: string;
  refundAmount: AmazonPayPrice;
  softDescriptor?: string;
  statusDetails: {
    state: RefundStatus;
    reasonCode?: string;
    reasonDescription?: string;
  };
  creationTimestamp: string;
}

export interface CreateRefundParams {
  chargeId: string;
  refundAmount: AmazonPayPrice;
  softDescriptor?: string;
}
