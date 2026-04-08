import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  GoCardlessWebhookPayload,
  GoCardlessWebhookEvent,
  GoCardlessResourceType,
} from "./types.js";

/**
 * Parsed GoCardless webhook with extracted event details.
 */
export interface GoCardlessParsedWebhook {
  events: GoCardlessWebhookEvent[];
  paymentEvents: GoCardlessWebhookEvent[];
  mandateEvents: GoCardlessWebhookEvent[];
  payoutEvents: GoCardlessWebhookEvent[];
  subscriptionEvents: GoCardlessWebhookEvent[];
  refundEvents: GoCardlessWebhookEvent[];
}

/**
 * Verify a GoCardless webhook signature.
 *
 * GoCardless signs webhooks with HMAC-SHA256. The signature is sent in the
 * `Webhook-Signature` header. The body is the raw JSON string.
 *
 * @param body - Raw request body as a string
 * @param signature - Value of the `Webhook-Signature` header
 * @param secret - Webhook endpoint secret from GoCardless Dashboard
 * @returns true if the signature is valid
 */
export function verifyGoCardlessWebhook(
  body: string,
  signature: string,
  secret: string,
): boolean {
  const computed = createHmac("sha256", secret).update(body).digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(computed, "hex"),
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}

/**
 * Parse a verified GoCardless webhook body into structured events.
 * Call `verifyGoCardlessWebhook` first before parsing.
 *
 * @param body - Raw webhook body string (must be valid JSON)
 * @returns Parsed webhook with events categorized by resource type
 */
export function parseGoCardlessWebhook(body: string): GoCardlessParsedWebhook {
  const payload: GoCardlessWebhookPayload = JSON.parse(body);
  const events = payload.events;

  return {
    events,
    paymentEvents: filterByResource(events, "payments"),
    mandateEvents: filterByResource(events, "mandates"),
    payoutEvents: filterByResource(events, "payouts"),
    subscriptionEvents: filterByResource(events, "subscriptions"),
    refundEvents: filterByResource(events, "refunds"),
  };
}

function filterByResource(
  events: GoCardlessWebhookEvent[],
  resourceType: GoCardlessResourceType,
): GoCardlessWebhookEvent[] {
  return events.filter((e) => e.resource_type === resourceType);
}

/**
 * Check if a payment event indicates a successful collection.
 */
export function isPaymentConfirmed(event: GoCardlessWebhookEvent): boolean {
  return event.resource_type === "payments" && event.action === "confirmed";
}

/**
 * Check if a payment event indicates the funds have been paid out.
 */
export function isPaymentPaidOut(event: GoCardlessWebhookEvent): boolean {
  return event.resource_type === "payments" && event.action === "paid_out";
}

/**
 * Check if a payment event indicates a failure.
 */
export function isPaymentFailed(event: GoCardlessWebhookEvent): boolean {
  return event.resource_type === "payments" && event.action === "failed";
}

/**
 * Check if a payment event indicates a chargeback.
 */
export function isPaymentChargedBack(event: GoCardlessWebhookEvent): boolean {
  return event.resource_type === "payments" && event.action === "charged_back";
}

/**
 * Check if a mandate event indicates the mandate is now active.
 */
export function isMandateActive(event: GoCardlessWebhookEvent): boolean {
  return event.resource_type === "mandates" && event.action === "active";
}

/**
 * Check if a mandate event indicates failure or cancellation.
 */
export function isMandateInactive(event: GoCardlessWebhookEvent): boolean {
  return (
    event.resource_type === "mandates" &&
    ["failed", "cancelled", "expired"].includes(event.action)
  );
}

/**
 * Check if a payout event indicates the payout has been sent to the bank.
 */
export function isPayoutPaid(event: GoCardlessWebhookEvent): boolean {
  return event.resource_type === "payouts" && event.action === "paid";
}

/**
 * Extract the resource ID from a webhook event.
 * The resource ID is typically in `links` under the singular resource name.
 */
export function getResourceId(event: GoCardlessWebhookEvent): string | null {
  const singularMap: Record<string, string> = {
    payments: "payment",
    mandates: "mandate",
    payouts: "payout",
    refunds: "refund",
    subscriptions: "subscription",
    instalment_schedules: "instalment_schedule",
  };

  const key = singularMap[event.resource_type];
  return key ? (event.links[key] ?? null) : null;
}
