export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireSessionOrApiKey } from "@/lib/auth-helpers";
import { SolveFeaStaticBody } from "@/lib/api-contracts";
import {
  SolverError,
  bboxOfVertices,
  type BoundaryCondition,
  type TetMesh,
} from "@/lib/kernel-types";
import { solveFeaStatic } from "@/lib/solvers/fea-static";

/**
 * Build a TetMesh from an inline `{ vertices: number[], tets: number[] }` —
 * the request shape from SolveFeaStaticBody.mesh. Re-packs into the canonical
 * Float32Array/Uint32Array containers the solver expects.
 */
function tetMeshFromInline(inline: { vertices: number[]; tets: number[] }): TetMesh {
  if (inline.vertices.length === 0 || inline.tets.length === 0) {
    throw new SolverError("BAD_INPUT", "mesh has empty vertices or tets array");
  }
  const vertices = Float32Array.from(inline.vertices);
  const tets = Uint32Array.from(inline.tets);
  return { vertices, tets, bbox: bboxOfVertices(vertices) };
}

/**
 * Resolve meshId → TetMesh by reading opensimulationMeshes.storageKey.
 * M1 storage protocol: if storageKey starts with "inline:" the suffix is a
 * JSON-encoded `{ vertices, tets }`. Real blob storage (R2, S3) is M2.
 */
async function tetMeshFromMeshId(meshId: string): Promise<TetMesh> {
  const [row] = await db
    .select()
    .from(schema.opensimulationMeshes)
    .where(eq(schema.opensimulationMeshes.id, meshId))
    .limit(1);
  if (!row) throw new SolverError("BAD_INPUT", `mesh ${meshId} not found`);
  if (row.kind !== "tet") {
    throw new SolverError("BAD_INPUT", `mesh ${meshId} is ${row.kind}, expected tet`);
  }
  if (!row.storageKey.startsWith("inline:")) {
    throw new SolverError("BAD_INPUT", `mesh ${meshId} storage ${row.storageKey} not supported in M1`);
  }
  let parsed: { vertices: number[]; tets: number[] };
  try {
    parsed = JSON.parse(row.storageKey.slice("inline:".length));
  } catch (e) {
    throw new SolverError("BAD_INPUT", `mesh ${meshId} inline payload invalid JSON`);
  }
  return tetMeshFromInline(parsed);
}

/* POST /api/solve/fea-static — session-or-api-key */
export async function POST(req: NextRequest) {
  const auth = await requireSessionOrApiKey(req);
  if (auth instanceof NextResponse) return auth;

  const json = await req.json().catch(() => null);
  const parsed = SolveFeaStaticBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const projectId = req.headers.get("x-project-id") ?? undefined;
  let runId: string | null = null;
  const startedAt = Date.now();

  // Persist first so we have a record even on crash. FK requires a project —
  // omit the row if caller didn't supply x-project-id.
  if (projectId) {
    const [run] = await db
      .insert(schema.opensimulationRuns)
      .values({
        projectId,
        domain: "fea-static",
        status: "running",
        triggeredBy: auth.via,
        inputJson: body as unknown as Record<string, unknown>,
      })
      .returning({ id: schema.opensimulationRuns.id });
    runId = run?.id ?? null;

    // Capture BCs in the dedicated table (one row per BC).
    if (runId) {
      for (const bc of body.boundaryConditions) {
        await db.insert(schema.opensimulationBoundaryConditions).values({
          runId,
          kind: bc.kind,
          anchorPointsJson: bc.nodeIds,
          magnitudeJson: (bc.magnitude ?? {}) as unknown as Record<string, unknown>,
        });
      }
    }
  }

  try {
    const mesh = body.meshId
      ? await tetMeshFromMeshId(body.meshId)
      : tetMeshFromInline(body.mesh!);

    const bcs: BoundaryCondition[] = body.boundaryConditions.map((b) => ({
      kind: b.kind,
      nodeIds: b.nodeIds,
      magnitude: b.magnitude,
    }));

    const result = solveFeaStatic({
      mesh,
      material: { youngModulus: body.material.youngModulus, poisson: body.material.poisson },
      boundaryConditions: bcs,
    });

    const payload = {
      displacements: Array.from(result.displacements),
      vonMises: Array.from(result.vonMises),
      maxDisplacementMm: result.maxDisplacementMm,
      maxStressMPa: result.maxStressMpa,
      runId: runId ?? "",
    };

    if (runId) {
      await db
        .update(schema.opensimulationRuns)
        .set({
          status: "done",
          durationMs: Date.now() - startedAt,
          resultJson: payload as unknown as Record<string, unknown>,
        })
        .where(eq(schema.opensimulationRuns.id, runId));
    }
    return NextResponse.json(payload);
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    if (err instanceof SolverError) {
      if (runId) {
        await db
          .update(schema.opensimulationRuns)
          .set({
            status: "failed",
            durationMs,
            errorMessage: `${err.code}: ${err.message}`,
          })
          .where(eq(schema.opensimulationRuns.id, runId));
      }
      return NextResponse.json(
        { error: err.code, details: { message: err.message, ...(err.details ? { info: err.details } : {}) } },
        { status: 422 },
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (runId) {
      await db
        .update(schema.opensimulationRuns)
        .set({ status: "failed", durationMs, errorMessage: msg })
        .where(eq(schema.opensimulationRuns.id, runId));
    }
    return NextResponse.json({ error: "internal_error", details: msg }, { status: 500 });
  }
}
