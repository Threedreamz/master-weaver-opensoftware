import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { pipCanonicalSubscribers } from "../db/schema";
import {
  DEFAULT_SUBSCRIBERS,
  diffSubscribers,
  resolveWebhookUrl,
  type SeedResult,
  type SubscriberDefault,
  type SubscriberRow,
} from "./seed-subscribers-defs.js";

// Re-export pure pieces so callers keep a single import path.
export {
  DEFAULT_SUBSCRIBERS,
  diffSubscribers,
  resolveWebhookUrl,
};
export type { SeedResult, SubscriberDefault, SubscriberRow };

/**
 * Idempotent seed of the default canonical-event subscribers.
 *
 * Called from the openpipeline server entry point when
 * `OPENPIPELINE_SEED_SUBSCRIBERS=1` is set. Safe to call on every boot —
 * existing rows (matched by name + eventType) are left untouched, missing
 * ones are inserted with enabled=true.
 *
 * Defaults (see ./seed-subscribers-defs.ts) wire the canonical flow built
 * in Wave 4:
 *
 *   customer.created         → openmailer  (auto-import Contact)
 *   customer.updated         → openmailer  (enrich existing Contact)
 *   organization.created     → openmailer  (ACK only; future "workspace-per-org"
 *                                           provisioning lands here)
 *   organization.member-added → openmailer (ACK only — needs auth-enrichment
 *                                           for email lookup)
 *
 * Additional subscribers can be registered via POST /api/subscribers at
 * runtime; the seed never revokes them.
 */
export async function seedDefaultSubscribers(): Promise<SeedResult> {
  const result: SeedResult = { inserted: [], existing: [] };

  for (const d of DEFAULT_SUBSCRIBERS) {
    const existing = await db
      .select()
      .from(pipCanonicalSubscribers)
      .where(and(
        eq(pipCanonicalSubscribers.name, d.name),
        eq(pipCanonicalSubscribers.eventType, d.eventType),
      ))
      .limit(1);

    if (existing.length > 0) {
      result.existing.push(d.name);
      continue;
    }

    await db.insert(pipCanonicalSubscribers).values({
      name: d.name,
      eventType: d.eventType,
      webhookUrl: resolveWebhookUrl(d),
      secret: process.env[d.secretEnv] ?? null,
      enabled: true,
    });
    result.inserted.push(d.name);
  }

  return result;
}
