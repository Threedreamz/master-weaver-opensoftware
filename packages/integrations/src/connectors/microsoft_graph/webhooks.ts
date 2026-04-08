import type {
  GraphWebhookPayload,
  GraphWebhookNotification,
  GraphValidationPayload,
} from "./types.js";

/**
 * Microsoft Graph webhook (subscription) handling.
 *
 * Graph uses a validation handshake and clientState for verification.
 * Docs: https://learn.microsoft.com/en-us/graph/webhooks
 */

// ==================== Validation ====================

/**
 * Check whether an incoming request is a Graph subscription validation request.
 *
 * When you create a subscription, Graph sends a POST with a `validationToken`
 * query parameter. You must respond with the token as plain text within 10 seconds.
 *
 * @param queryParams - The URL query parameters of the incoming request
 * @returns The validation token if this is a validation request, null otherwise
 */
export function handleGraphValidation(
  queryParams: Record<string, string | string[] | undefined>
): string | null {
  const token = queryParams.validationToken;
  if (typeof token === "string" && token.length > 0) {
    return token;
  }
  return null;
}

// ==================== Client State Verification ====================

/**
 * Verify that a webhook notification has the expected clientState.
 *
 * When creating a subscription, you provide a `clientState` value.
 * Graph includes this value in every notification. Verify it matches
 * to ensure the notification is authentic.
 *
 * @param notification - The individual notification to verify
 * @param expectedClientState - The clientState you set when creating the subscription
 * @returns true if the clientState matches
 */
export function verifyGraphClientState(
  notification: GraphWebhookNotification,
  expectedClientState: string
): boolean {
  return notification.clientState === expectedClientState;
}

/**
 * Verify all notifications in a payload have the expected clientState.
 */
export function verifyGraphPayload(
  payload: GraphWebhookPayload,
  expectedClientState: string
): boolean {
  if (!payload.value || payload.value.length === 0) return false;
  return payload.value.every(
    (notification) =>
      verifyGraphClientState(notification, expectedClientState)
  );
}

// ==================== Payload Parsing ====================

/**
 * Parse an incoming Graph webhook notification payload.
 */
export function parseGraphWebhookPayload(
  body: unknown
): GraphWebhookPayload {
  return body as GraphWebhookPayload;
}

/**
 * Extract individual notifications from the payload,
 * optionally filtering by changeType.
 */
export function filterGraphNotifications(
  payload: GraphWebhookPayload,
  changeType?: "created" | "updated" | "deleted"
): GraphWebhookNotification[] {
  if (!payload.value) return [];
  if (!changeType) return payload.value;
  return payload.value.filter((n) => n.changeType === changeType);
}

/**
 * Group notifications by resource type (e.g., "me/messages", "me/events").
 */
export function groupGraphNotificationsByResource(
  notifications: GraphWebhookNotification[]
): Record<string, GraphWebhookNotification[]> {
  const groups: Record<string, GraphWebhookNotification[]> = {};
  for (const notification of notifications) {
    const resource = notification.resource;
    if (!groups[resource]) {
      groups[resource] = [];
    }
    groups[resource].push(notification);
  }
  return groups;
}

/**
 * Check if a subscription is about to expire (within the given buffer).
 * Useful for proactively renewing subscriptions.
 *
 * @param expirationDateTime - ISO 8601 date string from the subscription
 * @param bufferMinutes - Minutes before expiration to consider "about to expire" (default 60)
 */
export function isSubscriptionExpiringSoon(
  expirationDateTime: string,
  bufferMinutes = 60
): boolean {
  const expiration = new Date(expirationDateTime).getTime();
  const bufferMs = bufferMinutes * 60 * 1000;
  return Date.now() >= expiration - bufferMs;
}
