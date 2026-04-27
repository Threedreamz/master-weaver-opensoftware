import { NextRequest, NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/api-auth";
import { callClaudeCli } from "@/lib/claude-cli";
import type { FlowDefinition } from "@opensoftware/openflow-core";
import type { FlowOperation } from "@/types/ai-edit";

interface EditRequest {
  flowId: string;
  instruction: string;
  flowSnapshot: FlowDefinition;
}

interface EditResponse {
  operations: FlowOperation[];
  summary: string;
  aiUsed: boolean;
}

// ─── Build a compact flow summary for the AI prompt ──────────────────────────

function buildFlowSummary(flow: FlowDefinition): string {
  const steps = flow.steps
    .filter((s) => s.type !== "start" && s.type !== "end")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const lines: string[] = [];
  lines.push(`Flow: "${flow.name}" (${steps.length} Seiten)`);
  lines.push("");

  for (let i = 0; i < flow.steps.length; i++) {
    const s = flow.steps[i]!;
    const title = (s.config as unknown as Record<string, unknown>)?.title as string | undefined;
    lines.push(`Step [${s.id}] (${s.type}) Label="${s.label}" ${title ? `Titel="${title}"` : ""}`);
    for (const c of s.components) {
      lines.push(
        `  Component [${c.id}] type=${c.componentType} fieldKey=${c.fieldKey} label="${c.label ?? ""}" required=${c.required}`
      );
    }
  }

  if (flow.edges.length > 0) {
    lines.push("");
    lines.push("Regeln:");
    for (const e of flow.edges) {
      const cond =
        e.conditionType === "always"
          ? "immer"
          : `${e.conditionFieldKey} ${e.conditionType} "${e.conditionValue}"`;
      lines.push(`  Edge [${e.id}] ${e.sourceStepId} → ${e.targetStepId} (${cond}, Priorität ${e.priority})`);
    }
  }

  return lines.join("\n");
}

// ─── Call Claude with tool_use ────────────────────────────────────────────────

async function editWithAI(
  instruction: string,
  flowSnapshot: FlowDefinition
): Promise<{ operations: FlowOperation[]; summary: string } | null> {
  try {
    const flowSummary = buildFlowSummary(flowSnapshot);

    const prompt = `Du bist ein KI-Assistent für den OpenFlow-Editor. Der Nutzer gibt dir Anweisungen, wie er seinen Flow bearbeiten möchte. Du analysierst die Anweisung und gibst strukturierte Operationen zurück, die diese Änderungen umsetzen.

Aktueller Flow-Stand:
${flowSummary}

WICHTIG:
- Verwende immer die exakten IDs aus dem obigen Flow-Stand (stepId, componentId, edgeId)
- Neue Elemente brauchen keine ID (werden serverseitig generiert)
- Erkläre am Ende kurz auf Deutsch, was du geändert hast (summary)
- Wenn die Anweisung unklar ist, mache eine sinnvolle Interpretation und erkläre sie im summary

Anweisung des Nutzers:
${instruction}

Antworte NUR mit einem gültigen JSON-Objekt in folgender Form (kein Text davor/danach, kein Markdown-Codeblock):
{
  "operations": [
    {
      "type": "add_step" | "delete_step" | "update_step" | "add_component" | "update_component" | "delete_component" | "add_edge" | "update_edge" | "delete_edge" | "update_settings",
      "stepId": "string (bei update/delete)",
      "label": "string (bei add_step)",
      "stepType": "step",
      "config": { "title": "...", "subtitle": "...", "layout": "...", "showProgress": true },
      "insertAfterStepId": "string",
      "changes": { },
      "componentId": "string (bei update/delete)",
      "component": {
        "componentType": "string",
        "fieldKey": "string",
        "label": "string",
        "required": true,
        "config": { }
      },
      "afterComponentId": "string",
      "edgeId": "string (bei update/delete)",
      "sourceStepId": "string",
      "targetStepId": "string",
      "conditionType": "string",
      "conditionFieldKey": "string",
      "conditionValue": "string",
      "priority": 0
    }
  ],
  "summary": "Kurze Beschreibung auf Deutsch, was geändert wurde"
}

Nur die für die jeweilige Operation relevanten Felder einfügen. "type" ist immer Pflicht.

JSON:`;

    const text = (await callClaudeCli(prompt, { timeoutMs: 300_000 })).trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const result = JSON.parse(jsonMatch[0]) as { operations?: FlowOperation[]; summary?: string };
    return { operations: result.operations ?? [], summary: result.summary ?? "" };
  } catch (err) {
    console.error("[AI edit] Failed:", err);
    return null;
  }
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const body: EditRequest = await request.json();
    const { instruction, flowSnapshot } = body;

    if (!instruction?.trim()) {
      return NextResponse.json({ error: "instruction is required" }, { status: 400 });
    }
    if (!flowSnapshot) {
      return NextResponse.json({ error: "flowSnapshot is required" }, { status: 400 });
    }

    const aiResult = await editWithAI(instruction, flowSnapshot);

    if (!aiResult) {
      return NextResponse.json(
        { error: "KI-Bearbeitung nicht verfügbar. Claude CLI konnte keine Operationen erzeugen." },
        { status: 503 }
      );
    }

    const response: EditResponse = {
      operations: aiResult.operations,
      summary: aiResult.summary,
      aiUsed: true,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[POST /api/ai/edit]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
