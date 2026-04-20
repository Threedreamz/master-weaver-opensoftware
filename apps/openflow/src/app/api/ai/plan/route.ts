import { NextRequest, NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/api-auth";
import { callClaudeCli } from "@/lib/claude-cli";
import type { GenerateBriefing } from "../generate/route";

function buildPlanPrompt(briefing: GenerateBriefing): string {
  const desiredStepsBlock = briefing.desiredSteps && briefing.desiredSteps.length > 0
    ? briefing.desiredSteps.map((s) => `- ${s}`).join("\n")
    : "";

  return `Du planst einen mehrstufigen Conversion-Flow.
Erzeuge eine klare, knappe OUTLINE (kein JSON, kein Code) im Format:

Seite 1: <Titel>
  • <Komponente>: <Beschreibung>
  • <Komponente>: <Beschreibung>

Seite 2: ...

Briefing:
- Ziel: ${briefing.goal}
- Branche: ${briefing.industry ?? "Allgemein"}
- Zielgruppe: ${briefing.audience ?? "Allgemein"}
- Conversion-Ziel: ${briefing.conversionGoal ?? "Lead generieren"}
- Tonalität: ${briefing.tone ?? "Professionell"}
- Sprache: ${briefing.language === "en" ? "Englisch" : "Deutsch"}
${desiredStepsBlock ? `\nGewünschte Seiten / Fragen:\n${desiredStepsBlock}\n` : ""}
Pflicht: 4–7 Seiten, beginne mit Willkommen, ende mit Bestätigungsseite,
inklusive Kontaktdaten- und ggf. Terminseite.

Antworte NUR mit der Outline im genannten Format – kein Vorwort, kein Nachwort, kein Markdown-Fence.`;
}

export async function POST(request: NextRequest) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const body = await request.json();
    const briefing: GenerateBriefing = body.briefing ?? body;

    if (!briefing?.goal) {
      return NextResponse.json({ error: "briefing.goal is required" }, { status: 400 });
    }

    const prompt = buildPlanPrompt(briefing);

    let plan: string;
    try {
      plan = (await callClaudeCli(prompt)).trim();
    } catch (err) {
      console.error("[POST /api/ai/plan] Claude CLI failed:", err);
      return NextResponse.json(
        { error: "AI nicht verfügbar" },
        { status: 503 },
      );
    }

    if (!plan) {
      return NextResponse.json(
        { error: "AI nicht verfügbar" },
        { status: 503 },
      );
    }

    return NextResponse.json({ plan, aiUsed: true });
  } catch (error) {
    console.error("[POST /api/ai/plan]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
