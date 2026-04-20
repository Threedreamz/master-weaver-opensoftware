import { Hono } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import { CanonicalEvent } from "@opensoftware/openpipeline-client/events";
import { importCanonicalCustomer } from "../adapters/customer.js";
import { contactStore } from "../stores/contact-store.js";

/**
 * Canonical-event receiver — openpipeline fans out subscribed events to
 * POST /api/canonical-events here.
 *
 * Wave 4: the receiver now actually mutates state. customer.created and
 * customer.updated trigger importCanonicalCustomer, which:
 *   - Finds an existing Contact by (workspaceId, email), OR
 *   - Inserts a new one (emailConsent=false by default — explicit opt-in
 *     is required before any campaign can target the Contact).
 *   - Records the source module's id under customFields.external_<prefix>
 *     so the admin can trace the Contact back to e.g. openaccounting:42.
 *
 * Events that can't be linked (no email, no workspaceId) are logged and
 * skipped — we return 200 anyway so openpipeline marks the delivery as
 * successful rather than retrying indefinitely for data that will never
 * materialize.
 */
export const canonicalEventsRoutes = new Hono();

canonicalEventsRoutes.post("/", async (c) => {
  const raw = await c.req.text();

  // Optional HMAC verification. openpipeline signs the raw body when the
  // subscriber row has a `secret`; match against OPENPIPELINE_SUBSCRIBER_SECRET
  // here. If the env var isn't set we skip verification (dev / CI).
  const secret = process.env.OPENPIPELINE_SUBSCRIBER_SECRET;
  if (secret) {
    const supplied = c.req.header("x-openpipeline-signature") ?? "";
    const expected = createHmac("sha256", secret).update(raw).digest("hex");
    const a = Buffer.from(supplied, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return c.json({ error: "Invalid signature" }, 401);
    }
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = CanonicalEvent.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Event failed schema validation", issues: parsed.error.issues }, 400);
  }
  const event = parsed.data;

  console.log(
    `[openmailer] received canonical event ${event.type} from ${event.source} ` +
    `(id=${event.eventId})`,
  );

  // Route by event type.
  switch (event.type) {
    case "customer.created":
    case "customer.updated": {
      try {
        const result = await importCanonicalCustomer(contactStore, event.payload);
        console.log(
          `[openmailer] ${result.action} Contact from ${event.payload.id} ` +
          `(email=${event.payload.email ?? "none"}, contactId=${result.contactId ?? "-"}` +
          (result.reason ? `, reason=${result.reason}` : "") + ")",
        );
        return c.json({ ok: true, accepted: event.eventId, type: event.type, import: result });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[openmailer] Contact import failed for event ${event.eventId}: ${message}`);
        // Return 500 so openpipeline records a failure + can replay later.
        return c.json({ error: `Contact import failed: ${message}` }, 500);
      }
    }
    case "customer.merged":
      console.log(
        `[openmailer] customer.merged received — merge of ${event.mergedFromIds.length} aliases ` +
        `into ${event.payload.id} not yet implemented`,
      );
      return c.json({ ok: true, accepted: event.eventId, type: event.type, import: { action: "skipped", reason: "merge not implemented" } });

    case "organization.created":
      // An org in openportal doesn't have a direct Contact analogue in
      // openmailer — organizations don't receive emails, their members do.
      // We log + ACK so openpipeline marks delivery success. The future
      // "workspace-per-org" provisioning lives here when that lands.
      console.log(
        `[openmailer] organization.created ACK (${event.payload.id} "${event.payload.name}") ` +
        `— no Contact provisioning yet (V1)`,
      );
      return c.json({ ok: true, accepted: event.eventId, type: event.type, import: { action: "skipped", reason: "organization.created: Contact provisioning not implemented" } });

    case "organization.member-added":
      // A new member joining an org could seed a Contact, but the event
      // only carries userId + role — no email. Contact creation from this
      // event requires a FinderAuth user-details lookup, deferred to the
      // Wave 5 auth-enrichment pass. For now, log + ACK.
      console.log(
        `[openmailer] organization.member-added ACK (org=${event.organizationId}, user=${event.userId}, role=${event.role}) ` +
        `— Contact seed deferred until auth-enrichment ships`,
      );
      return c.json({ ok: true, accepted: event.eventId, type: event.type, import: { action: "skipped", reason: "organization.member-added: needs auth-enrichment for email lookup" } });

    default:
      // Other event types aren't relevant here — ignore gracefully so
      // openpipeline doesn't retry.
      return c.json({ ok: true, accepted: event.eventId, type: event.type });
  }
});
