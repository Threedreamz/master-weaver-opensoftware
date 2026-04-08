import { createDecipheriv, createHash, createPublicKey, createVerify } from 'node:crypto';
import { BaseIntegrationClient } from '../../core/base-client.js';
import type { ApiResponse } from '../../core/types.js';
import type {
  GooglePayClientConfig,
  GooglePayPaymentDataRequest,
  GooglePayPaymentMethodSpecification,
  GooglePayTransactionInfo,
  GooglePayPaymentData,
  GooglePayGatewayToken,
  GooglePaySignedMessage,
  GooglePayDecryptedMessage,
  GooglePayIsReadyToPayRequest,
  GooglePayCardNetwork,
  GooglePayAuthMethod,
} from './types.js';

/**
 * Google Pay server-side client.
 *
 * Google Pay is primarily a client-side API (Google Pay JS SDK or Android SDK),
 * so this client provides helpers for:
 * 1. Building payment data requests for the client-side SDK
 * 2. Parsing and verifying payment tokens received from the client
 * 3. Interacting with the Google Pay Passes API for transaction records
 */
export class GooglePayClient extends BaseIntegrationClient {
  private readonly merchantId: string;
  private readonly merchantName: string;
  private readonly gatewayName: string;
  private readonly gatewayMerchantId: string;
  private readonly environment: 'TEST' | 'PRODUCTION';

  /**
   * Google's root signing keys for verifying payment tokens.
   * In production, these should be fetched from:
   * https://payments.developers.google.com/paymentmethodtoken/keys.json
   */
  private rootSigningKeys: Array<{ keyValue: string; protocolVersion: string; keyExpiration?: string }> = [];

  constructor(config: GooglePayClientConfig) {
    super({
      baseUrl: 'https://pay.google.com',
      authType: 'none',
      credentials: {},
      timeout: config.timeout ?? 30_000,
      retry: config.retries ? { maxRetries: config.retries, baseDelayMs: 1000, maxDelayMs: 10_000 } : undefined,
      rateLimit: { requestsPerMinute: 50 * 60 },
    });
    this.merchantId = config.merchantId;
    this.merchantName = config.merchantName;
    this.gatewayName = config.gateway.name;
    this.gatewayMerchantId = config.gateway.merchantId;
    this.environment = config.environment ?? 'TEST';
  }

