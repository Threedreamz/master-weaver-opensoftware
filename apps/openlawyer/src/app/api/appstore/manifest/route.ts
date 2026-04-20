import { NextResponse } from "next/server";

/**
 * AppStore Manifest — OpenLawyer.
 *
 * Protocol: see Grand-Master-Weaver/.claude/rules/bubble-conventions.md →
 * "OpenSoftware AppStore — Catalog + Manifest Protocol".
 */

const MANIFEST_VERSION = "1.0.0";

export async function GET() {
  return NextResponse.json({
    service: "openlawyer",
    version: MANIFEST_VERSION,
    sidebar: [
      {
        label: "Recht",
        href: "/admin/legal",
        icon: "Scale",
        permission: "legal.view",
      },
    ],
    dashboards: [
      {
        id: "legal-overview",
        route: "/admin/legal",
        mode: "iframe",
        remoteUrl: "/legal",
        title: "Rechtsprojekte",
      },
    ],
    widgets: [
      {
        id: "open-projects",
        mode: "local",
        dataFetch: "/api/legal/projects?status=open&limit=5",
        size: "2x1",
        title: "Offene Verfahren",
      },
      {
        id: "deadline-countdown",
        mode: "local",
        dataFetch: "/api/legal/deadlines/upcoming",
        size: "1x1",
        title: "Nächste Frist",
      },
    ],
    injections: [
      {
        host: "etd",
        targetRoute: "/admin/customers",
        widgetId: "deadline-countdown",
        slot: "sidebar-top",
      },
    ],
  });
}
