import { NextResponse } from "next/server";

/**
 * AppStore Manifest — OpenSlicer.
 *
 * Protocol: Grand-Master-Weaver/.claude/rules/bubble-conventions.md →
 * "OpenSoftware AppStore — Catalog + Manifest Protocol".
 *
 * OpenSlicer is the canonical slicer in the Open3D family (the client-side
 * PoC under open3d-studio/slicer iframes us when NEXT_PUBLIC_OPENSLICER_URL
 * is set). Exposes admin sidebar entries for every persistence-backed
 * surface.
 */

const MANIFEST_VERSION = "1.0.0";

export async function GET() {
  return NextResponse.json({
    service: "openslicer",
    version: MANIFEST_VERSION,
    sidebar: [
      {
        label: "Slicer",
        href: "/admin/slicer",
        icon: "Layers",
        permission: "slicer.view",
      },
    ],
    dashboards: [
      { id: "slice",       route: "/admin/slicer/slice",       mode: "iframe", remoteUrl: "/slice",       title: "Slice" },
      { id: "profiles",    route: "/admin/slicer/profiles",    mode: "iframe", remoteUrl: "/profiles",    title: "Printer profiles" },
      { id: "litophane",   route: "/admin/slicer/litophane",   mode: "iframe", remoteUrl: "/litophane",   title: "Lithophane generator" },
      { id: "sla",         route: "/admin/slicer/sla",         mode: "iframe", remoteUrl: "/sla",         title: "SLA" },
    ],
    widgets: [],
    injections: [],
  });
}
