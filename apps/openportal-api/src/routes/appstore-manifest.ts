import { Hono } from "hono";

/**
 * AppStore Manifest — OpenPortal API.
 *
 * Protocol: see Grand-Master-Weaver/.claude/rules/bubble-conventions.md →
 * "OpenSoftware AppStore — Catalog + Manifest Protocol".
 *
 * OpenPortal runs in two integration modes (see docs/openportal/ADMIN-INTEGRATION.md):
 *   - Embedded: admin imports @opensoftware/openportal-db packages directly
 *   - Remote:   admin calls this API over HTTP with a FinderAuth Bearer token
 *
 * The manifest describes the admin-facing surface the UI can embed (teams,
 * channels, meetings, audit) regardless of mode — the admin picks the
 * adapter that matches its deployment.
 */

const MANIFEST_VERSION = "1.0.0";

export const appstoreManifestRoutes = new Hono();

appstoreManifestRoutes.get("/", (c) => {
  return c.json({
    service: "openportal-api",
    version: MANIFEST_VERSION,
    sidebar: [
      {
        label: "Teams",
        href: "/admin/teams",
        icon: "Users",
        permission: "teams.view",
      },
    ],
    dashboards: [
      {
        id: "teams-overview",
        route: "/admin/teams",
        mode: "iframe",
        remoteUrl: "/teams",
        title: "Teams & Orgs",
      },
      {
        id: "meetings-overview",
        route: "/admin/teams/meetings",
        mode: "iframe",
        remoteUrl: "/teams/meetings",
        title: "Besprechungen",
      },
    ],
    widgets: [
      {
        id: "active-meeting",
        mode: "local",
        dataFetch: "/api/orgs/current/meetings?status=active&limit=1",
        size: "2x1",
        title: "Aktive Besprechung",
      },
      {
        id: "pending-invitations",
        mode: "local",
        dataFetch: "/api/orgs/current/invitations?status=pending",
        size: "1x1",
        title: "Offene Einladungen",
      },
      {
        id: "recent-audit",
        mode: "local",
        dataFetch: "/api/orgs/current/audit?limit=5",
        size: "2x1",
        title: "Letzte Audit-Einträge",
      },
    ],
    injections: [
      {
        host: "etd",
        targetRoute: "/admin",
        widgetId: "active-meeting",
        slot: "dashboard-top",
      },
      {
        host: "etd",
        targetRoute: "/admin/customers",
        widgetId: "pending-invitations",
        slot: "sidebar-top",
      },
    ],
    // Hints for the admin panel about how to consume this service.
    // openportal is special: the UI can be embedded (via packages) or
    // iframed (via the openportal UI app). The admin fork decides.
    integration: {
      modes: ["embedded", "remote"],
      uiPackage: "@opensoftware/openportal-ui",
      embeddedAdapterPackage: "@opensoftware/openportal-db",
      remoteAdapterPackage: "@opensoftware/openportal-client",
    },
  });
});
