import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  TwilioSmsWebhookPayload,
  TwilioStatusCallbackPayload,
} from "./types.js";

/**
 * Twilio webhook signature verification and payload parsing.
 *
 * Twilio signs webhooks using HMAC-SHA1 of the full request URL + sorted POST params.
 * Docs: https://www.twilio.com/docs/usage/security#validating-requests
 */

// ==================== Signature Verification ====================

/**
 * Verify a Twilio webhook signature.
 *
 * Twilio computes the signature as:
 * 1. Take the full URL of the request
 * 2. Sort the POST parameters alphabetically by key
 * 3. Append each key/value pair to the URL (no delimiters)
 * 4. HMAC-SHA1 the resulting string with the AuthToken
 * 5. Base64 encode the result
 *
 * @param authToken - Twilio Auth Token (used as HMAC secret)
 * @param signature - Value of the X-Twilio-Signature header
 * @param url - Full request URL (including protocol, host, path, and query)
 * @param params - POST body parameters as key-value pairs
 * @returns true if the signature is valid
 */
export function verifyTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string> = {}
): boolean {
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  const expectedSignature = createHmac("sha1", authToken)
    .update(data)
    .digest("base64");

  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

// ==================== Payload Parsing ====================

/**
 * Parse form-encoded body into an SMS webhook payload.
 * Twilio sends webhooks as application/x-www-form-urlencoded.
 */
export function parseTwilioSmsWebhook(
  body: Record<string, string>
): TwilioSmsWebhookPayload {
  return {
    MessageSid: body.MessageSid ?? "",
    AccountSid: body.AccountSid ?? "",
    From: body.From ?? "",
    To: body.To ?? "",
    Body: body.Body ?? "",
    NumMedia: body.NumMedia ?? "0",
    NumSegments: body.NumSegments ?? "1",
    SmsStatus: (body.SmsStatus ?? "received") as TwilioSmsWebhookPayload["SmsStatus"],
    ApiVersion: body.ApiVersion ?? "",
    MessageStatus: body.MessageStatus as TwilioSmsWebhookPayload["MessageStatus"],
    ErrorCode: body.ErrorCode,
    ErrorMessage: body.ErrorMessage,
  };
}

/**
 * Parse form-encoded body into a status callback payload.
 * Twilio calls the StatusCallback URL when message status changes.
 */
export function parseTwilioStatusCallback(
  body: Record<string, string>
): TwilioStatusCallbackPayload {
  return {
    MessageSid: body.MessageSid ?? "",
    MessageStatus: (body.MessageStatus ?? "unknown") as TwilioStatusCallbackPayload["MessageStatus"],
    AccountSid: body.AccountSid ?? "",
    From: body.From ?? "",
    To: body.To ?? "",
    ErrorCode: body.ErrorCode,
    ErrorMessage: body.ErrorMessage,
  };
}

/**
 * Generate TwiML response for acknowledging a webhook.
 * Twilio expects a TwiML (XML) response to inbound message webhooks.
 *
 * @param replyBody - Optional text to reply with. If omitted, sends an empty response.
 */
export function buildTwimlResponse(replyBody?: string): string {
  if (!replyBody) {
    return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
  }
  const escaped = replyBody
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
}
