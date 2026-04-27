import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/db";

interface Params { params: Promise<{ id: string }> }

// GET /api/karten/:id/checklisten-status — All checklist templates + status for this card
export async function GET(_req: NextRequest, { params }: Params) {
  const { id: karteId } = await params;

  // Get the card's pipeline
  const karte = sqlite.prepare("SELECT pipeline_id FROM pip_karten WHERE id = ?").get(karteId) as { pipeline_id: string } | undefined;
  if (!karte) return NextResponse.json({ error: "Karte nicht gefunden" }, { status: 404 });

  // Get all active checklist templates assigned to this pipeline
  const alleVorlagen = sqlite.prepare(
    "SELECT * FROM pip_checklisten_vorlagen WHERE aktiv = 1 ORDER BY name ASC"
  ).all() as { id: string; zugeordnete_pipelines: string; [key: string]: unknown }[];

  const vorlagen = alleVorlagen.filter((v) => {
    const pipelines = JSON.parse(v.zugeordnete_pipelines as string || "[]") as string[];
    return pipelines.length === 0 || pipelines.includes(karte.pipeline_id);
  });

  // For each template, get items + completion status
  const result = vorlagen.map((v) => {
    const items = sqlite.prepare(
      "SELECT * FROM pip_checklisten_vorlagen_items WHERE vorlage_id = ? ORDER BY position ASC"
    ).all(v.id) as { id: string; titel: string; beschreibung: string | null; pflicht: number; position: number }[];

    const statusRows = sqlite.prepare(
      "SELECT * FROM pip_karten_checklisten_status WHERE karte_id = ? AND vorlage_id = ?"
    ).all(karteId, v.id) as { item_id: string; erledigt: number; erledigt_von: string | null; erledigt_am: number | null }[];

    const statusMap = new Map(statusRows.map((s) => [s.item_id, s]));

    return {
      ...v,
      zugeordnetePipelines: JSON.parse(v.zugeordnete_pipelines as string || "[]"),
      sichtbareGruppen: JSON.parse((v.sichtbare_gruppen as string) || "[]"),
      aktiv: !!v.aktiv,
      items: items.map((item) => {
        const status = statusMap.get(item.id);
        return {
          ...item,
          pflicht: !!item.pflicht,
          erledigt: !!status?.erledigt,
          erledigtVon: status?.erledigt_von || null,
          erledigtAm: status?.erledigt_am || null,
        };
      }),
    };
  });

  return NextResponse.json(result);
}

// POST /api/karten/:id/checklisten-status — Toggle item completion
export async function POST(req: NextRequest, { params }: Params) {
  const { id: karteId } = await params;
  const { vorlageId, itemId, erledigt, userId } = await req.json();

  if (!vorlageId || !itemId) {
    return NextResponse.json({ error: "vorlageId und itemId sind erforderlich" }, { status: 400 });
  }

  const existing = sqlite.prepare(
    "SELECT id FROM pip_karten_checklisten_status WHERE karte_id = ? AND item_id = ?"
  ).get(karteId, itemId) as { id: string } | undefined;

  if (existing) {
    sqlite.prepare(
      "UPDATE pip_karten_checklisten_status SET erledigt = ?, erledigt_von = ?, erledigt_am = ? WHERE id = ?"
    ).run(erledigt ? 1 : 0, erledigt ? (userId || null) : null, erledigt ? Math.floor(Date.now() / 1000) : null, existing.id);
  } else {
    sqlite.prepare(`
      INSERT INTO pip_karten_checklisten_status (id, karte_id, vorlage_id, item_id, erledigt, erledigt_von, erledigt_am)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), karteId, vorlageId, itemId, erledigt ? 1 : 0, erledigt ? (userId || null) : null, erledigt ? Math.floor(Date.now() / 1000) : null);
  }

  // Check if ALL items in this checklist are now completed → trigger
  if (erledigt) {
    const vorlage = sqlite.prepare(
      "SELECT trigger_pipeline_id, trigger_stufe_id, trigger_bei FROM pip_checklisten_vorlagen WHERE id = ?"
    ).get(vorlageId) as { trigger_pipeline_id: string | null; trigger_stufe_id: string | null; trigger_bei: string } | undefined;

    if (vorlage?.trigger_stufe_id && vorlage.trigger_bei === "abgeschlossen") {
      const allItems = sqlite.prepare(
        "SELECT id FROM pip_checklisten_vorlagen_items WHERE vorlage_id = ?"
      ).all(vorlageId) as { id: string }[];

      const erledigteItems = sqlite.prepare(
        "SELECT item_id FROM pip_karten_checklisten_status WHERE karte_id = ? AND vorlage_id = ? AND erledigt = 1"
      ).all(karteId, vorlageId) as { item_id: string }[];

      if (allItems.length > 0 && erledigteItems.length >= allItems.length) {
        // All done! Move card to trigger stage
        const karte = sqlite.prepare("SELECT stufe_id, pipeline_id FROM pip_karten WHERE id = ?").get(karteId) as { stufe_id: string; pipeline_id: string };

        if (karte.stufe_id !== vorlage.trigger_stufe_id) {
          const vonStufeId = karte.stufe_id;
          sqlite.prepare("UPDATE pip_karten SET stufe_id = ?, updated_at = unixepoch() WHERE id = ?")
            .run(vorlage.trigger_stufe_id, karteId);

          // Log history
          sqlite.prepare(`
            INSERT INTO pip_karten_historie (id, karte_id, aktion, von_stufe_id, nach_stufe_id, kommentar, created_at)
            VALUES (?, ?, 'verschoben', ?, ?, ?, unixepoch())
          `).run(crypto.randomUUID(), karteId, vonStufeId, vorlage.trigger_stufe_id, `Automatisch verschoben: Checkliste "${vorlageId}" abgeschlossen`);
        }

        return NextResponse.json({ ok: true, triggered: true, neueStufeId: vorlage.trigger_stufe_id });
      }
    }
  }

  return NextResponse.json({ ok: true, triggered: false });
}
