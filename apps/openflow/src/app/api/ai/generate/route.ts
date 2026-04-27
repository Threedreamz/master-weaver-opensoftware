import { NextRequest, NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/api-auth";
import { callClaudeCli } from "@/lib/claude-cli";
import { createAIJob, completeAIJob } from "@/db/queries/collaboration";
import { createFlow, updateFlow } from "@/db/queries/flows";
import {
  buildFlowInDb,
  buildSettingsFromTheme,
  type GeneratedStep,
  type GeneratedComponent,
} from "@/lib/ai-flow-builder";

export interface GenerateBriefing {
  goal: string;
  audience?: string;
  conversionGoal?: string;
  desiredSteps?: string[];
  style?: string;
  industry?: string;
  fields?: string[];
  tone?: string;
  language?: "de" | "en";
  theme?: {
    primaryColor: string;
    backgroundColor: string;
    textColor: string;
    borderRadius?: string;
  };
}

// ─── Structured flow generation (no AI key required) ─────────────────────────

function generateFlowFromBriefing(briefing: GenerateBriefing): GeneratedStep[] {
  const lang = briefing.language ?? "de";
  const isDE = lang === "de";
  const industry = briefing.industry?.toLowerCase() ?? "";

  const steps: GeneratedStep[] = [];

  // ── Intro/Start step ─────────────────────────────────────────────────────
  const headline = briefing.goal
    ? (isDE ? `Lass uns beginnen` : `Let's get started`)
    : (isDE ? "Willkommen" : "Welcome");

  const subline = isDE
    ? `Beantworte ein paar kurze Fragen – es dauert weniger als 2 Minuten.`
    : `Answer a few quick questions – it takes less than 2 minutes.`;

  steps.push({
    label: isDE ? "Start" : "Start",
    type: "start",
    components: [
      { componentType: "heading", fieldKey: "intro_heading", label: isDE ? "Überschrift" : "Heading", required: false, config: { text: headline, level: "h1" } },
      { componentType: "paragraph", fieldKey: "intro_text", label: isDE ? "Einleitung" : "Intro text", required: false, config: { text: subline } },
    ],
  });

  // ── Middle steps based on desired steps or fields ─────────────────────────
  if (briefing.desiredSteps && briefing.desiredSteps.length > 0) {
    for (const stepDesc of briefing.desiredSteps) {
      const optionsMatch = stepDesc.match(/\(Optionen:\s*(.+)\)$/);
      const options = optionsMatch
        ? optionsMatch[1].split(",").map((o) => o.trim()).filter(Boolean)
        : [];
      const questionText = stepDesc.replace(/\s*\(Optionen:[^)]*\)$/, "").trim();

      const components: GeneratedComponent[] = [
        { componentType: "heading", fieldKey: `${steps.length}_heading`, label: "Überschrift", required: false, config: { text: questionText, level: "h2" } },
      ];

      if (options.length > 0) {
        const compType = options.length <= 4 ? "card-selector" : "radio-group";
        components.push({
          componentType: compType,
          fieldKey: `${steps.length}_choice`,
          label: questionText,
          required: true,
          config: {
            options: options.map((o) => ({
              value: o.toLowerCase().replace(/[^a-z0-9]/gi, "_"),
              label: o,
            })),
            columns: Math.min(options.length, 3),
          },
        });
      } else {
        components.push({
          componentType: "text-input",
          fieldKey: `${steps.length}_input`,
          label: questionText,
          required: true,
          config: { placeholder: isDE ? "Deine Antwort..." : "Your answer..." },
        });
      }

      steps.push({ label: questionText, type: "step", components });
    }
  } else {
    const requestedFields = briefing.fields ?? [];

    const contactComponents: GeneratedComponent[] = [
      { componentType: "heading", fieldKey: "contact_heading", label: "Überschrift", required: false, config: { text: isDE ? "Kontaktdaten" : "Contact Details", level: "h2" } },
    ];

    if (requestedFields.includes("name") || requestedFields.length === 0) {
      contactComponents.push({ componentType: "text-input", fieldKey: "full_name", label: isDE ? "Vollständiger Name" : "Full Name", required: true, config: { placeholder: isDE ? "Max Mustermann" : "John Doe" } });
    }
    if (requestedFields.includes("email") || requestedFields.length === 0) {
      contactComponents.push({ componentType: "email-input", fieldKey: "email", label: "E-Mail", required: true, config: { placeholder: "mail@beispiel.de" } });
    }
    if (requestedFields.includes("phone")) {
      contactComponents.push({ componentType: "phone-input", fieldKey: "phone", label: isDE ? "Telefon" : "Phone", required: false, config: {} });
    }

    steps.push({ label: isDE ? "Kontaktdaten" : "Contact", type: "step", components: contactComponents });

    if (industry.includes("real") || industry.includes("immo")) {
      steps.push({
        label: isDE ? "Immobilie" : "Property",
        type: "step",
        components: [
          { componentType: "heading", fieldKey: "property_heading", label: "Überschrift", required: false, config: { text: isDE ? "Welche Immobilie interessiert Sie?" : "What property are you interested in?", level: "h2" } },
          { componentType: "radio-group", fieldKey: "property_type", label: isDE ? "Immobilientyp" : "Property Type", required: true, config: { options: [{ value: "apartment", label: isDE ? "Wohnung" : "Apartment" }, { value: "house", label: isDE ? "Haus" : "House" }, { value: "commercial", label: isDE ? "Gewerbe" : "Commercial" }] } },
          { componentType: "number-input", fieldKey: "budget", label: isDE ? "Budget (€)" : "Budget (€)", required: false, config: { placeholder: "250000", min: 0 } },
        ],
      });
    } else if (industry.includes("health") || industry.includes("gesund") || industry.includes("med")) {
      steps.push({
        label: isDE ? "Gesundheitsfragen" : "Health Questions",
        type: "step",
        components: [
          { componentType: "heading", fieldKey: "health_heading", label: "Überschrift", required: false, config: { text: isDE ? "Ihre Situation" : "Your Situation", level: "h2" } },
          { componentType: "dropdown", fieldKey: "age_group", label: isDE ? "Altersgruppe" : "Age Group", required: true, config: { options: [{ value: "18-30", label: "18–30" }, { value: "31-50", label: "31–50" }, { value: "51-65", label: "51–65" }, { value: "65+", label: "65+" }] } },
          { componentType: "checkbox-group", fieldKey: "concerns", label: isDE ? "Anliegen (Mehrfachauswahl)" : "Concerns (multiple)", required: false, config: { options: [{ value: "prevention", label: isDE ? "Vorsorge" : "Prevention" }, { value: "treatment", label: isDE ? "Behandlung" : "Treatment" }, { value: "nutrition", label: isDE ? "Ernährung" : "Nutrition" }] } },
        ],
      });
    } else {
      steps.push({
        label: isDE ? "Details" : "Details",
        type: "step",
        components: [
          { componentType: "heading", fieldKey: "details_heading", label: "Überschrift", required: false, config: { text: isDE ? "Ein paar Details" : "A few details", level: "h2" } },
          { componentType: "dropdown", fieldKey: "interest", label: isDE ? "Ihr Interesse" : "Your Interest", required: true, config: { options: [{ value: "info", label: isDE ? "Mehr Informationen" : "More Information" }, { value: "quote", label: isDE ? "Angebot" : "Quote" }, { value: "demo", label: "Demo" }] } },
          { componentType: "text-area", fieldKey: "message", label: isDE ? "Nachricht" : "Message", required: false, config: { placeholder: isDE ? "Ihre Nachricht..." : "Your message...", rows: 3 } },
        ],
      });
    }
  }

  steps.push({
    label: isDE ? "Abschluss" : "Thank You",
    type: "end",
    components: [
      { componentType: "heading", fieldKey: "end_heading", label: "Überschrift", required: false, config: { text: isDE ? "Vielen Dank!" : "Thank you!", level: "h1" } },
      { componentType: "paragraph", fieldKey: "end_text", label: "Abschlusstext", required: false, config: { text: briefing.conversionGoal ?? (isDE ? "Wir melden uns in Kürze bei Ihnen." : "We'll be in touch shortly.") } },
    ],
  });

  return steps;
}

