import { NextResponse } from "next/server";

/**
 * AppStore Manifest — OpenSEM.
 *
 * Protocol: see Grand-Master-Weaver/.claude/rules/bubble-conventions.md →
 * "OpenSoftware AppStore — Catalog + Manifest Protocol".
 */

const MANIFEST_VERSION = "1.0.0";

export async function GET() {
  return NextResponse.json({
    service: "opensem",
    version: MANIFEST_VERSION,
    sidebar: [
      {
        label: "SEO / SEM",
        href: "/admin/seo",
        icon: "Search",
        permission: "seo.view",
      },
    ],
    dashboards: [
      {
        id: "seo-overview",
        route: "/admin/seo",
        mode: "iframe",
        remoteUrl: "/sem",
        title: "SEO Dashboard",
      },
    ],
    widgets: [
      {
        id: "keyword-ranks",
        mode: "local",
        dataFetch: "/api/sem/rankings/summary",
        size: "2x1",
        title: "Keyword-Rankings",
      },
      {
        id: "landing-score",
        mode: "local",
        dataFetch: "/api/sem/intelligence/landing-page-score/summary",
        size: "1x1",
        title: "Landing-Score",
      },
    ],
    injections: [
      {
        host: "etd",
        targetRoute: "/admin/spare-parts",
        widgetId: "keyword-ranks",
        slot: "above-list",
      },
    ],
  });
}
