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
 * M2 Assemblies and M3 CAM dashboards pre-registered here; routes return
 * "coming soon" until implementation lands. Dashboard entries stay registered
 * so the admin sidebar is stable across milestone releases.
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
    dashboards: [
      { id: "projects",  route: "/admin/cad/projects",  mode: "iframe", remoteUrl: "/projects",  title: "Projects" },
      { id: "workbench", route: "/admin/cad/workbench", mode: "iframe", remoteUrl: "/workbench", title: "Workbench" },
      { id: "assembly",  route: "/admin/cad/assembly",  mode: "iframe", remoteUrl: "/assembly",  title: "Assembly" },
      { id: "cam",       route: "/admin/cad/cam",       mode: "iframe", remoteUrl: "/cam",       title: "CAM" },
    ],
    widgets: [
      { id: "recent-projects", mode: "local", dataFetch: "/api/services/cad/recent", size: "1x2", title: "Recent CAD Projects" },
    ],
    injections: [],
  });
}
