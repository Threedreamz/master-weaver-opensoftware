import { NextResponse } from "next/server";

/**
 * AppStore Manifest — OpenPortal UI.
 *
 * Protocol: see Grand-Master-Weaver/.claude/rules/bubble-conventions.md →
 * "OpenSoftware AppStore — Catalog + Manifest Protocol".
 *
 * This is the iframe-facing UI entry. Admin panels that pick "remote" mode
 * per docs/openportal/ADMIN-INTEGRATION.md iframe this app directly at
 * /teams/[orgId]/...; the manifest below tells the admin where the useful
 * routes live so it can deep-link them.
 *
 * In "embedded" mode, admins skip this UI and mount @opensoftware/openportal-ui
 * components directly — the manifest then serves as a pure descriptor.
 */

const MANIFEST_VERSION = "1.0.0";

export async function GET() {
  return NextResponse.json({
    service: "openportal",
    version: MANIFEST_VERSION,
    sidebar: [
      {
        label: "Teams",
        href: "/admin/teams",
        icon: "Users",
        permission: "teams.view",
      },
      {
        label: "Besprechungen",
        href: "/admin/teams/meetings",
        icon: "Video",
        permission: "teams.view",
      },
    ],
    dashboards: [
      {
        id: "teams-home",
        route: "/admin/teams",
        mode: "iframe",
        remoteUrl: "/teams",
        title: "Teams & Organisationen",
      },
      {
        id: "members",
        route: "/admin/teams/members",
        mode: "iframe",
        remoteUrl: "/teams/:orgId/members",
        title: "Mitglieder",
        params: ["orgId"],
      },
      {
        id: "channels",
        route: "/admin/teams/channels",
        mode: "iframe",
        remoteUrl: "/teams/:orgId/channels",
        title: "Kanäle",
        params: ["orgId"],
      },
      {
        id: "meetings",
        route: "/admin/teams/meetings",
        mode: "iframe",
        remoteUrl: "/teams/:orgId/meetings",
        title: "Besprechungen",
        params: ["orgId"],
      },
      {
        id: "audit",
        route: "/admin/teams/audit",
        mode: "iframe",
        remoteUrl: "/teams/:orgId/audit",
        title: "Audit-Log",
        params: ["orgId"],
      },
    ],
    widgets: [],
    injections: [],
    // The UI app is the primary deep-link target. Widgets/injections come
    // from openportal-api's manifest (data-driven via openportal-client).
    integration: {
      modes: ["embedded", "remote"],
      uiPackage: "@opensoftware/openportal-ui",
      embeddedAdapterPackage: "@opensoftware/openportal-db",
      remoteAdapterPackage: "@opensoftware/openportal-client",
    },
  });
}
