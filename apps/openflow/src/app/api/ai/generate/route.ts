import { NextRequest, NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/api-auth";
import { createAIJob, completeAIJob, failAIJob } from "@/db/queries/collaboration";
import { createFlow } from "@/db/queries/flows";
import { db } from "@/db/index";
import { flowSteps, stepComponents, flowEdges } from "@/db/schema";

interface GenerateBriefing {
  goal: string;
  audience?: string;
  conversionGoal?: string;
  desiredSteps?: string[];
  style?: string;
  industry?: string;
  fields?: string[];
  tone?: string;
  language?: "de" | "en";
}

interface GeneratedStep {
  label: string;
  type: "start" | "step" | "end";
  components: GeneratedComponent[];
}

interface GeneratedComponent {
  componentType: string;
  fieldKey: string;
  label: string;
  required: boolean;
  config: Record<string, unknown>;
}

// ─── Structured flow generation (no AI key required) ─────────────────────────

function generateFlowFromBriefing(briefing: GenerateBriefing): GeneratedStep[] {
  const lang = briefing.language ?? "de";
  const isDE = lang === "de";
  const industry = briefing.industry?.toLowerCase() ?? "";
  const tone = briefing.tone?.toLowerCase() ?? "professional";

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
      steps.push({
        label: stepDesc,
        type: "step",
        components: [
          { componentType: "heading", fieldKey: `${steps.length}_heading`, label: "Abschnittstitel", required: false, config: { text: stepDesc, level: "h2" } },
          { componentType: "text-input", fieldKey: `${steps.length}_input`, label: stepDesc, required: true, config: { placeholder: isDE ? "Deine Antwort..." : "Your answer..." } },
        ],
      });
    }
  } else {
    // Generate steps based on fields and industry
    const requestedFields = briefing.fields ?? [];

    // Basic contact step
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

    // Industry-specific step
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
      // Generic qualification step
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

  // ── Thank-you / End step ──────────────────────────────────────────────────
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

// ─── AI-enhanced generation (if Anthropic key present) ───────────────────────

async function generateWithAI(briefing: GenerateBriefing): Promise<GeneratedStep[] | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });

    const prompt = `Du bist ein Experte für Conversion-optimierte Online-Formulare und Flow-Builder.

Erstelle einen strukturierten Multi-Step-Flow basierend auf folgendem Briefing:
- Ziel: ${briefing.goal}
- Zielgruppe: ${briefing.audience ?? "Allgemein"}
- Conversion-Ziel: ${briefing.conversionGoal ?? "Lead generieren"}
- Branche: ${briefing.industry ?? "Allgemein"}
- Gewünschte Schritte: ${briefing.desiredSteps?.join(", ") ?? "Automatisch bestimmen"}
- Felder: ${briefing.fields?.join(", ") ?? "Kontakt + Qualifizierung"}
- Tonalität: ${briefing.tone ?? "Professionell"}
- Sprache: ${briefing.language === "en" ? "Englisch" : "Deutsch"}

Antworte NUR mit einem gültigen JSON-Array von Schritten. Jeder Schritt hat:
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
- Maximal 6 Schritte
- Pro Schritt maximal 5 Elemente
- Heading als erstes Element jedes Schritts
- fieldKey muss eindeutig sein (snake_case)
- Nur die genannten componentTypes verwenden

JSON (nur das Array, kein Text davor/danach):`;

    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") return null;

    const text = content.text.trim();
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

    if (!briefing.goal) {
      return NextResponse.json({ error: "briefing.goal is required" }, { status: 400 });
    }

    const job = await createAIJob({ type: "generate_flow", input: JSON.stringify(briefing) });

    // Try AI first, fall back to rule-based generation
    let generatedSteps = await generateWithAI(briefing);
    if (!generatedSteps) {
      generatedSteps = generateFlowFromBriefing(briefing);
    }

    // Create the actual flow in the database
    const slug = `ai-flow-${Date.now()}`;
    const flowName = briefing.goal.substring(0, 60);

    const flow = await createFlow({ name: flowName, slug, description: `AI-generiert: ${briefing.goal}` });

    // Insert steps and components
    let sortOrder = 0;
    const stepIds: string[] = [];
    for (const stepDef of generatedSteps) {
      const [step] = await db.insert(flowSteps).values({
        flowId: flow.id,
        type: stepDef.type,
        label: stepDef.label,
        sortOrder: sortOrder++,
        positionX: 0,
        positionY: sortOrder * 150,
      }).returning();

      stepIds.push(step.id);

      for (let ci = 0; ci < stepDef.components.length; ci++) {
        const compDef = stepDef.components[ci];
        await db.insert(stepComponents).values({
          stepId: step.id,
          componentType: compDef.componentType,
          fieldKey: compDef.fieldKey,
          label: compDef.label,
          required: compDef.required,
          config: JSON.stringify(compDef.config),
          sortOrder: ci,
        });
      }
    }

    // Create linear edges (each step → next step with "always" condition)
    for (let i = 0; i < stepIds.length - 1; i++) {
      await db.insert(flowEdges).values({
        flowId: flow.id,
        sourceStepId: stepIds[i],
        targetStepId: stepIds[i + 1],
        conditionType: "always",
        priority: 0,
      });
    }

    await completeAIJob(job.id, JSON.stringify({ flowId: flow.id, steps: generatedSteps.length }));

    return NextResponse.json({
      flowId: flow.id,
      flowName: flow.name,
      slug: flow.slug,
      steps: generatedSteps.length,
      aiUsed: !!process.env.ANTHROPIC_API_KEY,
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/ai/generate]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
