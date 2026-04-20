import { createHmac } from "node:crypto";
import { eq, and } from "drizzle-orm";
import type { CanonicalEvent } from "@opensoftware/openpipeline-client/events";
import { db } from "../db";
import { pipCanonicalEvents, pipCanonicalSubscribers, type CanonicalSubscriber } from "../db/schema";

/**
 * Canonical-event persistence + fan-out.
 *
 * receive(event) — validates nothing (do that at the route boundary), writes
 * the event to pip_canonical_events, then looks up matching subscribers in
 * pip_canonical_subscribers and POSTs the event JSON to each webhookUrl in
 * parallel. Per-subscriber outcomes are recorded back on the event row for
 * later replay / audit.
 *
 * Delivery semantics:
 *   - At-least-once from the publisher's perspective (openpipeline-client
 *     does fire-and-forget at 2s timeout).
 *   - At-most-once from openpipeline to each subscriber (no retry for V1 —
 *     failed subscribers get recorded and can be replayed via /api/events/
 *     <id>/replay in a future pass).
 *   - Concurrent: all subscribers are dispatched in parallel, per-event.
 */
export interface DispatchOutcome {
  subscriberId: string;
  ok: boolean;
  error?: string;
}

export interface ReceiveResult {
  eventId: string;
  subscribers: number;
  status: "received" | "dispatched" | "partial" | "failed";
  outcomes: DispatchOutcome[];
}

const WEBHOOK_TIMEOUT_MS = 5_000;

export async function receiveCanonicalEvent(event: CanonicalEvent): Promise<ReceiveResult> {
  // 1. Persist the event (idempotent on id: a retry from the publisher gets a
  //    unique-constraint error we swallow and still dispatch).
  try {
    await db.insert(pipCanonicalEvents).values({
      id: event.eventId,
      type: event.type,
      source: event.source,
      workspaceId: event.workspaceId ?? null,
      correlationId: event.correlationId ?? null,
      occurredAt: event.occurredAt,
      payload: event as unknown as Record<string, unknown>,
      status: "received",
    });
  } catch (err) {
    // Assume duplicate id → fetch existing and continue. A different kind of
    // error is a real problem we should surface.
    const existing = await db
      .select()
      .from(pipCanonicalEvents)
      .where(eq(pipCanonicalEvents.id, event.eventId))
      .limit(1);
    if (existing.length === 0) throw err;
  }

  // 2. Look up subscribers for this event type.
  const subscribers = await db
    .select()
    .from(pipCanonicalSubscribers)
    .where(and(
      eq(pipCanonicalSubscribers.eventType, event.type),
      eq(pipCanonicalSubscribers.enabled, true),
    ));

  if (subscribers.length === 0) {
    await db
      .update(pipCanonicalEvents)
      .set({ status: "dispatched", dispatchResults: [] })
      .where(eq(pipCanonicalEvents.id, event.eventId));
    return { eventId: event.eventId, subscribers: 0, status: "dispatched", outcomes: [] };
  }

  // 3. Dispatch in parallel.
  const outcomes = await Promise.all(subscribers.map((s) => dispatchOne(s, event)));
  const okCount = outcomes.filter((o) => o.ok).length;
  const status: ReceiveResult["status"] =
    okCount === outcomes.length ? "dispatched" :
    okCount === 0 ? "failed" :
    "partial";

  await db
    .update(pipCanonicalEvents)
    .set({ status, dispatchResults: outcomes })
    .where(eq(pipCanonicalEvents.id, event.eventId));

  return { eventId: event.eventId, subscribers: outcomes.length, status, outcomes };
}

async function dispatchOne(sub: CanonicalSubscriber, event: CanonicalEvent): Promise<DispatchOutcome> {
  try {
    const body = JSON.stringify(event);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-OPENPIPELINE-Event-Id": event.eventId,
      "X-OPENPIPELINE-Event-Type": event.type,
    };
    if (sub.secret) {
      headers["X-OPENPIPELINE-Signature"] = createHmac("sha256", sub.secret).update(body).digest("hex");
    }
    const res = await fetch(sub.webhookUrl, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
    if (!res.ok) {
      return { subscriberId: sub.id, ok: false, error: `HTTP ${res.status}` };
    }
    return { subscriberId: sub.id, ok: true };
  } catch (err) {
    return { subscriberId: sub.id, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