  /**
   * Fetches Google's root signing keys used to verify payment tokens.
   * Should be called periodically and cached.
   */
  async fetchRootSigningKeys(): Promise<void> {
    const url = this.environment === 'TEST'
      ? 'https://payments.developers.google.com/paymentmethodtoken/test/keys.json'
      : 'https://payments.developers.google.com/paymentmethodtoken/keys.json';

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Pay root signing keys: ${response.status}`);
    }

    const data = (await response.json()) as { keys: Array<{ keyValue: string; protocolVersion: string; keyExpiration?: string }> };
    this.rootSigningKeys = data.keys;
  }

  /**
   * Builds an IsReadyToPay request for the client-side SDK.
   */
  buildIsReadyToPayRequest(
    allowedCardNetworks: GooglePayCardNetwork[] = ['AMEX', 'DISCOVER', 'MASTERCARD', 'VISA'],
    allowedAuthMethods: GooglePayAuthMethod[] = ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
  ): GooglePayIsReadyToPayRequest {
    return {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [
        {
          type: 'CARD',
          parameters: {
            allowedAuthMethods,
            allowedCardNetworks,
          },
        },
      ],
    };
  }

  /**
   * Builds a PaymentDataRequest for the client-side SDK.
   */
  buildPaymentDataRequest(
    transactionInfo: GooglePayTransactionInfo,
    options?: {
      allowedCardNetworks?: GooglePayCardNetwork[];
      allowedAuthMethods?: GooglePayAuthMethod[];
      emailRequired?: boolean;
      shippingAddressRequired?: boolean;
      allowedCountryCodes?: string[];
      billingAddressRequired?: boolean;
      billingAddressFormat?: 'MIN' | 'FULL';
      callbackIntents?: Array<'OFFER' | 'PAYMENT_AUTHORIZATION' | 'SHIPPING_ADDRESS' | 'SHIPPING_OPTION'>;
    },
  ): GooglePayPaymentDataRequest {
    const cardNetworks = options?.allowedCardNetworks ?? ['AMEX', 'DISCOVER', 'MASTERCARD', 'VISA'];
    const authMethods = options?.allowedAuthMethods ?? ['PAN_ONLY', 'CRYPTOGRAM_3DS'];

    const paymentMethod: GooglePayPaymentMethodSpecification = {
      type: 'CARD',
      parameters: {
        allowedAuthMethods: authMethods,
        allowedCardNetworks: cardNetworks,
        billingAddressRequired: options?.billingAddressRequired,
        billingAddressParameters: options?.billingAddressRequired
          ? { format: options?.billingAddressFormat ?? 'MIN' }
          : undefined,
      },
      tokenizationSpecification: {
        type: 'PAYMENT_GATEWAY',
        parameters: {
          gateway: this.gatewayName,
          gatewayMerchantId: this.gatewayMerchantId,
        },
      },
    };

    const request: GooglePayPaymentDataRequest = {
      apiVersion: 2,
      apiVersionMinor: 0,
      merchantInfo: {
        merchantId: this.merchantId,
        merchantName: this.merchantName,
      },
      allowedPaymentMethods: [paymentMethod],
      transactionInfo,
      emailRequired: options?.emailRequired,
      shippingAddressRequired: options?.shippingAddressRequired,
      callbackIntents: options?.callbackIntents,
    };

    if (options?.shippingAddressRequired && options.allowedCountryCodes) {
      request.shippingAddressParameters = {
        allowedCountryCodes: options.allowedCountryCodes,
      };
    }

    return request;
  }

  /**
   * Parses the payment token from a GooglePayPaymentData response.
   * The token string from tokenizationData is a JSON-encoded GooglePayGatewayToken.
   */
  parsePaymentToken(paymentData: GooglePayPaymentData): GooglePayGatewayToken {
    const tokenString = paymentData.paymentMethodData.tokenizationData.token;
    return JSON.parse(tokenString) as GooglePayGatewayToken;
  }

  /**
   * Verifies a Google Pay payment token's signature chain using the root signing keys.
   * Returns true if the token signature is valid.
   */
  verifyPaymentToken(token: GooglePayGatewayToken): boolean {
    if (this.rootSigningKeys.length === 0) {
      throw new Error('Root signing keys not loaded. Call fetchRootSigningKeys() first.');
    }

    const matchingKeys = this.rootSigningKeys.filter(
      (k) => k.protocolVersion === token.protocolVersion,
    );

    if (matchingKeys.length === 0) {
      return false;
    }

    const { intermediateSigningKey } = token;
    const signedKeyData = intermediateSigningKey.signedKey;

    const isIntermediateValid = matchingKeys.some((rootKey) => {
      return intermediateSigningKey.signatures.some((sig) => {
        const signedData = this.buildSignedData('Google', 'ECv2', signedKeyData);
        const verifier = createVerify('SHA256');
        verifier.update(signedData);
        const publicKey = createPublicKey({
          key: Buffer.from(rootKey.keyValue, 'base64'),
          format: 'der',
          type: 'spki',
        });
        return verifier.verify(publicKey, sig, 'base64');
      });
    });

    if (!isIntermediateValid) {
      return false;
    }

    const parsedSignedKey = JSON.parse(signedKeyData) as { keyValue: string; keyExpiration: string };

    const now = Date.now();
    if (parseInt(parsedSignedKey.keyExpiration, 10) < now) {
      return false;
    }

    const messageSignedData = this.buildSignedData('Google', 'ECv2', token.signedMessage);
    const messageVerifier = createVerify('SHA256');
    messageVerifier.update(messageSignedData);

    const intermediatePublicKey = createPublicKey({
      key: Buffer.from(parsedSignedKey.keyValue, 'base64'),
      format: 'der',
      type: 'spki',
    });

    return messageVerifier.verify(intermediatePublicKey, token.signature, 'base64');
  }

  /**
   * Parses the signed message from a verified token into its components.
   */
  parseSignedMessage(token: GooglePayGatewayToken): GooglePaySignedMessage {
    return JSON.parse(token.signedMessage) as GooglePaySignedMessage;
  }

  /**
   * Extracts card details from a GooglePayPaymentData response.
   * This returns the non-sensitive card info available without decryption.
   */
  extractCardInfo(paymentData: GooglePayPaymentData): {
    cardNetwork: string;
    cardDetails: string;
    billingAddress?: GooglePayPaymentData['paymentMethodData']['info']['billingAddress'];
  } {
    const { info } = paymentData.paymentMethodData;
    return {
      cardNetwork: info.cardNetwork,
      cardDetails: info.cardDetails,
      billingAddress: info.billingAddress,
    };
  }

  private buildSignedData(sender: string, protocolVersion: string, signedMessage: string): Buffer {
    const senderBytes = Buffer.from(sender, 'utf8');
    const protocolBytes = Buffer.from(protocolVersion, 'utf8');
    const messageBytes = Buffer.from(signedMessage, 'utf8');

    const senderLength = Buffer.alloc(4);
    senderLength.writeUInt32LE(senderBytes.length);

    const protocolLength = Buffer.alloc(4);
    protocolLength.writeUInt32LE(protocolBytes.length);

    const messageLength = Buffer.alloc(4);
    messageLength.writeUInt32LE(messageBytes.length);

    return Buffer.concat([
      senderLength, senderBytes,
      protocolLength, protocolBytes,
      messageLength, messageBytes,
    ]);
  }
}