// ─── AI-enhanced generation (if CLI available) ───────────────────────────────

/**
 * Build the prompt. If `plan` is provided, instruct the model to translate the
 * outline 1:1 into JSON steps without inventing or re-ordering pages.
 */
export function buildGeneratePrompt(briefing: GenerateBriefing, plan?: string): string {
  const commonSchema = `Antworte NUR mit einem gültigen JSON-Array von Schritten. Jeder Schritt hat:
{
  "label": "Schrittname",
  "type": "start" | "step" | "end",
  "components": [
    {
      "componentType": "heading" | "paragraph" | "text-input" | "email-input" | "phone-input" | "number-input" | "text-area" | "dropdown" | "radio-group" | "checkbox-group" | "date-picker",
      "fieldKey": "eindeutiger_schluessel",
      "label": "Feldbezeichnung",
      "required": true | false,
      "config": { "text": "...", "placeholder": "...", "options": [{"value": "...", "label": "..."}], ... }
    }
  ]
}

Regeln:
- Erster Schritt immer type "start", letzter immer "end"
- Pro Schritt maximal 5 Elemente
- Heading als erstes Element jedes Schritts
- fieldKey muss eindeutig sein (snake_case)
- Nur die genannten componentTypes verwenden

JSON (nur das Array, kein Text davor/danach):`;

  if (plan) {
    return `Du bist ein Experte für Conversion-optimierte Online-Formulare.
Setze die folgende Outline 1:1 in einen JSON-Flow um. Erfinde KEINE zusätzlichen Seiten, ändere NICHT die Reihenfolge, füge KEINE inhaltlichen Ergänzungen hinzu. Jede Seite der Outline entspricht genau einem Schritt im JSON.

Outline:
${plan}

Briefing (nur als Kontext für Tonalität und Sprache):
- Ziel: ${briefing.goal}
- Zielgruppe: ${briefing.audience ?? "Allgemein"}
- Conversion-Ziel: ${briefing.conversionGoal ?? "Lead generieren"}
- Branche: ${briefing.industry ?? "Allgemein"}
- Tonalität: ${briefing.tone ?? "Professionell"}
- Sprache: ${briefing.language === "en" ? "Englisch" : "Deutsch"}

${commonSchema}`;
  }

  return `Du bist ein Experte für Conversion-optimierte Online-Formulare und Flow-Builder.

Erstelle einen strukturierten Multi-Step-Flow basierend auf folgendem Briefing:
- Ziel: ${briefing.goal}
- Zielgruppe: ${briefing.audience ?? "Allgemein"}
- Conversion-Ziel: ${briefing.conversionGoal ?? "Lead generieren"}
- Branche: ${briefing.industry ?? "Allgemein"}
- Gewünschte Schritte: ${briefing.desiredSteps?.join(", ") ?? "Automatisch bestimmen"}
- Felder: ${briefing.fields?.join(", ") ?? "Kontakt + Qualifizierung"}
- Tonalität: ${briefing.tone ?? "Professionell"}
- Sprache: ${briefing.language === "en" ? "Englisch" : "Deutsch"}

Wichtig: Falls ein gewünschter Schritt Optionen enthält (Format: "Frage (Optionen: A, B, C)"), erstelle dafür eine card-selector-Komponente (bei ≤4 Optionen) oder radio-group-Komponente (bei >4 Optionen) mit diesen exakten Optionen.

Maximal 6 Schritte.

${commonSchema}`;
}

