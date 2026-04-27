export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";

type RouteCtx = { params: Promise<{ id: string }> };

/**
 * GET /api/gcode/[id]/download
 *
 * Streams a previously-generated G-Code blob back as a downloadable .nc file.
 * Ownership-checked via join on the parent project. Returns 404 if the gcode
 * row exists but the caller doesn't own the project.
 */
export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await ctx.params;

  const [row] = await db
    .select({
      gcode: schema.opencamGcode,
      project: schema.opencamProjects,
    })
    .from(schema.opencamGcode)
    .innerJoin(
      schema.opencamProjects,
      eq(schema.opencamGcode.projectId, schema.opencamProjects.id),
    )
    .where(
      and(
        eq(schema.opencamGcode.id, id),
        eq(schema.opencamProjects.userId, userId),
        isNull(schema.opencamProjects.deletedAt),
      ),
    )
    .limit(1);

  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const text = row.gcode.gcodeText ?? "";
  const safeName = (row.project.name || "opencam")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "opencam";
  const filename = `${safeName}-${row.gcode.id.slice(0, 8)}.nc`;

  return new NextResponse(text, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Line-Count": String(row.gcode.lineCount),
      "X-Estimated-Duration-Sec": String(row.gcode.estimatedDurationSec),
    },
  });
}
