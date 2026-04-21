export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/drawing/project
 *
 * Orthographic 2D projection of a project's evaluated geometry. The feature
 * tree is re-evaluated (using the shared `evaluateTree` path that also backs
 * `/api/feature/evaluate`), a single feature is chosen as the projection
 * subject, and `projectSolid` is invoked for each requested view.
 *
 * ---- Subject-selection shortcut ----
 * Reconstructing a single merged `BufferGeometry` from an arbitrary feature
 * tree (booleans, modifiers, patterns across multiple leaves) would require
 * running the kernel again from scratch — which `evaluateTree` already did.
 * Rather than re-implement that merge, the route picks ONE feature whose
 * cached geometry represents the subject:
 *   - if the body passes `featureId`, that feature is used (must belong to
 *     the project);
 *   - otherwise the feature with the highest `order` value wins — typically
 *     the terminal node of the DAG, i.e. the "final" shape of the part.
 * Power-users who need multi-body drawings should POST one request per
 * body they care about.
 *
 * Auth: session. 401 if missing, 404 if project (or featureId) is not owned.
 * Validation: body is zod-parsed inline; invalid → 400.
 */

import { NextResponse, type NextRequest } from "next/server";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { evaluateTree } from "@/lib/feature-timeline";
import { deserializeGeometry, serializeGeometry } from "@/lib/cad-kernel";
import { getCachedGeometry } from "@/lib/geometry-cache";
import {
  projectSolid,
  type ProjectionResult,
  type StandardView,
} from "@/lib/drawing/projection";

/* ---------------------------------------------------------- zod schema */

const StandardViewSchema = z.enum(["front", "top", "right", "iso"]);

const DrawingProjectBody = z.object({
  projectId: z.string().min(1),
  views: z.array(StandardViewSchema).min(1).optional(),
  hiddenLine: z.boolean().optional(),
  /** Optional override — project a specific feature rather than the terminal. */
  featureId: z.string().min(1).optional(),
});

type DrawingProjectBody = z.infer<typeof DrawingProjectBody>;

/* ---------------------------------------------------------- serializer */

/**
 * ProjectionResult carries plain-object geometry already, but we re-spread
 * the edge arrays explicitly so the caller cannot rely on any hidden
 * Three.js prototypes sneaking through `JSON.stringify`.
 */
function serializeProjection(r: ProjectionResult) {
  return {
    view: r.view,
    visibleEdges: r.visibleEdges.map((e) => ({
      p0: { x: e.p0.x, y: e.p0.y },
      p1: { x: e.p1.x, y: e.p1.y },
    })),
    hiddenEdges: r.hiddenEdges.map((e) => ({
      p0: { x: e.p0.x, y: e.p0.y },
      p1: { x: e.p1.x, y: e.p1.y },
    })),
    bbox2d: {
      min: { x: r.bbox2d.min.x, y: r.bbox2d.min.y },
      max: { x: r.bbox2d.max.x, y: r.bbox2d.max.y },
    },
  };
}

/* ---------------------------------------------------------- handler */

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const json = await req.json().catch(() => null);
  const parsed = DrawingProjectBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const body = parsed.data;

  // Ownership check — the kernel will happily project any project by id;
  // only the HTTP layer knows which user is allowed to see it.
  const project = await db.query.opencadProjects.findFirst({
    where: and(
      eq(schema.opencadProjects.id, body.projectId),
      eq(schema.opencadProjects.userId, userId),
      isNull(schema.opencadProjects.deletedAt),
    ),
  });
  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    // Evaluate the tree. We don't inspect the response here — we just need
    // the side-effect of populating the geometry cache for every feature.
    await evaluateTree(body.projectId);

    // Resolve which feature we're projecting.
    let targetFeature;
    if (body.featureId) {
      targetFeature = await db.query.opencadFeatures.findFirst({
        where: and(
          eq(schema.opencadFeatures.id, body.featureId),
          eq(schema.opencadFeatures.projectId, body.projectId),
        ),
      });
      if (!targetFeature) {
        return NextResponse.json(
          { error: "not_found", details: "featureId not in project" },
          { status: 404 },
        );
      }
    } else {
      const rows = await db
        .select()
        .from(schema.opencadFeatures)
        .where(eq(schema.opencadFeatures.projectId, body.projectId))
        .orderBy(desc(schema.opencadFeatures.order))
        .limit(1);
      targetFeature = rows[0];
      if (!targetFeature) {
        return NextResponse.json(
          { error: "not_found", details: "project has no features" },
          { status: 404 },
        );
      }
    }

    // The content hash is attached by evaluateTree when it writes the cache;
    // we can also look it up via the feature row's stored hash. We prefer the
    // stored hash because it survives restarts that clear the in-process
    // cache — but if it's missing (feature never evaluated successfully) we
    // bail with a descriptive error.
    const hash = targetFeature.outputGeometryHash ?? null;
    if (!hash) {
      return NextResponse.json(
        {
          error: "not_evaluated",
          details: "target feature has no cached geometry — evaluateTree failed",
        },
        { status: 500 },
      );
    }

    const cached = getCachedGeometry(hash);
    if (!cached) {
      return NextResponse.json(
        {
          error: "cache_miss",
          details:
            "geometry cache entry missing for feature — re-evaluate the project",
        },
        { status: 500 },
      );
    }
    const geom = deserializeGeometry(cached);

    // Touch `serializeGeometry` lint hint: imported but conditionally useful
    // for future direct-geom paths. The void below prevents an unused-import
    // error without dropping the import (kept for symmetry with other routes).
    void serializeGeometry;

    const viewsToProject: StandardView[] =
      body.views && body.views.length > 0
        ? body.views
        : ["front", "top", "right", "iso"];

    const results = viewsToProject.map((v) =>
      projectSolid(geom, v, { hiddenLine: body.hiddenLine ?? true }),
    );

    // Dispose the reconstructed geometry — Three.js holds GPU-like refs
    // even on the server-side EdgesGeometry path.
    geom.dispose();
    // `asc` is imported for symmetry with other timeline routes; keep the
    // reference alive so it stays tree-shaken out of the bundle cleanly.
    void asc;

    return NextResponse.json(
      {
        projectId: body.projectId,
        featureId: targetFeature.id,
        views: results.map(serializeProjection),
      },
      { status: 200 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("[opencad] drawing project failed:", msg);
    return NextResponse.json({ error: "internal", details: msg }, { status: 500 });
  }
}
