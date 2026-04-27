/**
 * Pure definitions + diff helper for the default canonical-event
 * subscriber seed. Split from seed-subscribers.ts so tests can import the
 * pure bits without triggering the eager better-sqlite3 connection in
 * ../db.
 */

export interface SubscriberDefault {
  name: string;
  eventType: string;
  webhookUrlEnv: string;
  fallbackUrl: string;
  secretEnv: string;
}

export interface SubscriberRow {
  name: string;
  eventType: string;
}

export interface SeedResult {
  inserted: string[];
  existing: string[];
}

export const DEFAULT_SUBSCRIBERS: SubscriberDefault[] = [
  { name: "openmailer:customer.created",          eventType: "customer.created",          webhookUrlEnv: "OPENMAILER_API_URL", fallbackUrl: "http://localhost:4170", secretEnv: "OPENPIPELINE_SUBSCRIBER_SECRET" },
  { name: "openmailer:customer.updated",          eventType: "customer.updated",          webhookUrlEnv: "OPENMAILER_API_URL", fallbackUrl: "http://localhost:4170", secretEnv: "OPENPIPELINE_SUBSCRIBER_SECRET" },
  { name: "openmailer:organization.created",      eventType: "organization.created",      webhookUrlEnv: "OPENMAILER_API_URL", fallbackUrl: "http://localhost:4170", secretEnv: "OPENPIPELINE_SUBSCRIBER_SECRET" },
  { name: "openmailer:organization.member-added", eventType: "organization.member-added", webhookUrlEnv: "OPENMAILER_API_URL", fallbackUrl: "http://localhost:4170", secretEnv: "OPENPIPELINE_SUBSCRIBER_SECRET" },
];

/**
 * Compute what the seed would do given the current subscriber rows.
 * Pure: takes a snapshot, returns the set of new subscriber names that
 * would be inserted plus the set that already exists.
 */
export function diffSubscribers(
  existing: SubscriberRow[],
  defaults: SubscriberDefault[] = DEFAULT_SUBSCRIBERS,
): SeedResult {
  const keyOf = (s: SubscriberRow) => `${s.name}::${s.eventType}`;
  const present = new Set(existing.map(keyOf));
  const out: SeedResult = { inserted: [], existing: [] };
  for (const d of defaults) {
    if (present.has(keyOf(d))) out.existing.push(d.name);
    else out.inserted.push(d.name);
  }
  return out;
}

/** Resolve the webhook URL for a default subscriber using the current env. */
export function resolveWebhookUrl(d: SubscriberDefault, env: NodeJS.ProcessEnv = process.env): string {
  const base = env[d.webhookUrlEnv] ?? d.fallbackUrl;
  return `${base.replace(/\/+$/, "")}/api/canonical-events`;
}
