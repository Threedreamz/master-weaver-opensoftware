import { NextResponse } from "next/server";

/**
 * AppStore Manifest — OpenAccounting.
 *
 * Protocol: see Grand-Master-Weaver/.claude/rules/bubble-conventions.md →
 * "OpenSoftware AppStore — Catalog + Manifest Protocol".
 *
 * The admin panel fetches this endpoint (directly or via the gateway's
 * /api/appstore/manifests aggregator) to discover which sidebar entries,
 * dashboards, widgets and workflow injections this service exposes.
 */

const MANIFEST_VERSION = "1.0.0";

export async function GET() {
  return NextResponse.json({
    service: "openaccounting",
    version: MANIFEST_VERSION,
    sidebar: [
      {
        label: "Buchhaltung",
        href: "/admin/accounting",
        icon: "Calculator",
        permission: "accounting.view",
      },
    ],
    dashboards: [
      {
        id: "accounting-overview",
        route: "/admin/accounting",
        mode: "iframe",
        remoteUrl: "/accounting",
        title: "Buchhaltung",
      },
    ],
    widgets: [
      {
        id: "revenue-kpi",
        mode: "local",
        dataFetch: "/api/v1/accounting/kpi/revenue",
        size: "1x1",
        title: "Umsatz (MTD)",
      },
      {
        id: "pending-invoices",
        mode: "local",
        dataFetch: "/api/v1/accounting/invoices/pending",
        size: "2x1",
        title: "Offene Rechnungen",
      },
    ],
    injections: [
      {
        host: "etd",
        targetRoute: "/admin/orders",
        widgetId: "pending-invoices",
        slot: "above-list",
      },
      {
        host: "etd",
        targetRoute: "/admin/customers",
        widgetId: "revenue-kpi",
        slot: "sidebar-top",
      },
    ],
  });
}
