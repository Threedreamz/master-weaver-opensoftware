import { createPublicKey, createVerify } from "node:crypto";
import type { SendGridWebhookEvent } from "./types.js";

/**
 * SendGrid Event Webhook verification and parsing.
 *
 * SendGrid signs webhook payloads using ECDSA with their public key.
 * The signature is provided in the `X-Twilio-Email-Event-Webhook-Signature` header,
 * and a timestamp in `X-Twilio-Email-Event-Webhook-Timestamp`.
 */

/**
 * Verify a SendGrid Event Webhook signature (Signed Event Webhook).
 *
 * Uses ECDSA P-256 with the verification key provided by SendGrid.
 * The signed payload is: timestamp + payload body.
 *
 * @param publicKey - The Webhook Verification Key from SendGrid (PEM or base64 DER)
 * @param payload - The raw request body as a string
 * @param signature - The `X-Twilio-Email-Event-Webhook-Signature` header value
 * @param timestamp - The `X-Twilio-Email-Event-Webhook-Timestamp` header value
 * @returns true if the signature is valid
 */
export function verifySendGridWebhook(
  publicKey: string,
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  try {
    // Build the PEM if it's not already in PEM format
    let pemKey = publicKey;
    if (!publicKey.startsWith("-----BEGIN")) {
      pemKey = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
    }

    const key = createPublicKey({
      key: pemKey,
      format: "pem",
      type: "spki",
    });

    const signedPayload = timestamp + payload;
    const decodedSignature = Buffer.from(signature, "base64");

    const verifier = createVerify("SHA256");
    verifier.update(signedPayload);
    verifier.end();

    return verifier.verify(key, decodedSignature);
  } catch {
    return false;
  }
}

/**
 * Parse a SendGrid Event Webhook payload.
 *
 * SendGrid sends events as a JSON array in the request body.
 *
 * @param rawBody - The raw request body string
 * @returns Parsed array of webhook events
 */
export function parseSendGridWebhookEvents(
  rawBody: string
): SendGridWebhookEvent[] {
  const parsed = JSON.parse(rawBody);
  if (!Array.isArray(parsed)) {
    throw new Error("SendGrid webhook payload must be a JSON array");
  }
  return parsed as SendGridWebhookEvent[];
}

/**
 * Extract the relevant headers from an incoming webhook request.
 */
export interface SendGridWebhookHeaders {
  signature: string;
  timestamp: string;
}

export function extractSendGridWebhookHeaders(
  headers: Record<string, string | string[] | undefined>
): SendGridWebhookHeaders {
  const signature =
    getHeader(headers, "x-twilio-email-event-webhook-signature") ?? "";
  const timestamp =
    getHeader(headers, "x-twilio-email-event-webhook-timestamp") ?? "";
  return { signature, timestamp };
}

function getHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}
