import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  SlackEventPayload,
  SlackInteractionPayload,
} from "./types.js";

/**
 * Slack webhook signature verification and event parsing.
 *
 * Slack signs requests using HMAC-SHA256 with a versioned signature scheme.
 * Docs: https://api.slack.com/authentication/verifying-requests-from-slack
 */

// ==================== Signature Verification ====================

/**
 * Verify a Slack request signature.
 *
 * Slack sends:
 * - X-Slack-Signature: v0=<hex HMAC-SHA256>
 * - X-Slack-Request-Timestamp: <unix epoch seconds>
 *
 * The signed string is: `v0:<timestamp>:<raw body>`
 *
 * @param signingSecret - Slack app signing secret
 * @param signature - Value of X-Slack-Signature header
 * @param timestamp - Value of X-Slack-Request-Timestamp header
 * @param body - Raw request body as a string
 * @param toleranceSeconds - Max age of the request in seconds (default 300 = 5 min)
 * @returns true if the signature is valid
 */
export function verifySlackSignature(
  signingSecret: string,
  signature: string,
  timestamp: string,
  body: string,
  toleranceSeconds = 300
): boolean {
  // Prevent replay attacks by checking the timestamp
  const ts = parseInt(timestamp, 10);
  if (Number.isNaN(ts)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > toleranceSeconds) {
    return false;
  }

  const sigBasestring = `v0:${timestamp}:${body}`;
  const expectedSignature =
    "v0=" +
    createHmac("sha256", signingSecret).update(sigBasestring).digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

// ==================== Event Parsing ====================

/**
 * Parse an incoming Slack Events API payload.
 *
 * Handles both:
 * - `url_verification` challenges (returns the challenge string)
 * - `event_callback` events
 */
export function parseSlackEvent(body: unknown): SlackEventPayload {
  const payload = body as SlackEventPayload;
  return payload;
}

/**
 * Handle the url_verification challenge.
 * Returns the challenge value if this is a verification request, null otherwise.
 */
export function handleSlackChallenge(payload: SlackEventPayload): string | null {
  if (payload.type === "url_verification" && payload.challenge) {
    return payload.challenge;
  }
  return null;
}

/**
 * Parse a Slack interaction payload.
 *
 * Slack sends interaction payloads as a form-encoded `payload` field
 * containing a JSON string. This function expects the already-parsed JSON.
 */
export function parseSlackInteraction(
  payloadJson: string
): SlackInteractionPayload {
  return JSON.parse(payloadJson) as SlackInteractionPayload;
}

/**
 * Determine if an event is a bot message (to avoid infinite loops).
 */
export function isSlackBotMessage(payload: SlackEventPayload): boolean {
  if (payload.type !== "event_callback" || !payload.event) return false;
  const event = payload.event;
  return event.type === "message" && (
    event.subtype === "bot_message" ||
    event.bot_id != null
  );
}

// ==================== Incoming Webhook (Outgoing) ====================

/**
 * Build a payload for Slack incoming webhooks.
 * This is the format expected when POSTing to a Slack webhook URL.
 *
 * @param text - Message text (supports mrkdwn)
 * @param channel - Optional channel override
 * @param username - Optional username override
 * @param iconEmoji - Optional icon emoji override (e.g., ":robot_face:")
 */
export function buildSlackWebhookPayload(
  text: string,
  channel?: string,
  username?: string,
  iconEmoji?: string
): Record<string, string> {
  const payload: Record<string, string> = { text };
  if (channel) payload.channel = channel;
  if (username) payload.username = username;
  if (iconEmoji) payload.icon_emoji = iconEmoji;
  return payload;
}
