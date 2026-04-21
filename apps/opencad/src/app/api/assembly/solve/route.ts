export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/assembly/solve
 *
 * Stateless 3D assembly mate solver. Takes parts (6-DoF poses) + mates,
 * hands them to `solveAssembly`, returns the updated poses + DoF diagnostics.
 *
 * Stateless on purpose: the assembly workbench can call this mid-edit
 * dozens of times per second and we don't want to round-trip DB state —
 * the client owns the assembly document and persists only when the user commits.
 *
 * Auth: session. 401 if missing.
 * Over-determined sets (negative DoF) short-circuit to 422 before calling
 * the solver, so the client can surface a clear error without spinning.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  solveAssembly,
  type AssemblySolveInput,
  type MateKind,
} from "@/lib/assembly/mate-solver";

const Vec3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const PartPoseSchema = z.object({
  id: z.string().min(1),
  fixed: z.boolean().optional(),
  translation: Vec3Schema,
  rotationDeg: Vec3Schema,
});

const MateAnchorSchema = z.object({
  partId: z.string().min(1),
  kind: z.enum(["point", "axis"]),
  position: Vec3Schema,
  direction: Vec3Schema.optional(),
});

const MateKindSchema: z.ZodType<MateKind> = z.enum([
  "fix",
  "coincident",
  "concentric",
  "parallel",
  "distance",
  "angle",
]);

const MateSchema = z.object({
  id: z.string().min(1),
  kind: MateKindSchema,
  a: MateAnchorSchema,
  b: MateAnchorSchema,
  value: z.number().optional(),
});

const AssemblySolveBody = z.object({
  parts: z.array(PartPoseSchema),
  mates: z.array(MateSchema),
  tolerance: z.number().positive().optional(),
  maxIterations: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = AssemblySolveBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input: AssemblySolveInput = parsed.data;

  // Over-determined guard: non-fixed parts contribute 6 DoF each; every mate
  // consumes (conservatively) 1. If mates > 6 * nonFixed, the set is definitely
  // over-determined. Let the solver decide for the soft cases; this catches
  // the obvious ones early.
  const nonFixed = input.parts.filter((p) => !p.fixed).length;
  if (input.mates.length > 6 * nonFixed && nonFixed > 0) {
    return NextResponse.json(
      {
        error: "over_determined",
        details: {
          nonFixedParts: nonFixed,
          mates: input.mates.length,
          maxDof: 6 * nonFixed,
        },
      },
      { status: 422 },
    );
  }

  try {
    const result = solveAssembly(input);
    if (result.status === "over-constrained") {
      return NextResponse.json(
        { error: "over_determined", details: result },
        { status: 422 },
      );
    }
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("[opencad] assembly solve failed:", msg);
    return NextResponse.json({ error: "internal", details: msg }, { status: 500 });
  }
}
