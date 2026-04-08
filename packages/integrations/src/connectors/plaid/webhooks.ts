import { createHmac, createVerify } from "node:crypto";
import type { PlaidWebhookPayload, PlaidWebhookType, PlaidWebhookCode } from "./types.js";

/**
 * Parsed and verified Plaid webhook event.
 */
export interface PlaidWebhookEvent {
  type: PlaidWebhookType;
  code: PlaidWebhookCode;
  itemId: string;
  environment: string;
  error: PlaidWebhookPayload["error"];
  raw: PlaidWebhookPayload;
}

/**
 * Plaid sends webhooks as JWTs signed with ES256 (ECDSA P-256).
 * The JWT header contains a `kid` (key ID) which you use to fetch
 * the public verification key from Plaid's `/webhook_verification_key/get` endpoint.
 *
 * For simplified webhook verification using HMAC (when configured via Plaid Dashboard
 * with a shared secret), use `verifyPlaidWebhookHmac`.
 */

/**
 * Decode a Plaid webhook JWT without full verification.
 * Returns the parsed header and payload.
 * Use `verifyPlaidWebhookJwt` for cryptographic verification.
 */
export function decodePlaidWebhookJwt(token: string): {
  header: { alg: string; kid: string; typ: string };
  payload: PlaidWebhookPayload;
} {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT: expected 3 parts");
  }

  const header = JSON.parse(Buffer.from(parts[0]!, "base64url").toString("utf-8"));
  const payload = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf-8")) as PlaidWebhookPayload;

  return { header, payload };
}

/**
 * Extract the key ID from a Plaid webhook JWT.
 * Use this to fetch the corresponding verification key from the Plaid API.
 */
export function extractKeyIdFromWebhook(token: string): string {
  const { header } = decodePlaidWebhookJwt(token);
  if (!header.kid) {
    throw new Error("Webhook JWT missing key ID (kid)");
  }
  return header.kid;
}

/**
 * Verify a Plaid webhook JWT using an ECDSA P-256 public key.
 *
 * @param token - The raw JWT string from the webhook body
 * @param publicKeyPem - PEM-encoded ECDSA P-256 public key from Plaid's verification key endpoint
 * @returns The verified webhook payload
 */
export function verifyPlaidWebhookJwt(
  token: string,
  publicKeyPem: string,
): PlaidWebhookPayload {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT: expected 3 parts");
  }

  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];
  const signedContent = `${headerB64}.${payloadB64}`;
  const signature = Buffer.from(signatureB64, "base64url");

  const verifier = createVerify("SHA256");
  verifier.update(signedContent);

  const isValid = verifier.verify(publicKeyPem, signature);
  if (!isValid) {
    throw new Error("Invalid webhook signature");
  }

  return JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8")) as PlaidWebhookPayload;
}

/**
 * Verify a Plaid webhook using HMAC-SHA256 (simplified verification).
 * Some Plaid configurations send a `Plaid-Verification` header with an HMAC.
 */
export function verifyPlaidWebhookHmac(
  body: string,
  signature: string,
  secret: string,
): boolean {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  if (expected.length !== signature.length) return false;

  // Timing-safe comparison
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Parse a verified Plaid webhook payload into a structured event.
 */
export function parsePlaidWebhook(payload: PlaidWebhookPayload): PlaidWebhookEvent {
  return {
    type: payload.webhook_type,
    code: payload.webhook_code,
    itemId: payload.item_id,
    environment: payload.environment,
    error: payload.error,
    raw: payload,
  };
}

/**
 * Determine if a webhook indicates the item needs user attention
 * (e.g., re-authentication required).
 */
export function isPlaidItemActionRequired(event: PlaidWebhookEvent): boolean {
  if (event.type === "ITEM") {
    return [
      "ERROR",
      "PENDING_EXPIRATION",
      "USER_PERMISSION_REVOKED",
      "USER_ACCOUNT_REVOKED",
    ].includes(event.code);
  }
  return false;
}

/**
 * Determine if a webhook indicates new transaction data is available.
 */
export function isPlaidTransactionUpdate(event: PlaidWebhookEvent): boolean {
  return (
    event.type === "TRANSACTIONS" &&
    ["INITIAL_UPDATE", "HISTORICAL_UPDATE", "DEFAULT_UPDATE", "SYNC_UPDATES_AVAILABLE"].includes(event.code)
  );
}
