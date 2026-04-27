import { NextResponse } from "next/server";

const MANIFEST_VERSION = "1.0.0";

export async function GET() {
  return NextResponse.json({
    service: "open3dreel",
    version: MANIFEST_VERSION,
    sidebar: [
      {
        label: "3DReel",
        href: "/admin/reels",
        icon: "Film",
      },
    ],
    dashboards: [
      {
        id: "studio",
        route: "/admin/reels",
        mode: "iframe",
        remoteUrl: "/",
        title: "Reel Studio",
      },
    ],
    widgets: [],
    injections: [],
  });
}
