import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/db";

interface Params { params: Promise<{ id: string }> }

interface GruppeRow {
  berechtigungen: string;
  erlaubte_pipelines: string;
}

function parseGruppe(g: GruppeRow) {
  return {
    ...g,
    berechtigungen: JSON.parse(g.berechtigungen || "[]"),
    erlaubtePipelines: JSON.parse(g.erlaubte_pipelines || "[]"),
  };
}

// PATCH /api/gruppen/:id — Update permission group
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();

  const gruppe = sqlite.prepare("SELECT id FROM pip_berechtigungsgruppen WHERE id = ?").get(id);
  if (!gruppe) {
    return NextResponse.json({ error: "Gruppe nicht gefunden" }, { status: 404 });
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) { updates.push("name = ?"); values.push(body.name); }
  if (body.beschreibung !== undefined) { updates.push("beschreibung = ?"); values.push(body.beschreibung); }
  if (body.farbe !== undefined) { updates.push("farbe = ?"); values.push(body.farbe); }
  if (body.berechtigungen !== undefined) { updates.push("berechtigungen = ?"); values.push(JSON.stringify(body.berechtigungen)); }
  if (body.erlaubtePipelines !== undefined) { updates.push("erlaubte_pipelines = ?"); values.push(JSON.stringify(body.erlaubtePipelines)); }

  if (updates.length === 0) {
    return NextResponse.json({ error: "Keine Felder zum Aktualisieren" }, { status: 400 });
  }

  updates.push("updated_at = unixepoch()");
  values.push(id);
  sqlite.prepare(`UPDATE pip_berechtigungsgruppen SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  const updated = sqlite.prepare("SELECT * FROM pip_berechtigungsgruppen WHERE id = ?").get(id) as GruppeRow;
  return NextResponse.json(parseGruppe(updated));
}

// DELETE /api/gruppen/:id — Delete permission group
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  sqlite.prepare("DELETE FROM pip_user_gruppen WHERE gruppen_id = ?").run(id);
  sqlite.prepare("DELETE FROM pip_berechtigungsgruppen WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
