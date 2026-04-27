import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/db";

interface Params { params: Promise<{ id: string }> }

// PATCH /api/checklisten-vorlagen/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();

  const vorlage = sqlite.prepare("SELECT id FROM pip_checklisten_vorlagen WHERE id = ?").get(id);
  if (!vorlage) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) { updates.push("name = ?"); values.push(body.name); }
  if (body.beschreibung !== undefined) { updates.push("beschreibung = ?"); values.push(body.beschreibung); }
  if (body.farbe !== undefined) { updates.push("farbe = ?"); values.push(body.farbe); }
  if (body.zugeordnetePipelines !== undefined) { updates.push("zugeordnete_pipelines = ?"); values.push(JSON.stringify(body.zugeordnetePipelines)); }
  if (body.sichtbareGruppen !== undefined) { updates.push("sichtbare_gruppen = ?"); values.push(JSON.stringify(body.sichtbareGruppen)); }
  if (body.triggerPipelineId !== undefined) { updates.push("trigger_pipeline_id = ?"); values.push(body.triggerPipelineId || null); }
  if (body.triggerStufeId !== undefined) { updates.push("trigger_stufe_id = ?"); values.push(body.triggerStufeId || null); }
  if (body.triggerBei !== undefined) { updates.push("trigger_bei = ?"); values.push(body.triggerBei); }
  if (body.aktiv !== undefined) { updates.push("aktiv = ?"); values.push(body.aktiv ? 1 : 0); }

  if (updates.length > 0) {
    updates.push("updated_at = unixepoch()");
    values.push(id);
    sqlite.prepare(`UPDATE pip_checklisten_vorlagen SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  }

  // Replace items if provided
  if (Array.isArray(body.items)) {
    sqlite.prepare("DELETE FROM pip_checklisten_vorlagen_items WHERE vorlage_id = ?").run(id);
    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      sqlite.prepare(`
        INSERT INTO pip_checklisten_vorlagen_items (id, vorlage_id, titel, beschreibung, pflicht, position)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(item.id || crypto.randomUUID(), id, item.titel, item.beschreibung || null, item.pflicht ? 1 : 0, i);
    }
  }

  const updated = sqlite.prepare("SELECT * FROM pip_checklisten_vorlagen WHERE id = ?").get(id) as Record<string, unknown>;
  const items = sqlite.prepare("SELECT * FROM pip_checklisten_vorlagen_items WHERE vorlage_id = ? ORDER BY position ASC").all(id);

  return NextResponse.json({
    ...updated,
    zugeordnetePipelines: JSON.parse((updated.zugeordnete_pipelines as string) || "[]"),
    sichtbareGruppen: JSON.parse((updated.sichtbare_gruppen as string) || "[]"),
    aktiv: !!updated.aktiv,
    items,
  });
}

// DELETE /api/checklisten-vorlagen/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  sqlite.prepare("DELETE FROM pip_karten_checklisten_status WHERE vorlage_id = ?").run(id);
  sqlite.prepare("DELETE FROM pip_checklisten_vorlagen_items WHERE vorlage_id = ?").run(id);
  sqlite.prepare("DELETE FROM pip_checklisten_vorlagen WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
