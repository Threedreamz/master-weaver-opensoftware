// ── Auth ────────────────────────────────────────────────────────────────────

export interface GooglePayClientConfig {
  /**
   * The Google-provided merchant ID from the Google Pay Business Console.
   */
  merchantId: string;
  /**
   * The merchant name displayed to users during the payment flow.
   */
  merchantName: string;
  /**
   * Gateway-specific configuration (e.g., for Stripe, Braintree, Adyen).
   */
  gateway: {
    name: string;
    merchantId: string;
  };
  /**
   * Environment: TEST for sandbox, PRODUCTION for live.
   */
  environment?: 'TEST' | 'PRODUCTION';
  timeout?: number;
  retries?: number;
}

// ── Payment Data Request ────────────────────────────────────────────────────

export type GooglePayCardNetwork = 'AMEX' | 'DISCOVER' | 'INTERAC' | 'JCB' | 'MASTERCARD' | 'VISA';

export type GooglePayAuthMethod = 'PAN_ONLY' | 'CRYPTOGRAM_3DS';

export interface GooglePayCardParameters {
  allowedAuthMethods: GooglePayAuthMethod[];
  allowedCardNetworks: GooglePayCardNetwork[];
  allowPrepaidCards?: boolean;
  allowCreditCards?: boolean;
  billingAddressRequired?: boolean;
  billingAddressParameters?: {
    format?: 'MIN' | 'FULL';
    phoneNumberRequired?: boolean;
  };
}

export interface GooglePayTokenizationSpecification {
  type: 'PAYMENT_GATEWAY' | 'DIRECT';
  parameters: {
    gateway?: string;
    gatewayMerchantId?: string;
    protocolVersion?: string;
    publicKey?: string;
  };
}

export interface GooglePayPaymentMethodSpecification {
  type: 'CARD';
  parameters: GooglePayCardParameters;
  tokenizationSpecification: GooglePayTokenizationSpecification;
}

export interface GooglePayTransactionInfo {
  countryCode: string;
  currencyCode: string;
  totalPriceStatus: 'NOT_CURRENTLY_KNOWN' | 'ESTIMATED' | 'FINAL';
  totalPrice: string;
  totalPriceLabel?: string;
  checkoutOption?: 'DEFAULT' | 'COMPLETE_IMMEDIATE_PURCHASE';
  displayItems?: Array<{
    label: string;
    type: 'LINE_ITEM' | 'SUBTOTAL' | 'TAX' | 'DISCOUNT' | 'SHIPPING_OPTION';
    price: string;
    status?: 'FINAL' | 'PENDING';
  }>;
}

export interface GooglePayMerchantInfo {
  merchantId: string;
  merchantName: string;
}

export interface GooglePayPaymentDataRequest {
  apiVersion: 2;
  apiVersionMinor: 0;
  merchantInfo: GooglePayMerchantInfo;
  allowedPaymentMethods: GooglePayPaymentMethodSpecification[];
  transactionInfo: GooglePayTransactionInfo;
  emailRequired?: boolean;
  shippingAddressRequired?: boolean;
  shippingAddressParameters?: {
    allowedCountryCodes?: string[];
    phoneNumberRequired?: boolean;
  };
  shippingOptionRequired?: boolean;
  shippingOptionParameters?: {
    defaultSelectedOptionId?: string;
    shippingOptions: Array<{
      id: string;
      label: string;
      description: string;
    }>;
  };
  callbackIntents?: Array<'OFFER' | 'PAYMENT_AUTHORIZATION' | 'SHIPPING_ADDRESS' | 'SHIPPING_OPTION'>;
}

// ── Payment Data Response ───────────────────────────────────────────────────

export interface GooglePayPaymentData {
  apiVersion: 2;
  apiVersionMinor: 0;
  paymentMethodData: {
    type: 'CARD';
    description: string;
    info: {
      cardNetwork: GooglePayCardNetwork;
      cardDetails: string;
      billingAddress?: GooglePayAddress;
      assuranceDetails?: {
        accountVerified: boolean;
        cardHolderAuthenticated: boolean;
      };
    };
    tokenizationData: {
      type: 'PAYMENT_GATEWAY' | 'DIRECT';
      token: string;
    };
  };
  email?: string;
  shippingAddress?: GooglePayAddress;
}

export interface GooglePayAddress {
  name: string;
  postalCode: string;
  countryCode: string;
  phoneNumber?: string;
  address1: string;
  address2?: string;
  address3?: string;
  locality: string;
  administrativeArea: string;
  sortingCode?: string;
}

// ── Parsed Token ────────────────────────────────────────────────────────────

export interface GooglePayGatewayToken {
  signature: string;
  intermediateSigningKey: {
    signedKey: string;
    signatures: string[];
  };
  protocolVersion: string;
  signedMessage: string;
}

export interface GooglePaySignedMessage {
  encryptedMessage: string;
  ephemeralPublicKey: string;
  tag: string;
}

export interface GooglePayDecryptedMessage {
  messageExpiration: string;
  messageId: string;
  paymentMethod: 'CARD';
  paymentMethodDetails: {
    expirationYear: number;
    expirationMonth: number;
    pan: string;
    authMethod: GooglePayAuthMethod;
    cryptogram?: string;
    eciIndicator?: string;
  };
}

// ── IsReadyToPay ────────────────────────────────────────────────────────────

export interface GooglePayIsReadyToPayRequest {
  apiVersion: 2;
  apiVersionMinor: 0;
  allowedPaymentMethods: Array<{
    type: 'CARD';
    parameters: GooglePayCardParameters;
  }>;
  existingPaymentMethodRequired?: boolean;
}

export interface GooglePayIsReadyToPayResponse {
  result: boolean;
  paymentMethodPresent?: boolean;
}
