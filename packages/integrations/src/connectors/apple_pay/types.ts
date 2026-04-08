// ── Auth ────────────────────────────────────────────────────────────────────

export interface ApplePayClientConfig {
  merchantIdentifier: string;
  displayName: string;
  initiative: 'web' | 'messaging';
  initiativeContext: string;
  merchantIdentityCertificate: string;
  merchantIdentityCertificateKey: string;
  paymentProcessingCertificate?: string;
  paymentProcessingCertificateKey?: string;
  timeout?: number;
  retries?: number;
}

// ── Merchant Validation ─────────────────────────────────────────────────────

export interface MerchantValidationRequest {
  merchantIdentifier: string;
  displayName: string;
  initiative: 'web' | 'messaging';
  initiativeContext: string;
}

export interface MerchantSession {
  epochInternetDate: number;
  expiresAt: number;
  merchantSessionIdentifier: string;
  nonce: string;
  merchantIdentifier: string;
  domainName: string;
  displayName: string;
  signature: string;
  operationalAnalyticsIdentifier: string;
  retries: number;
  pspId: string;
}

// ── Payment ─────────────────────────────────────────────────────────────────

export interface ApplePayPaymentContact {
  phoneNumber?: string;
  emailAddress?: string;
  givenName?: string;
  familyName?: string;
  phoneticGivenName?: string;
  phoneticFamilyName?: string;
  addressLines?: string[];
  subLocality?: string;
  locality?: string;
  postalCode?: string;
  subAdministrativeArea?: string;
  administrativeArea?: string;
  country?: string;
  countryCode?: string;
}

export interface ApplePayPaymentMethod {
  displayName: string;
  network: string;
  type: 'debit' | 'credit' | 'prepaid' | 'store';
  paymentPass?: {
    primaryAccountIdentifier: string;
    primaryAccountNumberSuffix: string;
    deviceAccountIdentifier?: string;
    deviceAccountNumberSuffix?: string;
    activationState: 'activated' | 'requiresActivation' | 'activating' | 'suspended' | 'deactivated';
  };
  billingContact?: ApplePayPaymentContact;
}

export interface ApplePayPaymentToken {
  paymentData: {
    data: string;
    signature: string;
    header: {
      ephemeralPublicKey?: string;
      publicKeyHash: string;
      transactionId: string;
      wrappedKey?: string;
    };
    version: 'EC_v1' | 'RSA_v1';
  };
  paymentMethod: ApplePayPaymentMethod;
  transactionIdentifier: string;
}

export interface ApplePayPayment {
  token: ApplePayPaymentToken;
  billingContact?: ApplePayPaymentContact;
  shippingContact?: ApplePayPaymentContact;
}

// ── Payment Request ─────────────────────────────────────────────────────────

export interface ApplePayLineItem {
  label: string;
  amount: string;
  type?: 'final' | 'pending';
}

export interface ApplePayPaymentRequest {
  countryCode: string;
  currencyCode: string;
  supportedNetworks: Array<'visa' | 'masterCard' | 'amex' | 'discover' | 'jcb' | 'elo' | 'chinaUnionPay' | 'interac' | 'privateLabel'>;
  merchantCapabilities: Array<'supports3DS' | 'supportsEMV' | 'supportsCredit' | 'supportsDebit'>;
  total: ApplePayLineItem;
  lineItems?: ApplePayLineItem[];
  requiredBillingContactFields?: Array<'postalAddress' | 'phone' | 'email' | 'name'>;
  requiredShippingContactFields?: Array<'postalAddress' | 'phone' | 'email' | 'name'>;
  shippingMethods?: Array<{
    label: string;
    detail: string;
    amount: string;
    identifier: string;
  }>;
  shippingType?: 'shipping' | 'delivery' | 'storePickup' | 'servicePickup';
  applicationData?: string;
}

// ── Decrypted Token ─────────────────────────────────────────────────────────

export interface ApplePayDecryptedToken {
  applicationPrimaryAccountNumber: string;
  applicationExpirationDate: string;
  currencyCode: string;
  transactionAmount: number;
  cardholderName?: string;
  deviceManufacturerIdentifier: string;
  paymentDataType: '3DSecure' | 'EMV';
  paymentData: {
    onlinePaymentCryptogram: string;
    eciIndicator?: string;
    emvData?: string;
    encryptedPINData?: string;
  };
}
