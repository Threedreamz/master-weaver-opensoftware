export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/sketch/solve
 *
 * Stateless 2D constraint solver. Takes entities + constraints, hands them
 * to `solveSketch`, returns the updated positions + DOF diagnostics.
 *
 * Stateless on purpose: the workbench can call this mid-edit dozens of times
 * per second and we don't want to round-trip DB state — the client owns the
 * sketch document and persists only when the user commits.
 *
 * Auth: session. 401 if missing.
 */

import { NextResponse, type NextRequest } from "next/server";
import { SketchSolveBody } from "@/lib/api-contracts";
import { solveSketch } from "@/lib/sketch-solver";
import { resolveUser } from "@/lib/internal-user";

export async function POST(req: NextRequest) {
  const u = await resolveUser(req);
  if (u instanceof NextResponse) return u;

  const json = await req.json().catch(() => null);
  const parsed = SketchSolveBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = solveSketch(parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("[opencad] sketch solve failed:", msg);
    return NextResponse.json({ error: "internal", details: msg }, { status: 500 });
  }
}
