import { createVerify } from "node:crypto";
import type { WiseWebhookPayload, WiseWebhookEventType } from "./types.js";

/**
 * Parsed Wise webhook event with convenience fields.
 */
export interface WiseWebhookEvent {
  eventType: WiseWebhookEventType;
  resourceId: number;
  profileId: number;
  currentState: string;
  previousState: string;
  occurredAt: string;
  subscriptionId: string;
  raw: WiseWebhookPayload;
}

/**
 * Wise public key for webhook verification.
 *
 * Wise signs webhooks using RSA-SHA256 with their public key.
 * The public key should be fetched from Wise's documentation and stored securely.
 * You can retrieve it from: https://wise.com/public-keys/live
 *
 * This function verifies the signature using the provided public key.
 *
 * @param body - Raw request body as a string
 * @param signature - Value of the `X-Signature-SHA256` header (base64-encoded)
 * @param publicKey - RSA public key in PEM format from Wise
 * @returns true if the signature is valid
 */
export function verifyWiseWebhook(
  body: string,
  signature: string,
  publicKey: string,
): boolean {
  try {
    const verifier = createVerify("RSA-SHA256");
    verifier.update(body);
    return verifier.verify(publicKey, signature, "base64");
  } catch {
    return false;
  }
}

/**
 * Parse a verified Wise webhook body into a structured event.
 * Call `verifyWiseWebhook` first before parsing.
 *
 * @param body - Raw webhook body string (must be valid JSON)
 * @returns Parsed webhook event
 */
export function parseWiseWebhook(body: string): WiseWebhookEvent {
  const payload: WiseWebhookPayload = JSON.parse(body);

  return {
    eventType: payload.event_type,
    resourceId: payload.data.resource.id,
    profileId: payload.data.resource.profile_id,
    currentState: payload.data.current_state,
    previousState: payload.data.previous_state,
    occurredAt: payload.data.occurred_at,
    subscriptionId: payload.subscription_id,
    raw: payload,
  };
}

/**
 * Check if a webhook event is a transfer state change.
 */
export function isTransferStateChange(event: WiseWebhookEvent): boolean {
  return event.eventType === "transfers#state-change";
}

/**
 * Check if a transfer webhook indicates the transfer has been completed
 * (funds sent to the recipient).
 */
export function isTransferComplete(event: WiseWebhookEvent): boolean {
  return (
    event.eventType === "transfers#state-change" &&
    event.currentState === "outgoing_payment_sent"
  );
}

/**
 * Check if a transfer webhook indicates the transfer was cancelled.
 */
export function isTransferCancelled(event: WiseWebhookEvent): boolean {
  return (
    event.eventType === "transfers#state-change" &&
    event.currentState === "cancelled"
  );
}

/**
 * Check if a transfer webhook indicates the funds were refunded.
 */
export function isTransferRefunded(event: WiseWebhookEvent): boolean {
  return (
    event.eventType === "transfers#state-change" &&
    event.currentState === "funds_refunded"
  );
}

/**
 * Check if a transfer webhook indicates a bounce-back.
 */
export function isTransferBouncedBack(event: WiseWebhookEvent): boolean {
  return (
    event.eventType === "transfers#state-change" &&
    event.currentState === "bounced_back"
  );
}

/**
 * Check if the webhook is a balance credit event
 * (funds received into a Wise balance).
 */
export function isBalanceCredit(event: WiseWebhookEvent): boolean {
  return event.eventType === "balances#credit";
}

/**
 * Check if the webhook is a balance update event.
 */
export function isBalanceUpdate(event: WiseWebhookEvent): boolean {
  return event.eventType === "balances#update";
}

/**
 * Check if a transfer has reached a terminal (final) state.
 */
export function isTransferTerminal(event: WiseWebhookEvent): boolean {
  if (event.eventType !== "transfers#state-change") return false;

  const terminalStates = [
    "outgoing_payment_sent",
    "cancelled",
    "funds_refunded",
    "bounced_back",
    "charged_back",
  ];

  return terminalStates.includes(event.currentState);
}

/**
 * Check if a transfer requires attention (has active issues).
 */
export function isTransferActionRequired(event: WiseWebhookEvent): boolean {
  return event.eventType === "transfers#active-cases";
}
