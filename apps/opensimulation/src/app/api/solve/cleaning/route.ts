export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireSessionOrApiKey } from "@/lib/auth-helpers";
import { runCleaning } from "@/lib/emulators/cleaning";
import {
  simulateCleaning,
  type CleaningPhysicsParams,
  type CleaningSimResult,
} from "@/lib/sim/cleaning-physics";
import { SolverError, type DhParam, type TriMesh, type Vec3, bboxOfVertices } from "@/lib/kernel-types";

/* ---------------------------------------------------------------- Schemas */

const Vec3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const DhParamSchema = z.object({
  alpha: z.number(),
  a: z.number(),
  d: z.number(),
  theta: z.number(),
  limits: z.object({ min: z.number(), max: z.number() }).optional(),
});

const PhysicsBody = z.object({
  surface: z.object({
    vertices: z.array(z.number()).min(9),  // ≥3 verts × 3 components
    indices: z.array(z.number().int().nonnegative()).min(3),
  }),
  trajectory: z.array(Vec3Schema).min(1),
  params: z.object({
    toolRadius: z.number().positive(),
    coverageBandM: z.number().nonnegative().optional(),
    kStiffness: z.number().positive().optional(),
    cDamping: z.number().nonnegative().optional(),
    dtS: z.number().positive().optional(),
    robotChain: z.array(DhParamSchema).optional(),
    ikLambda: z.number().positive().optional(),
    ikTol: z.number().positive().optional(),
  }),
  projectId: z.string().optional(),
});

const LegacyBody = z.object({
  partId: z.string().min(1),
  strategy: z.string().min(1),
  mode: z.string().min(1),
  projectId: z.string().optional(),
});

/* ---------------------------------------------------------------- POST */

export async function POST(req: NextRequest) {
  const auth = await requireSessionOrApiKey(req);
  if (auth instanceof NextResponse) return auth;

  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== "object") {
    return NextResponse.json(
      { error: "Invalid body — expected JSON object" },
      { status: 400 },
    );
  }

  const looksLikePhysics = typeof (raw as Record<string, unknown>).surface === "object"
    && typeof (raw as Record<string, unknown>).trajectory === "object";

  const started = Date.now();

  if (looksLikePhysics) {
    const parsed = PhysicsBody.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid physics body", details: parsed.error.issues },
        { status: 400 },
      );
    }

    try {
      const verts = new Float32Array(parsed.data.surface.vertices);
      const indices = new Uint32Array(parsed.data.surface.indices);
      if (verts.length % 3 !== 0) {
        return NextResponse.json(
          { error: "Invalid surface — vertices length must be divisible by 3" },
          { status: 400 },
        );
      }
      if (indices.length % 3 !== 0) {
        return NextResponse.json(
          { error: "Invalid surface — indices length must be divisible by 3" },
          { status: 400 },
        );
      }

      const triMesh: TriMesh = {
        vertices: verts,
        indices,
        bbox: bboxOfVertices(verts),
      };

      const trajectory: Vec3[] = parsed.data.trajectory;
      const params: CleaningPhysicsParams = {
        toolRadius: parsed.data.params.toolRadius,
        coverageBandM: parsed.data.params.coverageBandM,
        kStiffness: parsed.data.params.kStiffness,
        cDamping: parsed.data.params.cDamping,
        dtS: parsed.data.params.dtS,
        robotChain: parsed.data.params.robotChain as DhParam[] | undefined,
        ikLambda: parsed.data.params.ikLambda,
        ikTol: parsed.data.params.ikTol,
      };

      const result: CleaningSimResult = simulateCleaning(triMesh, trajectory, params);

      let runId = "";
      if (parsed.data.projectId) {
        const [row] = await db
          .insert(schema.opensimulationRuns)
          .values({
            projectId: parsed.data.projectId,
            domain: "cleaning",
            status: "done",
            triggeredBy: auth.via === "api-key" ? "api-key" : "session",
            inputJson: {
              kind: "physics",
              triangleCount: result.meshStats.triangleCount,
              waypointCount: trajectory.length,
              toolRadius: params.toolRadius,
            },
            resultJson: result as unknown as Record<string, unknown>,
            durationMs: Date.now() - started,
          })
          .returning({ id: schema.opensimulationRuns.id })
          .catch(() => [{ id: "" }]);
        runId = row?.id || "";
      }

      return NextResponse.json({ kind: "physics", ...result, runId });
    } catch (err) {
      if (err instanceof SolverError) {
        return NextResponse.json(
          { error: "Solver failed", code: err.code, details: { message: err.message } },
          { status: err.code === "BAD_INPUT" ? 422 : 500 },
        );
      }
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: "Physics simulation failed — falling back to emulator unavailable here", details: { message } },
        { status: 500 },
      );
    }
  }

  // Legacy lookup-table emulator path.
  const parsed = LegacyBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = runCleaning({
      partId: parsed.data.partId,
      strategy: parsed.data.strategy,
      mode: parsed.data.mode,
    });

    let runId = "";
    if (parsed.data.projectId) {
      const [row] = await db
        .insert(schema.opensimulationRuns)
        .values({
          projectId: parsed.data.projectId,
          domain: "cleaning",
          status: "done",
          triggeredBy: auth.via === "api-key" ? "api-key" : "session",
          inputJson: { kind: "legacy", ...parsed.data },
          resultJson: result as unknown as Record<string, unknown>,
          durationMs: Date.now() - started,
        })
        .returning({ id: schema.opensimulationRuns.id })
        .catch(() => [{ id: "" }]);
      runId = row?.id || "";
    }

    return NextResponse.json({ kind: "legacy", ...result, runId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Emulator failed", details: { message } },
      { status: 500 },
    );
  }
}
