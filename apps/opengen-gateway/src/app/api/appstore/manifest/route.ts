import { NextResponse } from "next/server";

/**
 * AppStore Manifest — opengen-gateway.
 *
 * Protocol: Grand-Master-Weaver/.claude/rules/bubble-conventions.md →
 * "OpenSoftware AppStore — Catalog + Manifest Protocol".
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MANIFEST_VERSION = "0.1.0";

export async function GET() {
  return NextResponse.json({
    service: "opengen-gateway",
    version: MANIFEST_VERSION,
    sidebar: [
      {
        label: "AI 3D Gen",
        href: "/admin/opengen",
        icon: "Sparkles",
        permission: "opengen.view",
      },
    ],
    dashboards: [
      {
        id: "opengen-jobs",
        route: "/admin/opengen",
        mode: "local",
        title: "Generation Jobs",
      },
    ],
    widgets: [],
    injections: [],
  });
}
