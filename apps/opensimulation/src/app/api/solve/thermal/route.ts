export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireSessionOrApiKey } from "@/lib/auth-helpers";
import { SolveThermalSteadyBody } from "@/lib/api-contracts";
import {
  SolverError,
  bboxOfVertices,
  type BoundaryCondition,
  type TetMesh,
} from "@/lib/kernel-types";
import { solveThermalSteady } from "@/lib/solvers/thermal-steady";

function tetMeshFromInline(inline: { vertices: number[]; tets: number[] }): TetMesh {
  if (inline.vertices.length === 0 || inline.tets.length === 0) {
    throw new SolverError("BAD_INPUT", "mesh has empty vertices or tets array");
  }
  const vertices = Float32Array.from(inline.vertices);
  const tets = Uint32Array.from(inline.tets);
  return { vertices, tets, bbox: bboxOfVertices(vertices) };
}

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
    const encoded = row.storageKey.slice("inline:".length);
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    parsed = JSON.parse(decoded);
  } catch {
    throw new SolverError("BAD_INPUT", `mesh ${meshId} inline payload invalid JSON`);
  }
  return tetMeshFromInline(parsed);
}

/* POST /api/solve/thermal — session-or-api-key */
export async function POST(req: NextRequest) {
  const auth = await requireSessionOrApiKey(req);
  if (auth instanceof NextResponse) return auth;

  const json = await req.json().catch(() => null);
  const parsed = SolveThermalSteadyBody.safeParse(json);
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

  if (projectId) {
    const [run] = await db
      .insert(schema.opensimulationRuns)
      .values({
        projectId,
        domain: "thermal-steady",
        status: "running",
        triggeredBy: auth.via,
        inputJson: body as unknown as Record<string, unknown>,
      })
      .returning({ id: schema.opensimulationRuns.id });
    runId = run?.id ?? null;

    if (runId) {
      for (const bc of body.boundaryConditions) {
        await db.insert(schema.opensimulationBoundaryConditions).values({
          runId,
          kind: bc.kind,
          anchorPointsJson: bc.nodeIds,
          magnitudeJson: { value: bc.value } as unknown as Record<string, unknown>,
        });
      }
    }
  }

  try {
    const mesh = body.meshId
      ? await tetMeshFromMeshId(body.meshId)
      : tetMeshFromInline(body.mesh!);

    // Thermal BCs carry a scalar value (temperature or heat_flux), which
    // kernel-types represents as BoundaryCondition.magnitude: number.
    const bcs: BoundaryCondition[] = body.boundaryConditions.map((b) => ({
      kind: b.kind,
      nodeIds: b.nodeIds,
      magnitude: b.value,
    }));

    const result = solveThermalSteady({
      mesh,
      material: { thermalConductivity: body.material.thermalConductivity },
      boundaryConditions: bcs,
    });

    const payload = {
      temperatures: Array.from(result.temperatures),
      minTempC: result.minTempC,
      maxTempC: result.maxTempC,
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
