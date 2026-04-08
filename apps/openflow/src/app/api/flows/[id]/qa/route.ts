import { NextRequest, NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/api-auth";
import { getFlowById } from "@/db/queries/flows";
import { getQAFindings, replaceQAFindings, dismissQAFinding } from "@/db/queries/collaboration";
import type { FlowDefinition, StepComponent } from "@opensoftware/openflow-core";

// ─── QA Analysis Engine ───────────────────────────────────────────────────────

interface QAFinding {
  stepId?: string;
  componentId?: string;
  category: "color" | "typography" | "spacing" | "theme" | "accessibility" | "structure";
  severity: "error" | "warning" | "info";
  message: string;
  suggestion?: string;
}

function isValidHexColor(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(color);
}

function runQAAnalysis(flow: FlowDefinition): QAFinding[] {
  const findings: QAFinding[] = [];
  const theme = flow.settings?.theme;

  // ── Theme consistency checks ──────────────────────────────────────────────
  if (theme) {
    if (!isValidHexColor(theme.primaryColor)) {
      findings.push({ category: "color", severity: "error", message: `Primärfarbe "${theme.primaryColor}" ist kein gültiger Hex-Wert.`, suggestion: "Verwende ein gültiges Hex-Format, z.B. #4C5FD5." });
    }
    if (!isValidHexColor(theme.backgroundColor)) {
      findings.push({ category: "color", severity: "error", message: `Hintergrundfarbe "${theme.backgroundColor}" ist kein gültiger Hex-Wert.` });
    }
    if (theme.primaryColor === theme.backgroundColor) {
      findings.push({ category: "color", severity: "warning", message: "Primärfarbe und Hintergrundfarbe sind identisch — schlechter Kontrast.", suggestion: "Wähle kontrastierende Farben für bessere Lesbarkeit." });
    }
    if (!theme.fontFamily && !theme.bodyFont) {
      findings.push({ category: "typography", severity: "info", message: "Keine Schriftart definiert. Standard-Browser-Schrift wird verwendet.", suggestion: "Lege eine Schriftart im Design-Panel fest." });
    }
  }

  // ── Step-level checks ─────────────────────────────────────────────────────
  const startSteps = flow.steps.filter((s) => s.type === "start");
  const endSteps = flow.steps.filter((s) => s.type === "end");

  if (startSteps.length === 0) {
    findings.push({ category: "structure", severity: "error", message: "Kein Startschritt vorhanden.", suggestion: "Jeder Flow muss genau einen Startschritt haben." });
  }
  if (startSteps.length > 1) {
    findings.push({ category: "structure", severity: "error", message: `${startSteps.length} Startschritte gefunden — nur einer erlaubt.` });
  }
  if (endSteps.length === 0) {
    findings.push({ category: "structure", severity: "warning", message: "Kein Endschritt vorhanden.", suggestion: "Füge einen Endschritt hinzu, um den Flow abzuschließen." });
  }

  // Unreachable steps
  const reachableStepIds = new Set<string>();
  if (flow.steps.length > 0) {
    const startStep = startSteps[0];
    if (startStep) {
      const queue = [startStep.id];
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (reachableStepIds.has(current)) continue;
        reachableStepIds.add(current);
        const outgoing = flow.edges.filter((e) => e.sourceStepId === current);
        for (const edge of outgoing) queue.push(edge.targetStepId);
      }
    }
    for (const step of flow.steps) {
      if (!reachableStepIds.has(step.id) && step.type !== "start") {
        findings.push({ stepId: step.id, category: "structure", severity: "warning", message: `Schritt "${step.label}" ist nicht erreichbar.`, suggestion: "Verbinde den Schritt mit dem restlichen Flow oder entferne ihn." });
      }
    }
  }

  // ── Component-level checks ────────────────────────────────────────────────
  const usedFieldKeys = new Set<string>();
  const usedFontSizes = new Set<string>();
  const usedColors = new Set<string>();

  for (const step of flow.steps) {
    if (step.components.length === 0 && step.type === "step") {
      findings.push({ stepId: step.id, category: "structure", severity: "info", message: `Schritt "${step.label}" hat keine Elemente.`, suggestion: "Füge Elemente hinzu oder entferne den Schritt." });
    }

    for (const comp of step.components) {
      // Duplicate fieldKey detection
      if (comp.fieldKey && usedFieldKeys.has(comp.fieldKey)) {
        findings.push({ stepId: step.id, componentId: comp.id, category: "structure", severity: "error", message: `Feldschlüssel "${comp.fieldKey}" wird mehrfach verwendet.`, suggestion: "Feldschlüssel müssen eindeutig sein, da sie Antworten identifizieren." });
      }
      if (comp.fieldKey) usedFieldKeys.add(comp.fieldKey);

      const overrides = comp.config?.styleOverrides as Record<string, string> | undefined;
      if (overrides) {
        // Collect used non-theme colors
        if (overrides.textColor && isValidHexColor(overrides.textColor)) usedColors.add(overrides.textColor);
        if (overrides.backgroundColor && isValidHexColor(overrides.backgroundColor)) usedColors.add(overrides.backgroundColor);
        if (overrides.fontSize) usedFontSizes.add(overrides.fontSize);

        // Check if overrides deviate from theme
        if (theme && overrides.textColor && overrides.textColor !== theme.textColor && overrides.textColor !== theme.headingColor) {
          findings.push({ stepId: step.id, componentId: comp.id, category: "theme", severity: "info", message: `Element "${comp.label || comp.componentType}" verwendet eine abweichende Textfarbe (${overrides.textColor}).`, suggestion: `Theme-Textfarbe ist ${theme.textColor}. Prüfe, ob dies beabsichtigt ist.` });
        }
      }

      // Accessibility: image-block without alt text
      if (comp.componentType === "image-block" && !comp.config?.altText) {
        findings.push({ stepId: step.id, componentId: comp.id, category: "accessibility", severity: "warning", message: `Bild "${comp.label || "Bild"}" hat keinen Alt-Text.`, suggestion: "Füge einen Alt-Text für Barrierefreiheit hinzu." });
      }

      // Heading without content
      if (comp.componentType === "heading" && !comp.config?.text) {
        findings.push({ stepId: step.id, componentId: comp.id, category: "structure", severity: "warning", message: `Überschrift in "${step.label}" hat keinen Text.`, suggestion: "Füge einen Überschriftentext hinzu." });
      }

      // Required fields without label
      if (comp.required && !comp.label) {
        findings.push({ stepId: step.id, componentId: comp.id, category: "accessibility", severity: "info", message: `Pflichtfeld (${comp.componentType}) hat kein Label.`, suggestion: "Beschriftungen helfen Nutzern, Pflichtfelder zu verstehen." });
      }
    }
  }

  // ── Typography consistency ────────────────────────────────────────────────
  if (usedFontSizes.size > 4) {
    findings.push({ category: "typography", severity: "warning", message: `${usedFontSizes.size} verschiedene Schriftgrößen verwendet: ${Array.from(usedFontSizes).join(", ")}.`, suggestion: "Reduziere auf 2–3 Schriftgrößen für ein konsistentes Erscheinungsbild." });
  }

  // ── Color consistency ─────────────────────────────────────────────────────
  if (usedColors.size > 5) {
    findings.push({ category: "color", severity: "warning", message: `${usedColors.size} verschiedene Farben in Style-Overrides verwendet.`, suggestion: "Nutze bevorzugt die Theme-Farben für ein einheitliches Design." });
  }

  return findings;
}

// ─── Route Handlers ───────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { id } = await params;
    const findings = await getQAFindings(id);
    return NextResponse.json(findings);
  } catch (error) {
    console.error("[GET /api/flows/[id]/qa]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    // Action: dismiss a specific finding
    if (body.action === "dismiss" && body.findingId) {
      const finding = await dismissQAFinding(body.findingId);
      return NextResponse.json(finding);
    }

    // Default: run fresh QA analysis
    const flow = await getFlowById(id);
    if (!flow) {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 });
    }

    const rawFindings = runQAAnalysis(flow as unknown as FlowDefinition);
    const saved = await replaceQAFindings(id, rawFindings);

    return NextResponse.json(saved);
  } catch (error) {
    console.error("[POST /api/flows/[id]/qa]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
