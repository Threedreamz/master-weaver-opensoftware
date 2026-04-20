import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/db";

interface Params { params: Promise<{ id: string }> }

// PATCH /api/users/:id — Update user (name, role)
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();

  const user = sqlite.prepare("SELECT id FROM users WHERE id = ?").get(id);
  if (!user) {
    return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) {
    updates.push("name = ?", "display_name = ?");
    values.push(body.name, body.name);
  }
  if (body.role !== undefined) {
    updates.push("role = ?");
    values.push(body.role);
  }
  if (body.email !== undefined) {
    updates.push("email = ?");
    values.push(body.email);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "Keine Felder zum Aktualisieren" }, { status: 400 });
  }

  updates.push("updated_at = unixepoch()");
  values.push(id);

  sqlite.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  const updated = sqlite.prepare(
    "SELECT id, email, name, display_name, role, created_at FROM users WHERE id = ?"
  ).get(id);

  return NextResponse.json(updated);
}

// DELETE /api/users/:id — Delete user
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const user = sqlite.prepare("SELECT id FROM users WHERE id = ?").get(id);
  if (!user) {
    return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
  }

  sqlite.prepare("DELETE FROM users WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
