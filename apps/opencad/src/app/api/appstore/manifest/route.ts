import { NextResponse } from "next/server";

/**
 * AppStore Manifest — OpenCAD.
 *
 * Protocol: Grand-Master-Weaver/.claude/rules/bubble-conventions.md →
 * "OpenSoftware AppStore — Catalog + Manifest Protocol".
 *
 * OpenCAD is part of the Open3D family — a browser-based parametric CAD/CAM
 * tool that pairs with openslicer (design → slice → print pipeline).
 *
 * Milestones: M1 CAD core (sketcher + features + STEP/STL I/O) — shipping now.
 * M2 (assemblies) and M3 (CAM) dashboards will be added when their
 * corresponding routes ship in the hub. M1 ships only projects + workbench.
 * Advertising routes that don't exist in the hub causes 404s from the admin
 * sidebar — keep manifest entries strictly in sync with shipped hub routes.
 */

const MANIFEST_VERSION = "1.0.0";

export async function GET() {
  return NextResponse.json({
    service: "opencad",
    version: MANIFEST_VERSION,
    sidebar: [
      {
        label: "CAD",
        href: "/admin/cad",
        icon: "Shapes",
        permission: "cad.view",
      },
    ],
    // M2 (assemblies) and M3 (CAM) dashboards will be added when their
    // corresponding routes ship in the hub. M1 ships only projects + workbench.
    dashboards: [
      { id: "projects",  route: "/admin/cad/projects",  mode: "iframe", remoteUrl: "/projects",  title: "Projects" },
      { id: "workbench", route: "/admin/cad/workbench", mode: "iframe", remoteUrl: "/workbench", title: "Workbench" },
      // M2/M3: re-enable when hub ships /admin/cad/assembly and /admin/cad/cam routes
      // { id: "assembly",  route: "/admin/cad/assembly",  mode: "iframe", remoteUrl: "/assembly",  title: "Assembly" },
      // { id: "cam",       route: "/admin/cad/cam",       mode: "iframe", remoteUrl: "/cam",       title: "CAM" },
    ],
    widgets: [
      { id: "recent-projects", mode: "local", dataFetch: "/api/services/cad/recent", size: "1x2", title: "Recent CAD Projects" },
    ],
    injections: [],
  });
}