async function generateWithAI(briefing: GenerateBriefing, plan?: string): Promise<GeneratedStep[] | null> {
  try {
    const prompt = buildGeneratePrompt(briefing, plan);
    const text = (await callClaudeCli(prompt)).trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]) as GeneratedStep[];
  } catch (err) {
    console.error("[AI generate] Failed:", err);
    return null;
  }
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const body = await request.json();
    const briefing: GenerateBriefing = body.briefing ?? body;
    const plan: string | undefined = typeof body.plan === "string" && body.plan.trim().length > 0
      ? body.plan
      : undefined;

    if (!briefing.goal) {
      return NextResponse.json({ error: "briefing.goal is required" }, { status: 400 });
    }

    const job = await createAIJob({ type: "generate_flow", input: JSON.stringify({ briefing, plan }) });

    // Try AI first, fall back to rule-based generation
    let generatedSteps = await generateWithAI(briefing, plan);
    let aiUsed = true;
    if (!generatedSteps) {
      generatedSteps = generateFlowFromBriefing(briefing);
      aiUsed = false;
    }

    // Create the actual flow in the database
    const slug = `ai-flow-${Date.now()}`;
    const flowName = briefing.goal.substring(0, 60);

    const flow = await createFlow({
      name: flowName,
      slug,
      description: `AI-generiert: ${briefing.goal}`,
      aiPlan: plan,
      aiBriefing: JSON.stringify(briefing),
    });

    await buildFlowInDb({
      flowId: flow.id,
      generatedSteps,
      clearExisting: false,
    });

    // Apply theme/design settings chosen in the dialog
    if (briefing.theme) {
      await updateFlow(flow.id, {
        settings: buildSettingsFromTheme(briefing.theme),
      });
    }

    await completeAIJob(job.id, JSON.stringify({ flowId: flow.id, steps: generatedSteps.length }));

    return NextResponse.json({
      flowId: flow.id,
      flowName: flow.name,
      slug: flow.slug,
      steps: generatedSteps.length,
      aiUsed,
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/ai/generate]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
