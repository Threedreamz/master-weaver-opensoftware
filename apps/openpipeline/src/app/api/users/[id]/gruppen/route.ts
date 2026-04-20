import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/db";

interface Params { params: Promise<{ id: string }> }

// GET /api/users/:id/gruppen — List groups for a user
export async function GET(_req: NextRequest, { params }: Params) {
  const { id: userId } = await params;
  const gruppen = sqlite.prepare(`
    SELECT g.* FROM pip_berechtigungsgruppen g
    JOIN pip_user_gruppen ug ON ug.gruppen_id = g.id
    WHERE ug.user_id = ?
    ORDER BY g.name ASC
  `).all(userId) as { berechtigungen: string }[];

  return NextResponse.json(gruppen.map((g) => ({
    ...g,
    berechtigungen: JSON.parse(g.berechtigungen || "[]"),
  })));
}

// POST /api/users/:id/gruppen — Assign user to group
export async function POST(req: NextRequest, { params }: Params) {
  const { id: userId } = await params;
  const { gruppenId } = await req.json();

  if (!gruppenId) {
    return NextResponse.json({ error: "gruppenId ist erforderlich" }, { status: 400 });
  }

  const existing = sqlite.prepare(
    "SELECT id FROM pip_user_gruppen WHERE user_id = ? AND gruppen_id = ?"
  ).get(userId, gruppenId);

  if (existing) {
    return NextResponse.json({ error: "User ist bereits in dieser Gruppe" }, { status: 409 });
  }

  sqlite.prepare(
    "INSERT INTO pip_user_gruppen (id, user_id, gruppen_id) VALUES (?, ?, ?)"
  ).run(crypto.randomUUID(), userId, gruppenId);

  return NextResponse.json({ ok: true }, { status: 201 });
}

// DELETE /api/users/:id/gruppen — Remove user from group (body: { gruppenId })
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id: userId } = await params;
  const { gruppenId } = await req.json();

  sqlite.prepare(
    "DELETE FROM pip_user_gruppen WHERE user_id = ? AND gruppen_id = ?"
  ).run(userId, gruppenId);

  return NextResponse.json({ ok: true });
}
