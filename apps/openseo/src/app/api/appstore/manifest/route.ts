import { NextResponse } from "next/server";

/**
 * AppStore Manifest — OpenSEO.
 *
 * Protocol: Grand-Master-Weaver/.claude/rules/bubble-conventions.md →
 * "OpenSoftware AppStore — Catalog + Manifest Protocol".
 *
 * OpenSEO does SEO audits, ranking trackers, and indexation reporting.
 * Sister service to OpenSEM (paid-side); shares the "seo" sidebarKey but
 * different routes — both can be installed simultaneously.
 */

const MANIFEST_VERSION = "1.0.0";

export async function GET() {
  return NextResponse.json({
    service: "openseo",
    version: MANIFEST_VERSION,
    sidebar: [
      {
        label: "SEO Audit",
        href: "/admin/seo/audit",
        icon: "TrendingUp",
        permission: "openseo.view",
      },
      {
        label: "Rankings",
        href: "/admin/seo/rankings",
        icon: "BarChart3",
        permission: "openseo.view",
      },
      {
        label: "Indexierung",
        href: "/admin/seo/indexation",
        icon: "Globe",
        permission: "openseo.view",
      },
    ],
    dashboards: [
      {
        id: "openseo-overview",
        route: "/admin/seo",
        mode: "iframe",
        remoteUrl: "/",
        title: "SEO Übersicht",
      },
      {
        id: "openseo-audit",
        route: "/admin/seo/audit",
        mode: "iframe",
        remoteUrl: "/audit",
        title: "SEO Audit",
      },
    ],
    widgets: [
      {
        id: "seo-audit-score",
        mode: "local",
        dataFetch: "/api/seo/audit/latest-score",
        size: "1x1",
        title: "Audit Score",
      },
      {
        id: "seo-ranking-changes",
        mode: "local",
        dataFetch: "/api/seo/rankings/changes",
        size: "2x1",
        title: "Ranking-Veränderungen (7d)",
      },
    ],
    injections: [],
  });
}
