import { NextResponse } from "next/server";

/**
 * AppStore Manifest — OpenInventory.
 *
 * Protocol: Grand-Master-Weaver/.claude/rules/bubble-conventions.md →
 * "OpenSoftware AppStore — Catalog + Manifest Protocol".
 *
 * OpenInventory tracks parts, materials, and stock levels. Surfaces low-stock
 * warnings as a widget injection on the ETD orders admin so warehouse
 * shortages block printable orders before they reach the print queue.
 */

const MANIFEST_VERSION = "1.0.0";

export async function GET() {
  return NextResponse.json({
    service: "openinventory",
    version: MANIFEST_VERSION,
    sidebar: [
      {
        label: "Lager",
        href: "/admin/inventory",
        icon: "Package",
        permission: "openinventory.view",
      },
      {
        label: "Materialien",
        href: "/admin/inventory/materials",
        icon: "Boxes",
        permission: "openinventory.view",
      },
      {
        label: "Bestellungen",
        href: "/admin/inventory/orders",
        icon: "Truck",
        permission: "openinventory.view",
      },
    ],
    dashboards: [
      {
        id: "inventory-overview",
        route: "/admin/inventory",
        mode: "iframe",
        remoteUrl: "/",
        title: "Lagerübersicht",
      },
    ],
    widgets: [
      {
        id: "inventory-low-stock",
        mode: "local",
        dataFetch: "/api/inventory/low-stock",
        size: "2x1",
        title: "Niedrige Bestände",
      },
      {
        id: "inventory-pending-orders",
        mode: "local",
        dataFetch: "/api/inventory/pending-orders",
        size: "1x1",
        title: "Offene Bestellungen",
      },
    ],
    injections: [
      {
        host: "etd",
        targetRoute: "/admin/orders",
        widgetId: "inventory-low-stock",
        slot: "above-list",
      },
      {
        host: "ies",
        targetRoute: "/admin/workspaces",
        widgetId: "inventory-low-stock",
        slot: "sidebar-top",
      },
    ],
  });
}
