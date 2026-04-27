import { NextRequest, NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/api-auth";
import { callClaudeCli } from "@/lib/claude-cli";
import type { FlowStep } from "@opensoftware/openflow-core";

interface SuggestRequest {
  context: "step" | "component" | "headline" | "cta" | "layout";
  step?: FlowStep;
  componentType?: string;
  currentText?: string;
  flowGoal?: string;
  industry?: string;
  tone?: string;
  language?: "de" | "en";
}

interface Suggestion {
  type: string;
  label: string;
  value: string;
  description?: string;
}

// ─── Rule-based suggestions (fallback without AI) ─────────────────────────────

const HEADLINE_TEMPLATES_DE = [
  "Erzähl uns mehr über dich",
  "Fast geschafft!",
  "Ein paar kurze Fragen",
  "Deine persönlichen Angaben",
  "Wie können wir helfen?",
  "Wähle deine Option",
  "Letzte Frage",
  "Zusammenfassung",
];

const HEADLINE_TEMPLATES_EN = [
  "Tell us about yourself",
  "Almost done!",
  "A few quick questions",
  "Your personal details",
  "How can we help?",
  "Choose your option",
  "Last question",
  "Summary",
];

const CTA_TEMPLATES_DE = [
  "Jetzt kostenlos anfragen",
  "Weiter",
  "Angebot erhalten",
  "Jetzt starten",
  "Mehr erfahren",
  "Termin buchen",
  "Kostenlos testen",
  "Absenden",
];

const CTA_TEMPLATES_EN = [
  "Get started for free",
  "Continue",
  "Get a quote",
  "Start now",
  "Learn more",
  "Book a call",
  "Try for free",
  "Submit",
];

function getRuleBasedSuggestions(req: SuggestRequest): Suggestion[] {
  const isDE = req.language !== "en";
  const suggestions: Suggestion[] = [];

  if (req.context === "headline") {
    const templates = isDE ? HEADLINE_TEMPLATES_DE : HEADLINE_TEMPLATES_EN;
    for (const t of templates.slice(0, 5)) {
      suggestions.push({ type: "headline", label: t, value: t });
    }
  }

  if (req.context === "cta") {
    const templates = isDE ? CTA_TEMPLATES_DE : CTA_TEMPLATES_EN;
    for (const t of templates.slice(0, 5)) {
      suggestions.push({ type: "cta", label: t, value: t });
    }
  }

  if (req.context === "layout") {
    suggestions.push({ type: "layout", label: isDE ? "Einzelspalte" : "Single column", value: "single-column", description: isDE ? "Klassisch, einfach, mobilfreundlich" : "Classic, simple, mobile-friendly" });
    suggestions.push({ type: "layout", label: isDE ? "Zweispaltig" : "Two columns", value: "two-column", description: isDE ? "Gut für Vergleiche und Optionen" : "Great for comparisons and options" });
  }

  if (req.context === "component") {
    if (req.componentType === "heading") {
      const templates = isDE ? HEADLINE_TEMPLATES_DE : HEADLINE_TEMPLATES_EN;
      for (const t of templates.slice(0, 4)) {
        suggestions.push({ type: "text", label: t, value: t });
      }
    }
    if (req.componentType === "paragraph") {
      const texts = isDE ? [
        "Beantworte ein paar kurze Fragen – es dauert weniger als 2 Minuten.",
        "Wir benötigen einige Informationen, um dir das beste Angebot zu machen.",
        "Keine Sorge – deine Daten werden vertraulich behandelt.",
        "Fülle das Formular aus und wir melden uns schnellstmöglich bei dir.",
      ] : [
        "Answer a few quick questions – it takes less than 2 minutes.",
        "We need some details to give you the best offer.",
        "Don't worry – your data is treated confidentially.",
        "Fill in the form and we'll get back to you as soon as possible.",
      ];
      for (const t of texts) {
        suggestions.push({ type: "text", label: t.substring(0, 40) + "...", value: t });
      }
    }
  }

  if (req.context === "step") {
    if (req.step) {
      const componentCount = req.step.components.length;
      if (componentCount === 0) {
        suggestions.push({ type: "tip", label: isDE ? "Elemente hinzufügen" : "Add elements", value: "", description: isDE ? "Beginne mit einer Überschrift und einem Eingabefeld." : "Start with a heading and an input field." });
      }
      if (componentCount > 8) {
        suggestions.push({ type: "tip", label: isDE ? "Schritt aufteilen" : "Split step", value: "", description: isDE ? `${componentCount} Elemente sind zu viele. Teile den Schritt in 2 auf.` : `${componentCount} elements is too many. Split into 2 steps.` });
      }
      const hasHeading = req.step.components.some((c) => c.componentType === "heading");
      if (!hasHeading) {
        suggestions.push({ type: "structure", label: isDE ? "Überschrift fehlt" : "Missing heading", value: "", description: isDE ? "Jeder Schritt sollte mit einer Überschrift beginnen." : "Every step should start with a heading." });
      }
    }
  }

  return suggestions;
}

// ─── AI-enhanced suggestions ─────────────────────────────────────────────────

async function getSuggestionsWithAI(req: SuggestRequest): Promise<Suggestion[] | null> {
  try {
    const contextDesc = req.context === "headline" ? "Überschriften-Vorschläge"
      : req.context === "cta" ? "Call-to-Action Button-Texte"
      : req.context === "component" ? `Inhaltsvorschläge für "${req.componentType}"`
      : req.context === "step" ? "Optimierungshinweise für den Schritt"
      : "Layoutvorschläge";

    const prompt = `Du bist ein Conversion-Optimierungsexperte für Online-Formulare.
Aufgabe: Gib ${contextDesc} für folgenden Kontext:
- Flow-Ziel: ${req.flowGoal ?? "Lead generieren"}
- Branche: ${req.industry ?? "Allgemein"}
- Tonalität: ${req.tone ?? "Professionell"}
- Sprache: ${req.language === "en" ? "Englisch" : "Deutsch"}
${req.currentText ? `- Aktueller Text: "${req.currentText}"` : ""}

Antworte NUR mit einem JSON-Array von maximal 5 Vorschlägen:
[{"type": "text"|"tip"|"structure"|"layout", "label": "Kurzbezeichnung (max 40 Zeichen)", "value": "Der konkrete Wert/Text", "description": "Optionale Erklärung"}]

JSON:`;

    const text = await callClaudeCli(prompt);

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]) as Suggestion[];
  } catch (err) {
    console.error("[AI suggest] Failed:", err);
    return null;
  }
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const body: SuggestRequest = await request.json();

    if (!body.context) {
      return NextResponse.json({ error: "context is required" }, { status: 400 });
    }

    // Try AI first, fall back to rule-based
    let suggestions = await getSuggestionsWithAI(body);
    if (!suggestions || suggestions.length === 0) {
      suggestions = getRuleBasedSuggestions(body);
    }

    return NextResponse.json({ suggestions, aiUsed: true });
  } catch (error) {
    console.error("[POST /api/ai/suggest]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
