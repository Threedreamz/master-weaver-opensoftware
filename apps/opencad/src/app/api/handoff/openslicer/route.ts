export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/handoff/openslicer
 *
 * Tessellate the current project to an STL and ship it server-to-server to
 * the configured openslicer instance. The heavy-lifting (export + upload +
 * deep-link) lives in `slicer-handoff.ts` — this route just verifies
 * ownership and forwards the request.
 *
 * Auth: session. 401 if missing, 404 if project is not owned.
 */

import { NextResponse, type NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { HandoffOpenslicerBody } from "@/lib/api-contracts";
import { handoffToOpenslicer } from "@/lib/slicer-handoff";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const json = await req.json().catch(() => null);
  const parsed = HandoffOpenslicerBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const body = parsed.data;

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
    const result = await handoffToOpenslicer(
      body.projectId,
      body.versionId,
      body.tessellation,
      body.openslicerBaseUrl ? { openslicerBaseUrl: body.openslicerBaseUrl } : {},
    );
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("[opencad] openslicer handoff failed:", msg);
    return NextResponse.json({ error: "internal", details: msg }, { status: 500 });
  }
}
