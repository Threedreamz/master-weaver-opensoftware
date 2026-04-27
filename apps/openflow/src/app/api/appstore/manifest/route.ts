import { NextResponse } from "next/server";

/**
 * AppStore Manifest — OpenFlow.
 *
 * Protocol: Grand-Master-Weaver/.claude/rules/bubble-conventions.md →
 * "OpenSoftware AppStore — Catalog + Manifest Protocol".
 *
 * OpenFlow is the visual form-flow builder (heyflow-style). Sidebar entries
 * show flows + submissions; dashboards iframe the builder UI; widgets
 * surface submission counts on the bubble admin's overview page.
 */

const MANIFEST_VERSION = "1.0.0";

export async function GET() {
  return NextResponse.json({
    service: "openflow",
    version: MANIFEST_VERSION,
    sidebar: [
      {
        label: "Flows",
        href: "/admin/flow/flows",
        icon: "Workflow",
        permission: "openflow.view",
      },
      {
        label: "Submissions",
        href: "/admin/flow/submissions",
        icon: "Inbox",
        permission: "openflow.view",
      },
      {
        label: "Settings",
        href: "/admin/flow/settings",
        icon: "Settings",
        permission: "openflow.admin",
      },
    ],
    dashboards: [
      {
        id: "openflow-flows",
        route: "/admin/flow/flows",
        mode: "iframe",
        remoteUrl: "/flows",
        title: "Form Flows",
      },
      {
        id: "openflow-submissions",
        route: "/admin/flow/submissions",
        mode: "iframe",
        remoteUrl: "/submissions",
        title: "Submissions",
      },
    ],
    widgets: [
      {
        id: "openflow-submissions-today",
        mode: "local",
        dataFetch: "/api/flows/submissions/today",
        size: "1x1",
        title: "Submissions heute",
      },
      {
        id: "openflow-active-flows",
        mode: "local",
        dataFetch: "/api/flows/active-count",
        size: "1x1",
        title: "Aktive Flows",
      },
    ],
    injections: [],
  });
}
