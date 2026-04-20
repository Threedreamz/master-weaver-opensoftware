/**
 * @opensoftware/core-adapters
 *
 * Contracts that every OpenSoftware module implements once, so the admin
 * panel and cross-module integrations can read/write canonical records
 * without knowing the module's native schema.
 *
 * Implementation pattern (per module):
 *   1. Define a TLocal type matching the native row.
 *   2. Implement `CustomerAdapter<TLocal>` (etc.) in
 *      `apps/<module>/src/adapters/<entity>.ts`.
 *   3. Mount the adapter behind canonical HTTP routes
 *      `GET/POST /api/v1/canonical/customers` (and friends).
 *
 * Modules MAY implement only the entities they own. openaccounting owns
 * Customer + Order; openportal owns Organization; open3d owns File + Job;
 * etc. Cross-module reads happen via @opensoftware/core-clients (Wave 3).
 */
export * from "./customer-adapter.js";
export * from "./organization-adapter.js";
export * from "./order-adapter.js";
export * from "./file-adapter.js";
export * from "./job-adapter.js";
