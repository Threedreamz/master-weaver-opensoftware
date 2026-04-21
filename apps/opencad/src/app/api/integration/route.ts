export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/integration
 *
 * AppStore-gateway handshake endpoint. Returns the service identity and the
 * list of endpoints the gateway can route to. Intentionally public — no auth:
 * the gateway discovers opencad at boot before any user session exists.
 *
 * The AppStore manifest at `/api/appstore/manifest` is the richer per-user
 * payload (sidebar, dashboards, widgets, injections). This route is the
 * lighter "are you alive and what do you expose" probe.
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    service: "opencad",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      manifest: "/api/appstore/manifest",
      projects: "/api/projects",
      project: "/api/projects/[id]",
      features: "/api/projects/[id]/features",
      sketches: "/api/projects/[id]/sketches",
      versions: "/api/projects/[id]/versions",
      version: "/api/projects/[id]/versions/[versionId]",
      export: "/api/projects/[id]/export/[format]",
      import: "/api/import/[format]",
      sketchSolve: "/api/sketch/solve",
      featureEvaluate: "/api/feature/evaluate",
      handoffOpenslicer: "/api/handoff/openslicer",
      assemblySolve: "/api/assembly/solve",
      assemblyBOM: "/api/assembly/bom",
      drawingProject: "/api/drawing/project",
      drawingExport: "/api/drawing/export",
    },
    capabilities: {
      exportFormats: ["stl", "3mf", "gltf", "step"],
      importFormats: ["stl", "3mf", "step"],
      streamingUpload: true,
      maxUploadBytes: Number.parseInt(process.env.MAX_UPLOAD_BYTES ?? "", 10) || 500 * 1024 * 1024,
    },
  });
}
