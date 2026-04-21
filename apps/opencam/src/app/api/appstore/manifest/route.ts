import { NextResponse } from "next/server";

/**
 * AppStore Manifest — OpenCAM.
 *
 * Protocol: Grand-Master-Weaver/.claude/rules/bubble-conventions.md →
 * "OpenSoftware AppStore — Catalog + Manifest Protocol".
 *
 * OpenCAM is part of the Open3D family — a browser-based CAM tool that pairs
 * with opencad (design → toolpaths → G-Code pipeline). M1 delivers 2.5D
 * milling (pocket/contour/face/drill) with grbl/marlin/fanuc/linuxcnc/haas
 * post-processors. M2/M3 adaptive + 5-axis dashboards pre-registered here.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MANIFEST_VERSION = "1.0.0";

export async function GET() {
  return NextResponse.json({
    service: "opencam",
    version: MANIFEST_VERSION,
    sidebar: [
      {
        label: "CAM",
        href: "/admin/cam",
        icon: "Drill",
        permission: "cam.view",
      },
    ],
    dashboards: [
      { id: "projects",  route: "/admin/cam/projects",  mode: "iframe", remoteUrl: "/workbench",                title: "Projects" },
      { id: "workbench", route: "/admin/cam/workbench", mode: "iframe", remoteUrl: "/workbench",                title: "Workbench" },
      { id: "tools",     route: "/admin/cam/tools",     mode: "iframe", remoteUrl: "/tools",                    title: "Tool Library" },
      { id: "posts",     route: "/admin/cam/posts",     mode: "iframe", remoteUrl: "/posts",                    title: "Post-Processors" },
    ],
    widgets: [
      { id: "recent-projects", mode: "local", dataFetch: "/api/projects?limit=5", size: "1x2", title: "Recent CAM Projects" },
    ],
    injections: [],
  });
}
