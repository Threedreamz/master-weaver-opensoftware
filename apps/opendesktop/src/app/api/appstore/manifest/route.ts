import { NextResponse } from "next/server";

/**
 * AppStore Manifest — OpenDesktop.
 *
 * Protocol: Grand-Master-Weaver/.claude/rules/bubble-conventions.md →
 * "OpenSoftware AppStore — Catalog + Manifest Protocol".
 *
 * OpenDesktop is the on-prem-first workstation/equipment registry. Each
 * tenant bubble (ETD, IES, 3Dreamz) gets its own deployment; the IES bubble
 * additionally syncs from a real on-prem instance via OPENDESKTOP_SYNC_URL.
 */

const MANIFEST_VERSION = "1.0.0";

export async function GET() {
  return NextResponse.json({
    service: "opendesktop",
    version: MANIFEST_VERSION,
    sidebar: [
      {
        label: "Workstations",
        href: "/admin/desktop/equipment",
        icon: "Monitor",
        permission: "opendesktop.view",
      },
      {
        label: "Issues",
        href: "/admin/desktop/issues",
        icon: "AlertTriangle",
        permission: "opendesktop.view",
      },
      {
        label: "Integrations",
        href: "/admin/desktop/integrations",
        icon: "Plug",
        permission: "opendesktop.admin",
      },
    ],
    dashboards: [
      {
        id: "desktop-equipment",
        route: "/admin/desktop/equipment",
        mode: "iframe",
        remoteUrl: "/equipment",
        title: "Equipment & Workstations",
      },
      {
        id: "desktop-issues",
        route: "/admin/desktop/issues",
        mode: "iframe",
        remoteUrl: "/issues",
        title: "Open Issues",
      },
    ],
    widgets: [
      {
        id: "desktop-online-count",
        mode: "local",
        dataFetch: "/api/v1/equipment/online-count",
        size: "1x1",
        title: "Online Workstations",
      },
      {
        id: "desktop-open-issues",
        mode: "local",
        dataFetch: "/api/v1/issues/open-count",
        size: "1x1",
        title: "Offene Issues",
      },
    ],
    injections: [
      {
        host: "ies",
        targetRoute: "/admin/workspaces",
        widgetId: "desktop-online-count",
        slot: "above-list",
      },
    ],
  });
}
