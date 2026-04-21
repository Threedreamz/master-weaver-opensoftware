export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireSessionOrApiKey } from "@/lib/auth-helpers";
import { SolveKinematicBody } from "@/lib/api-contracts";
import { SolverError, type Joint } from "@/lib/kernel-types";
import { forwardKinematics } from "@/lib/solvers/kinematic-fwd";
import { inverseKinematics } from "@/lib/solvers/kinematic-ik";

/**
 * Convert a flat Joint list from the request body into a linear-chain Joint
 * tree (first = root, each subsequent joint becomes the single child of the
 * previous). Trees with branching aren't expressible in the M1 contract.
 */
function buildChainFromFlatJoints(
  joints: Array<{ name: string; axis: "x" | "y" | "z"; angle: number; offset: { x: number; y: number; z: number } }>,
): Joint {
  if (joints.length === 0) {
    throw new SolverError("BAD_INPUT", "joints[] is empty");
  }
  const built: Joint[] = joints.map((j) => ({
    name: j.name,
    axis: j.axis,
    angle: j.angle,
    offset: { x: j.offset.x, y: j.offset.y, z: j.offset.z },
    children: [],
  }));
  for (let i = 0; i < built.length - 1; i++) {
    built[i].children = [built[i + 1]];
  }
  return built[0];
}

/* POST /api/solve/kinematic — session-or-api-key */
export async function POST(req: NextRequest) {
  const auth = await requireSessionOrApiKey(req);
  if (auth instanceof NextResponse) return auth;

  const json = await req.json().catch(() => null);
  const parsed = SolveKinematicBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const body = parsed.data;
  const domain: "kinematic-fwd" | "kinematic-ik" =
    body.mode === "fwd" ? "kinematic-fwd" : "kinematic-ik";

  // Persist a "running" row FIRST so a crash mid-solve still leaves evidence.
  // projectId is required by schema — we use a synthetic "_ephemeral" project
  // id for unscoped solves (solve/* doesn't require a project in M1). The
  // schema has a FK so this would fail unless an ephemeral row exists; we
  // accept the same FK violation by writing NULL-safe via a dedicated path:
  // the simplest reliable fix is to require an existing project via an
  // `x-project-id` header. For M1 we fall back to writing directly and let
  // the FK surface if the client omits context.
  const projectId = req.headers.get("x-project-id") ?? undefined;

  let runId: string | null = null;
  const startedAt = Date.now();

  if (projectId) {
    const [run] = await db
      .insert(schema.opensimulationRuns)
      .values({
        projectId,
        domain,
        status: "running",
        triggeredBy: auth.via,
        inputJson: body as unknown as Record<string, unknown>,
      })
      .returning({ id: schema.opensimulationRuns.id });
    runId = run?.id ?? null;
  }

  try {
    if (body.mode === "fwd") {
      const root = buildChainFromFlatJoints(body.joints);
      const fk = forwardKinematics(root);

      // Convert Float32Array rotation to number[][] for JSON serialisation.
      const transforms = fk.transforms.map((t) => {
        const rot: number[][] = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
        for (let col = 0; col < 4; col++) {
          for (let row = 0; row < 4; row++) {
            rot[row][col] = t.rotation[col * 4 + row];
          }
        }
        return { name: t.name, position: t.position, rotation: rot };
      });

      const payload = {
        mode: "fwd" as const,
        transforms,
        endEffector: fk.endEffector,
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
    }

    // mode === "ik"
    const ik = inverseKinematics({
      chain: body.chain,
      target: body.target,
      lambda: body.lambda,
      maxIter: body.maxIter,
    });
    const payload = {
      mode: "ik" as const,
      success: ik.success,
      iterations: ik.iterations,
      jointAngles: ik.jointAngles,
      finalError: ik.finalError,
      endEffector: ik.endEffector,
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
