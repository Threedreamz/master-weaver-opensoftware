/**
 * @opensoftware/core-types
 *
 * Canonical wire-format types shared across every OpenSoftware module. Each
 * module keeps its own native (storage) schema and translates to/from these
 * types via @opensoftware/core-adapters.
 *
 * Why a canonical layer? The admin panel needs to render a unified customer
 * list across openaccounting (integer IDs, B2B/B2C, VAT) + openmailer (UUIDs,
 * consent flags) + openportal (workspace-scoped orgs) without knowing every
 * module's local schema. Adapters do the translation; everyone speaks the
 * canonical shape on the wire.
 *
 * ID prefix convention — IMMUTABLE once published. Each module owns a prefix:
 *   "acct:..."     openaccounting
 *   "mailer:..."   openmailer
 *   "portal:..."   openportal
 *   "lawyer:..."   openlawyer
 *   "sem:..."      opensem
 *   "farm:..."     openfarm
 *   "slicer:..."   openslicer
 *   "open3d:..."   open3d-* family (when they grow customer-like records)
 *
 * Cross-module merging is handled at the canonical layer (see
 * `mergeCustomers()` exported from this package): two CanonicalCustomers with
 * matching `email` are considered the same person; their `externalIds` get
 * merged so downstream consumers can resolve a single identity back to the
 * native records in each module.
 */
export * from "./customer.js";
export * from "./organization.js";
export * from "./order.js";
export * from "./file.js";
export * from "./job.js";
export * from "./identity.js";
export * from "./util.js";
