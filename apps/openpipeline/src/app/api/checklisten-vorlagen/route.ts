import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/db";

interface VorlageRow {
  id: string;
  name: string;
  beschreibung: string | null;
  farbe: string;
  zugeordnete_pipelines: string;
  sichtbare_gruppen: string;
  trigger_pipeline_id: string | null;
  trigger_stufe_id: string | null;
  trigger_bei: string;
  aktiv: number;
  created_at: number;
  updated_at: number;
}

function parseVorlage(v: VorlageRow) {
  return {
    ...v,
    zugeordnetePipelines: JSON.parse(v.zugeordnete_pipelines || "[]"),
    sichtbareGruppen: JSON.parse(v.sichtbare_gruppen || "[]"),
    triggerPipelineId: v.trigger_pipeline_id,
    triggerStufeId: v.trigger_stufe_id,
    triggerBei: v.trigger_bei,
    aktiv: !!v.aktiv,
  };
}

// GET /api/checklisten-vorlagen
export async function GET() {
  const vorlagen = sqlite.prepare(
    "SELECT * FROM pip_checklisten_vorlagen ORDER BY name ASC"
  ).all() as VorlageRow[];

  const result = vorlagen.map((v) => {
    const items = sqlite.prepare(
      "SELECT * FROM pip_checklisten_vorlagen_items WHERE vorlage_id = ? ORDER BY position ASC"
    ).all(v.id);
    return { ...parseVorlage(v), items };
  });

  return NextResponse.json(result);
}

// POST /api/checklisten-vorlagen
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name, beschreibung, farbe,
    zugeordnetePipelines, sichtbareGruppen,
    triggerPipelineId, triggerStufeId, triggerBei,
    items,
  } = body;

  if (!name) {
    return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  sqlite.prepare(`
    INSERT INTO pip_checklisten_vorlagen
    (id, name, beschreibung, farbe, zugeordnete_pipelines, sichtbare_gruppen, trigger_pipeline_id, trigger_stufe_id, trigger_bei)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, name, beschreibung || null, farbe || "#10b981",
    JSON.stringify(zugeordnetePipelines || []),
    JSON.stringify(sichtbareGruppen || []),
    triggerPipelineId || null, triggerStufeId || null, triggerBei || "abgeschlossen",
  );

  // Insert items
  if (Array.isArray(items)) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      sqlite.prepare(`
        INSERT INTO pip_checklisten_vorlagen_items (id, vorlage_id, titel, beschreibung, pflicht, position)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), id, item.titel, item.beschreibung || null, item.pflicht ? 1 : 0, i);
    }
  }

  const vorlage = sqlite.prepare("SELECT * FROM pip_checklisten_vorlagen WHERE id = ?").get(id) as VorlageRow;
  const savedItems = sqlite.prepare(
    "SELECT * FROM pip_checklisten_vorlagen_items WHERE vorlage_id = ? ORDER BY position ASC"
  ).all(id);

  return NextResponse.json({ ...parseVorlage(vorlage), items: savedItems }, { status: 201 });
}
