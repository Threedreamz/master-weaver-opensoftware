export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { resolveUser } from "@/lib/internal-user";
import { db, schema } from "@/db";
import { asc, eq, isNull, or } from "drizzle-orm";
import { PostCreateBody } from "@/lib/api-contracts";

function serializePost(row: typeof schema.opencamPosts.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    dialect: row.dialect,
    templateGcode: row.templateGcode,
    builtIn: row.builtIn,
  };
}

/* GET /api/posts — list caller's posts + built-in (userId IS NULL) posts. */
export async function GET(req: NextRequest) {
  const u = await resolveUser(req);
  if (u instanceof NextResponse) return u;
  const userId = u.id;

  const rows = await db
    .select()
    .from(schema.opencamPosts)
    .where(
      or(
        isNull(schema.opencamPosts.userId),
        eq(schema.opencamPosts.userId, userId),
      ),
    )
    .orderBy(asc(schema.opencamPosts.name));

  return NextResponse.json({ items: rows.map(serializePost) });
}

/* POST /api/posts — create a user-owned post. */
export async function POST(req: NextRequest) {
  const u = await resolveUser(req);
  if (u instanceof NextResponse) return u;
  const userId = u.id;

  const json = await req.json().catch(() => null);
  const parsed = PostCreateBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const [row] = await db
    .insert(schema.opencamPosts)
    .values({
      userId,
      name: body.name,
      dialect: body.dialect,
      templateGcode: body.templateGcode,
      builtIn: false, // user-created rows are never built-in regardless of body flag
    })
    .returning();

  return NextResponse.json(serializePost(row), { status: 201 });
}
