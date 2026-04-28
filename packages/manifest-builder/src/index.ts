/**
 * @opensoftware/manifest-builder
 *
 * Canonical typed helper for AppStore manifests served at
 * `/api/appstore/manifest` by every installable OpenSoftware service.
 *
 * Protocol surface:
 *   .claude/rules/bubble-conventions.md → "OpenSoftware AppStore — Catalog
 *   + Manifest Protocol"
 *
 * The package emits a plain JSON object — it does not couple to any web
 * framework, so consumers wrap it with `Response.json(...)` (Next.js App
 * Router) or `c.json(...)` (Hono) as appropriate. Both call sites:
 *
 *   // Next.js
 *   import { defineManifest } from "@opensoftware/manifest-builder";
 *   export async function GET() {
 *     return Response.json(defineManifest({ ... }));
 *   }
 *
 *   // Hono
 *   import { Hono } from "hono";
 *   import { defineManifest } from "@opensoftware/manifest-builder";
 *   export const appstoreManifestRoutes = new Hono();
 *   appstoreManifestRoutes.get("/", (c) => c.json(defineManifest({ ... })));
 */

export interface SidebarItem {
  /** Visible label rendered in the admin sidebar. */
  label: string;
  /** Route inside the admin shell where the click leads. */
  href: string;
  /** Lucide icon name (e.g. "Calculator", "Mail"). */
  icon?: string;
  /** Permission key the host bubble must grant for the entry to render. */
  permission?: string;
  /**
   * Sort hint when multiple manifests contribute the same parent. Lower
   * numbers render first; ties broken by service-slug alphabetic order.
   */
  priority?: number;
}

export interface Dashboard {
  /** Stable id used to deduplicate when multiple manifests collide. */
  id: string;
  /** Route at which the admin renders this dashboard. */
  route: string;
  /**
   * `iframe` — admin embeds the service's UI via an OIDC-SSO deep link.
   * `local` — admin renders a React component bundled in the host fork.
   */
  mode: "iframe" | "local";
  /** Iframe deep link (used when `mode === "iframe"`). */
  remoteUrl?: string;
  /** Component identifier resolved by the host (used when `mode === "local"`). */
  component?: string;
  /** Tab title shown in the admin shell. */
  title?: string;
}

export interface Widget {
  /** Stable id used to deduplicate across manifests. */
  id: string;
  /** Same semantics as `Dashboard.mode`. */
  mode: "iframe" | "local";
  /** Backend URL the widget fetches data from (used when `mode === "local"`). */
  dataFetch?: string;
  /** Iframe deep link (used when `mode === "iframe"`). Convention is Dashboard, but Widgets may also iframe. */
  remoteUrl?: string;
  /** Grid footprint, e.g. "1x1", "2x1", "2x2". */
  size: string;
  /** Card title. */
  title?: string;
  /** Component identifier (used when `mode === "local"`). */
  component?: string;
  /**
   * Optional binding from a route param to a `dataFetch` placeholder.
   * Example: `{ id: "route.params.id" }` substitutes `:id` in `dataFetch`.
   */
  paramBinding?: Record<string, string>;
}

export interface Injection {
  /**
   * Bubble name where the widget should be injected (e.g. "etd",
   * "3dreamz"). Aggregator filters by host before merging.
   */
  host: string;
  /** Target route in the host bubble where the slot is found. */
  targetRoute: string;
  /** Widget id (must exist in this manifest's `widgets` array). */
  widgetId: string;
  /** Slot name declared in the host's layout (e.g. "above-list"). */
  slot: string;
}

/**
 * Optional integration hints. Currently used by `openportal-api` to expose
 * its embedded vs remote adapter packages — a future protocol revision may
 * formalize this. Open to app-specific keys.
 */
export type IntegrationHints = {
  modes?: Array<"embedded" | "remote">;
  uiPackage?: string;
  embeddedAdapterPackage?: string;
  remoteAdapterPackage?: string;
} & Record<string, unknown>;

export interface ManifestInput {
  /** Stable slug — must match the catalog entry's `slug` in registry.json. */
  service: string;
  /** Manifest schema version emitted by this service (semver). */
  version: string;
  sidebar?: SidebarItem[];
  dashboards?: Dashboard[];
  widgets?: Widget[];
  injections?: Injection[];
  /** App-specific extension blocks (forward-compatible escape hatch). */
  integration?: IntegrationHints;
  [extension: string]: unknown;
}

export interface Manifest extends ManifestInput {
  sidebar: SidebarItem[];
  dashboards: Dashboard[];
  widgets: Widget[];
  injections: Injection[];
}

/**
 * Validate the required fields and fill default empty arrays for the four
 * collection slots. Throws on missing `service`/`version` so config bugs
 * surface at boot rather than as silent empty manifests.
 */
export function defineManifest(input: ManifestInput): Manifest {
  if (!input || typeof input !== "object") {
    throw new TypeError("manifest-builder: input must be an object");
  }
  if (typeof input.service !== "string" || !input.service.length) {
    throw new TypeError("manifest-builder: `service` is required (string).");
  }
  if (typeof input.version !== "string" || !input.version.length) {
    throw new TypeError("manifest-builder: `version` is required (string).");
  }
  return {
    ...input,
    service: input.service,
    version: input.version,
    sidebar: input.sidebar ?? [],
    dashboards: input.dashboards ?? [],
    widgets: input.widgets ?? [],
    injections: input.injections ?? [],
  };
}

/** Convenience: emit the manifest as a `Response` (Web Fetch / Next.js App Router). */
export function manifestResponse(input: ManifestInput, init?: ResponseInit): Response {
  return Response.json(defineManifest(input), init);
}
