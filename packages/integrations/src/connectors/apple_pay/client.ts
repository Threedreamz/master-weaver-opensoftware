import { createDecipheriv, createPrivateKey, createPublicKey, diffieHellman, createHash, privateDecrypt, constants } from 'node:crypto';
import https from 'node:https';
import { BaseIntegrationClient } from '../../core/base-client.js';
import type {
  ApplePayClientConfig,
  MerchantSession,
  MerchantValidationRequest,
  ApplePayPaymentToken,
  ApplePayDecryptedToken,
} from './types.js';

const APPLE_PAY_VALIDATION_URL = 'https://apple-pay-gateway.apple.com/paymentservices/paymentSession';

export class ApplePayClient extends BaseIntegrationClient {
  private readonly merchantIdentifier: string;
  private readonly displayName: string;
  private readonly initiative: 'web' | 'messaging';
  private readonly initiativeContext: string;
  private readonly merchantCert: string;
  private readonly merchantCertKey: string;
  private readonly processingCert?: string;
  private readonly processingCertKey?: string;

  constructor(config: ApplePayClientConfig) {
    super({
      baseUrl: 'https://apple-pay-gateway.apple.com',
      authType: 'none',
      credentials: {},
      timeout: config.timeout ?? 30_000,
      retry: config.retries ? { maxRetries: config.retries, baseDelayMs: 1000, maxDelayMs: 10_000 } : undefined,
      rateLimit: { requestsPerMinute: 10 * 60 },
    });
    this.merchantIdentifier = config.merchantIdentifier;
    this.displayName = config.displayName;
    this.initiative = config.initiative;
    this.initiativeContext = config.initiativeContext;
    this.merchantCert = config.merchantIdentityCertificate;
    this.merchantCertKey = config.merchantIdentityCertificateKey;
    this.processingCert = config.paymentProcessingCertificate;
    this.processingCertKey = config.paymentProcessingCertificateKey;
  }

  /**
   * Validates the merchant session with Apple Pay servers.
   * This must be called from the server side when the Apple Pay JS session
   * fires the onvalidatemerchant event. The validationURL from that event
   * should be passed here.
   */
  async validateMerchant(validationUrl?: string): Promise<MerchantSession> {
    const url = validationUrl ?? APPLE_PAY_VALIDATION_URL;

    const requestBody: MerchantValidationRequest = {
      merchantIdentifier: this.merchantIdentifier,
      displayName: this.displayName,
      initiative: this.initiative,
      initiativeContext: this.initiativeContext,
    };

    return new Promise<MerchantSession>((resolve, reject) => {
      const parsedUrl = new URL(url);
      const postData = JSON.stringify(requestBody);

      const req = https.request(
        {
          hostname: parsedUrl.hostname,
          port: 443,
          path: parsedUrl.pathname,
          method: 'POST',
          cert: this.merchantCert,
          key: this.merchantCertKey,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(JSON.parse(data) as MerchantSession);
            } else {
              reject(new Error(`Apple Pay merchant validation failed: ${res.statusCode} ${data}`));
            }
          });
        },
      );

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  /**
   * Decrypts an Apple Pay payment token using the payment processing certificate.
   * This handles the EC_v1 token format used by Apple Pay on the Web.
   */
  decryptPaymentToken(token: ApplePayPaymentToken): ApplePayDecryptedToken {
    if (!this.processingCertKey) {
      throw new Error('Payment processing certificate key is required to decrypt tokens');
    }

    const { paymentData } = token;

    if (paymentData.version === 'EC_v1') {
      return this.decryptEC_v1(paymentData);
    }

    if (paymentData.version === 'RSA_v1') {
      return this.decryptRSA_v1(paymentData);
    }

    throw new Error(`Unsupported payment data version: ${paymentData.version}`);
  }

  private decryptEC_v1(paymentData: ApplePayPaymentToken['paymentData']): ApplePayDecryptedToken {
    if (!this.processingCertKey || !paymentData.header.ephemeralPublicKey) {
      throw new Error('Missing ephemeralPublicKey or processing certificate key for EC_v1 decryption');
    }

    const ephemeralPublicKeyBuffer = Buffer.from(paymentData.header.ephemeralPublicKey, 'base64');
    const ephemeralPublicKey = createPublicKey({
      key: ephemeralPublicKeyBuffer,
      format: 'der',
      type: 'spki',
    });

    const merchantPrivateKey = createPrivateKey({
      key: this.processingCertKey,
      format: 'pem',
    });

    const sharedSecret = diffieHellman({
      privateKey: merchantPrivateKey,
      publicKey: ephemeralPublicKey,
    });

    const merchantId = createHash('sha256')
      .update(Buffer.from(this.merchantIdentifier, 'utf8'))
      .digest();

    const kdfInfo = Buffer.concat([
      Buffer.from([0, 0, 0, 13]),
      Buffer.from('id-aes256-GCM', 'utf8'),
      Buffer.from('Apple', 'utf8'),
      merchantId,
    ]);

    const kdfHash = createHash('sha256')
      .update(Buffer.concat([
        Buffer.from([0, 0, 0, 1]),
        sharedSecret,
        kdfInfo,
      ]))
      .digest();

    const symmetricKey = kdfHash;
    const encryptedData = Buffer.from(paymentData.data, 'base64');
    const iv = Buffer.alloc(16, 0);

    const decipher = createDecipheriv('aes-256-gcm', symmetricKey, iv);
    const tag = encryptedData.subarray(encryptedData.length - 16);
    const ciphertext = encryptedData.subarray(0, encryptedData.length - 16);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8')) as ApplePayDecryptedToken;
  }

  private decryptRSA_v1(paymentData: ApplePayPaymentToken['paymentData']): ApplePayDecryptedToken {
    if (!this.processingCertKey || !paymentData.header.wrappedKey) {
      throw new Error('Missing wrappedKey or processing certificate key for RSA_v1 decryption');
    }

    const wrappedKey = Buffer.from(paymentData.header.wrappedKey, 'base64');

    const merchantPrivateKey = createPrivateKey({
      key: this.processingCertKey,
      format: 'pem',
    });

    const symmetricKey = privateDecrypt(
      {
        key: merchantPrivateKey,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      wrappedKey,
    );

    const encryptedData = Buffer.from(paymentData.data, 'base64');
    const iv = Buffer.alloc(16, 0);

    const decipher = createDecipheriv('aes-256-gcm', symmetricKey, iv);
    const tag = encryptedData.subarray(encryptedData.length - 16);
    const ciphertext = encryptedData.subarray(0, encryptedData.length - 16);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8')) as ApplePayDecryptedToken;
  }
}
