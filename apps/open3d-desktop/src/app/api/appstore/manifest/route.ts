import { NextResponse } from "next/server";

/**
 * AppStore Manifest — Open3D Desktop.
 *
 * Tauri-wrapped flavor of Open3D Studio. Exposes a single dashboard pointing
 * at the desktop UI root; admins typically install the studio (web) in
 * preference to the desktop, but the catalog needs both for discoverability.
 */

const MANIFEST_VERSION = "0.1.0";

export async function GET() {
  return NextResponse.json({
    service: "open3d-desktop",
    version: MANIFEST_VERSION,
    sidebar: [
      {
        label: "Open3D Desktop",
        href: "/admin/open3d-desktop",
        icon: "Monitor",
        permission: "open3d-desktop.view",
      },
    ],
    dashboards: [
      {
        id: "open3d-desktop-home",
        route: "/admin/open3d-desktop",
        mode: "iframe",
        remoteUrl: "/",
        title: "Open3D Desktop",
      },
    ],
    widgets: [],
    injections: [],
  });
}
