import { NextResponse } from "next/server";

/**
 * AppStore Manifest — opengen-image-gateway.
 *
 * Protocol: Grand-Master-Weaver/.claude/rules/bubble-conventions.md →
 * "OpenSoftware AppStore — Catalog + Manifest Protocol".
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MANIFEST_VERSION = "0.1.0";

export async function GET() {
  return NextResponse.json({
    service: "opengen-image-gateway",
    version: MANIFEST_VERSION,
    sidebar: [
      {
        label: "AI Image Gen",
        href: "/admin/opengen-image",
        icon: "ImagePlus",
        permission: "opengen-image.view",
      },
    ],
    dashboards: [
      {
        id: "opengen-image-jobs",
        route: "/admin/opengen-image",
        mode: "local",
        title: "Image Generation Jobs",
      },
    ],
    widgets: [],
    injections: [],
  });
}
