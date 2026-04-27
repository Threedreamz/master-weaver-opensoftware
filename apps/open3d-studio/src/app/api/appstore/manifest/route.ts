import { NextResponse } from "next/server";

/**
 * AppStore Manifest — Open3D Studio.
 *
 * Protocol: Grand-Master-Weaver/.claude/rules/bubble-conventions.md →
 * "OpenSoftware AppStore — Catalog + Manifest Protocol".
 *
 * Surfaces all 12 in-app routes as iframe dashboards so the consuming admin
 * panel (admin-3dreamz, admin-etd, etc.) can render them as deep links.
 */

const MANIFEST_VERSION = "1.0.0";

// `/slicer` intentionally omitted — openslicer is a peer module with its own
// catalog entry + manifest. The `/slicer` route in this app still works
// (redirects to openslicer when NEXT_PUBLIC_OPENSLICER_URL is set, otherwise
// renders a client-side PoC); it just isn't surfaced as a dashboard here to
// avoid double-listing in the admin AppStore.
const ROUTES: Array<{ id: string; route: string; title: string }> = [
  { id: "home",        route: "/",            title: "Open3D Home" },
  { id: "viewer",      route: "/viewer",      title: "Viewer" },
  { id: "cad",         route: "/cad",         title: "CAD" },
  { id: "converter",   route: "/converter",   title: "Converter" },
  { id: "analyze",     route: "/analyze",     title: "Analyze" },
  { id: "reconstruct", route: "/reconstruct", title: "Reconstruct" },
  { id: "generate",    route: "/generate",    title: "Generate (AI)" },
  { id: "2dto3d",      route: "/2dto3d",      title: "2D \u2192 3D" },
  { id: "simulate",    route: "/simulate",    title: "Simulate (FEA / CAM)" },
  { id: "scan2step",   route: "/scan2step",   title: "Scan \u2192 STEP" },
  { id: "dfm",         route: "/dfm",         title: "Design for Manufacturability" },
];

export async function GET() {
  return NextResponse.json({
    service: "open3d-studio",
    version: MANIFEST_VERSION,
    sidebar: [
      {
        label: "Open3D Studio",
        href: "/admin/open3d",
        icon: "Box",
        permission: "open3d.view",
      },
    ],
    dashboards: ROUTES.map((r) => ({
      id: r.id,
      route: `/admin/open3d/${r.id}`,
      mode: "iframe",
      remoteUrl: r.route,
      title: r.title,
    })),
    widgets: [],
    injections: [],
  });
}
