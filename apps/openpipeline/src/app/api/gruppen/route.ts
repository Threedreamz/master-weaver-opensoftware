import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/db";

interface GruppeRow {
  id: string;
  name: string;
  beschreibung: string | null;
  farbe: string;
  berechtigungen: string;
  erlaubte_pipelines: string;
  created_at: number;
}

function parseGruppe(g: GruppeRow) {
  return {
    ...g,
    berechtigungen: JSON.parse(g.berechtigungen || "[]"),
    erlaubtePipelines: JSON.parse(g.erlaubte_pipelines || "[]"),
  };
}

// GET /api/gruppen — List all permission groups
export async function GET() {
  const gruppen = sqlite.prepare(
    "SELECT * FROM pip_berechtigungsgruppen ORDER BY name ASC"
  ).all() as GruppeRow[];

  return NextResponse.json(gruppen.map(parseGruppe));
}

// POST /api/gruppen — Create a new permission group
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, beschreibung, farbe, berechtigungen, erlaubtePipelines } = body;

  if (!name) {
    return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
  }

  const existing = sqlite.prepare("SELECT id FROM pip_berechtigungsgruppen WHERE name = ?").get(name);
  if (existing) {
    return NextResponse.json({ error: "Gruppenname bereits vergeben" }, { status: 409 });
  }

  const id = crypto.randomUUID();
  sqlite.prepare(
    "INSERT INTO pip_berechtigungsgruppen (id, name, beschreibung, farbe, berechtigungen, erlaubte_pipelines) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    name,
    beschreibung || null,
    farbe || "#6366f1",
    JSON.stringify(berechtigungen || []),
    JSON.stringify(erlaubtePipelines || []),
  );

  const gruppe = sqlite.prepare("SELECT * FROM pip_berechtigungsgruppen WHERE id = ?").get(id) as GruppeRow;
  return NextResponse.json(parseGruppe(gruppe), { status: 201 });
}
