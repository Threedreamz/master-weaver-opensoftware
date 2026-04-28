export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/integration
 *
 * AppStore-gateway handshake endpoint. Returns the service identity and the
 * list of endpoints the gateway can route to. Intentionally public — no auth:
 * the gateway discovers opencam at boot before any user session exists.
 *
 * The AppStore manifest at /api/appstore/manifest is the richer per-user
 * payload (sidebar, dashboards, widgets, injections). This route is the
 * lighter "are you alive and what do you expose" probe.
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    service: "opencam",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      manifest: "/api/appstore/manifest",
      projects: "/api/projects",
      project: "/api/projects/[id]",
      operations: "/api/operations",
      operation: "/api/operations/[id]",
      generateToolpath: "/api/operations/[id]/generate",
      tools: "/api/tools",
      tool: "/api/tools/[id]",
      posts: "/api/posts",
      post: "/api/posts/[id]",
      postprocess: "/api/postprocess",
      simulate: "/api/simulate",
      gcodeDownload: "/api/gcode/[id]/download",
      opencadImport: "/api/opencad/import",
    },
    capabilities: {
      operationKinds: ["face", "contour", "pocket", "drill", "adaptive", "3d-parallel"],
      implementedKinds: ["face", "contour", "drill", "adaptive"], // pocket requires jscut optional-dep; 3d-parallel deferred to M3.5
      postProcessorDialects: ["grbl", "marlin", "fanuc", "linuxcnc", "haas"],
      opencadImportFormats: ["stl"],                             // step deferred to M2
      streamingUpload: true,
      maxUploadBytes: Number.parseInt(process.env.MAX_UPLOAD_BYTES ?? "", 10) || 500 * 1024 * 1024,
    },
  });
}
