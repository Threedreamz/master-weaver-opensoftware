/**
 * @opensoftware/openpipeline-client
 *
 * Lightweight cross-module event publisher + canonical event schema. Used by
 * any OpenSoftware module that wants to emit events into openpipeline (which
 * then fans them out to subscribers — other modules, webhooks, automation
 * rules, Teams/OpenBounty bridges).
 *
 * Scope v0.1:
 *   - Canonical event schema (Zod) — customer.* / organization.* / order.* /
 *     job.* / file.*.
 *   - HTTP fire-and-forget publisher (timeout 2s, silent by default).
 *
 * Not yet in scope (deferred):
 *   - Subscriber / handler framework.
 *   - Retry / outbox on the publisher side (openpipeline handles delivery).
 *   - OpenTelemetry tracing — events include an optional `correlationId`
 *     field but there's no transport-level span propagation yet.
 */
export * from "./events.js";
export * from "./publisher.js";
