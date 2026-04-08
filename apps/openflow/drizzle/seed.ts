import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../src/db/schema";

const dbPath = process.env.DATABASE_URL || "./data/openflow.db";
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

async function seed() {
  console.log("Seeding OpenFlow database...");

  // Seed component definitions
  const components = [
    // Input
    { type: "text-input", category: "input" as const, label: "Text Input", icon: "Type", defaultConfig: JSON.stringify({ placeholder: "", maxLength: 500, inputType: "text" }), configSchema: JSON.stringify([{ key: "placeholder", label: "Placeholder", type: "text" }, { key: "maxLength", label: "Max Length", type: "number", defaultValue: 500 }]) },
    { type: "text-area", category: "input" as const, label: "Text Area", icon: "AlignLeft", defaultConfig: JSON.stringify({ placeholder: "", maxLength: 2000, rows: 4 }), configSchema: JSON.stringify([{ key: "placeholder", label: "Placeholder", type: "text" }, { key: "rows", label: "Rows", type: "number", defaultValue: 4 }]) },
    { type: "email-input", category: "input" as const, label: "Email", icon: "Mail", defaultConfig: JSON.stringify({ placeholder: "name@example.com" }), configSchema: JSON.stringify([{ key: "placeholder", label: "Placeholder", type: "text" }]) },
    { type: "phone-input", category: "input" as const, label: "Phone", icon: "Phone", defaultConfig: JSON.stringify({ placeholder: "+49 ..." }), configSchema: JSON.stringify([{ key: "placeholder", label: "Placeholder", type: "text" }]) },
    { type: "number-input", category: "input" as const, label: "Number", icon: "Hash", defaultConfig: JSON.stringify({ placeholder: "", min: null, max: null, step: 1 }), configSchema: JSON.stringify([{ key: "min", label: "Min", type: "number" }, { key: "max", label: "Max", type: "number" }, { key: "step", label: "Step", type: "number", defaultValue: 1 }]) },
    { type: "date-picker", category: "input" as const, label: "Date Picker", icon: "Calendar", defaultConfig: JSON.stringify({ format: "DD.MM.YYYY", includeTime: false }), configSchema: JSON.stringify([{ key: "format", label: "Format", type: "select", options: [{ value: "DD.MM.YYYY", label: "DD.MM.YYYY" }, { value: "MM/DD/YYYY", label: "MM/DD/YYYY" }] }]) },
    { type: "file-upload", category: "input" as const, label: "File Upload", icon: "Upload", defaultConfig: JSON.stringify({ acceptedTypes: ["image/*", "application/pdf"], maxFileSizeMb: 10, maxFiles: 3 }), configSchema: JSON.stringify([{ key: "maxFileSizeMb", label: "Max Size (MB)", type: "number", defaultValue: 10 }, { key: "maxFiles", label: "Max Files", type: "number", defaultValue: 3 }]) },
    { type: "signature-pad", category: "input" as const, label: "Signature", icon: "PenTool", defaultConfig: JSON.stringify({ width: 400, height: 200, penColor: "#000000", backgroundColor: "#ffffff" }), configSchema: JSON.stringify([{ key: "penColor", label: "Pen Color", type: "color" }, { key: "backgroundColor", label: "Background", type: "color" }]) },
    // Choice
    { type: "card-selector", category: "choice" as const, label: "Card Selector", icon: "LayoutGrid", defaultConfig: JSON.stringify({ selectionMode: "single", columns: 3, cards: [{ key: "option1", title: "Option 1" }, { key: "option2", title: "Option 2" }, { key: "option3", title: "Option 3" }], style: "bordered" }), configSchema: JSON.stringify([{ key: "selectionMode", label: "Selection", type: "select", options: [{ value: "single", label: "Single" }, { value: "multiple", label: "Multiple" }] }, { key: "columns", label: "Columns", type: "select", options: [{ value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }] }]) },
    { type: "radio-group", category: "choice" as const, label: "Radio Group", icon: "CircleDot", defaultConfig: JSON.stringify({ layout: "vertical", options: [{ value: "option1", label: "Option 1" }, { value: "option2", label: "Option 2" }] }), configSchema: JSON.stringify([{ key: "layout", label: "Layout", type: "select", options: [{ value: "vertical", label: "Vertical" }, { value: "horizontal", label: "Horizontal" }] }]) },
    { type: "checkbox-group", category: "choice" as const, label: "Checkbox Group", icon: "CheckSquare", defaultConfig: JSON.stringify({ layout: "vertical", options: [{ value: "option1", label: "Option 1" }, { value: "option2", label: "Option 2" }] }), configSchema: JSON.stringify([{ key: "layout", label: "Layout", type: "select", options: [{ value: "vertical", label: "Vertical" }, { value: "horizontal", label: "Horizontal" }] }]) },
    { type: "dropdown", category: "choice" as const, label: "Dropdown", icon: "ChevronDown", defaultConfig: JSON.stringify({ placeholder: "Select...", options: [{ value: "option1", label: "Option 1" }], searchable: false }), configSchema: JSON.stringify([{ key: "placeholder", label: "Placeholder", type: "text" }, { key: "searchable", label: "Searchable", type: "boolean" }]) },
    { type: "image-choice", category: "choice" as const, label: "Image Choice", icon: "Image", defaultConfig: JSON.stringify({ selectionMode: "single", columns: 3, options: [] }), configSchema: JSON.stringify([{ key: "selectionMode", label: "Selection", type: "select", options: [{ value: "single", label: "Single" }, { value: "multiple", label: "Multiple" }] }]) },
    { type: "pricing-card", category: "choice" as const, label: "Pricing Card", icon: "CreditCard", defaultConfig: JSON.stringify({ columns: 2, cards: [], style: "bordered" }), configSchema: JSON.stringify([{ key: "columns", label: "Columns", type: "select", options: [{ value: "2", label: "2" }, { value: "3", label: "3" }] }]) },
    { type: "rating", category: "choice" as const, label: "Rating", icon: "Star", defaultConfig: JSON.stringify({ maxRating: 5, icon: "star", allowHalf: false }), configSchema: JSON.stringify([{ key: "maxRating", label: "Max Rating", type: "number", defaultValue: 5 }, { key: "icon", label: "Icon", type: "select", options: [{ value: "star", label: "Star" }, { value: "heart", label: "Heart" }] }]) },
    // Advanced
    { type: "slider", category: "advanced" as const, label: "Slider", icon: "SlidersHorizontal", defaultConfig: JSON.stringify({ min: 0, max: 100, step: 1, unit: "", showValue: true }), configSchema: JSON.stringify([{ key: "min", label: "Min", type: "number" }, { key: "max", label: "Max", type: "number" }, { key: "step", label: "Step", type: "number" }]) },
    { type: "location-picker", category: "advanced" as const, label: "Location", icon: "MapPin", defaultConfig: JSON.stringify({ placeholder: "Enter address..." }), configSchema: JSON.stringify([{ key: "placeholder", label: "Placeholder", type: "text" }]) },
    { type: "payment-field", category: "advanced" as const, label: "Payment", icon: "Wallet", defaultConfig: JSON.stringify({ currency: "EUR", amounts: [500, 1000, 2500], allowCustomAmount: true }), configSchema: JSON.stringify([{ key: "currency", label: "Currency", type: "select", options: [{ value: "EUR", label: "EUR" }, { value: "USD", label: "USD" }] }]) },
    { type: "hidden-field", category: "advanced" as const, label: "Hidden Field", icon: "EyeOff", defaultConfig: JSON.stringify({ defaultValue: "", source: "static" }), configSchema: JSON.stringify([{ key: "source", label: "Source", type: "select", options: [{ value: "static", label: "Static" }, { value: "url_param", label: "URL Param" }] }]) },
    // Display
    { type: "heading", category: "display" as const, label: "Heading", icon: "Heading", defaultConfig: JSON.stringify({ level: 2, text: "Heading", alignment: "left" }), configSchema: JSON.stringify([{ key: "text", label: "Text", type: "text" }, { key: "level", label: "Level", type: "select", options: [{ value: "1", label: "H1" }, { value: "2", label: "H2" }, { value: "3", label: "H3" }] }]) },
    { type: "paragraph", category: "display" as const, label: "Paragraph", icon: "Text", defaultConfig: JSON.stringify({ text: "", alignment: "left" }), configSchema: JSON.stringify([{ key: "text", label: "Text", type: "textarea" }]) },
    { type: "divider", category: "display" as const, label: "Divider", icon: "Minus", defaultConfig: JSON.stringify({}), configSchema: JSON.stringify([]) },
    { type: "image-block", category: "display" as const, label: "Image", icon: "ImageIcon", defaultConfig: JSON.stringify({ src: "", alt: "", alignment: "center" }), configSchema: JSON.stringify([{ key: "src", label: "Image URL", type: "text" }, { key: "alt", label: "Alt Text", type: "text" }]) },
    // Layout
    { type: "two-column", category: "layout" as const, label: "Two Column", icon: "Columns", defaultConfig: JSON.stringify({ leftWidth: "1/2" }), configSchema: JSON.stringify([{ key: "leftWidth", label: "Left Width", type: "select", options: [{ value: "1/3", label: "1/3 + 2/3" }, { value: "1/2", label: "1/2 + 1/2" }, { value: "2/3", label: "2/3 + 1/3" }] }]) },
    { type: "accordion-group", category: "layout" as const, label: "Accordion", icon: "ChevronsUpDown", defaultConfig: JSON.stringify({ items: [{ title: "Section 1", defaultOpen: true }] }), configSchema: JSON.stringify([]) },
    { type: "step-summary", category: "layout" as const, label: "Summary", icon: "ClipboardList", defaultConfig: JSON.stringify({ showFieldLabels: true, groupByStep: true, editableFromSummary: false }), configSchema: JSON.stringify([{ key: "showFieldLabels", label: "Show Labels", type: "boolean" }, { key: "groupByStep", label: "Group by Step", type: "boolean" }]) },
  ];

  // Insert component definitions (upsert)
  for (const comp of components) {
    await db.insert(schema.componentDefinitions)
      .values(comp)
      .onConflictDoUpdate({
        target: schema.componentDefinitions.type,
        set: {
          category: comp.category,
          label: comp.label,
          icon: comp.icon,
          defaultConfig: comp.defaultConfig,
          configSchema: comp.configSchema,
        },
      });
  }

  // Create a demo flow: "ETD Anfrage" (matching the Ersatzteilformular)
  const flowId = crypto.randomUUID();
  await db.insert(schema.flows).values({
    id: flowId,
    name: "Ersatzteilformular",
    slug: "etd-anfrage",
    description: "Spare parts inquiry form — choose condition, select package, provide contact details",
    status: "draft",
    settings: JSON.stringify({
      theme: {
        primaryColor: "#e8611a",
        backgroundColor: "#0f172a",
        textColor: "#ffffff",
        cardBackgroundColor: "#1e293b",
        borderRadius: "1rem",
        fontFamily: "system-ui",
      },
      showProgressBar: true,
      progressBarStyle: "dots",
      submitButtonText: "Anfrage absenden",
      successMessage: "Vielen Dank! Wir melden uns schnellstmöglich bei Dir.",
    }),
  });

  // Step 1: Start - Choose condition
  const step1Id = crypto.randomUUID();
  await db.insert(schema.flowSteps).values({
    id: step1Id,
    flowId,
    type: "start",
    label: "Zustand wählen",
    positionX: 250,
    positionY: 0,
    config: JSON.stringify({ title: "Ersatzteilformular", subtitle: "Was trifft auf Dein Teil zu?", layout: "single-column", showProgress: true }),
    sortOrder: 0,
  });

  await db.insert(schema.stepComponents).values({
    stepId: step1Id,
    componentType: "card-selector",
    fieldKey: "partCondition",
    label: "Zustand",
    config: JSON.stringify({
      selectionMode: "single",
      columns: 3,
      cards: [
        { key: "intact", title: "Mein Teil ist heile", subtitle: "1:1 Kopie", imageUrl: "/assets/icons/intact.webp" },
        { key: "broken", title: "Mein Teil ist kaputt", subtitle: "Reparaturservice", imageUrl: "/assets/icons/broken.webp" },
        { key: "lost", title: "Mein Teil ist verloren gegangen", subtitle: "Rekonstruktion", imageUrl: "/assets/icons/lost.webp" },
      ],
      style: "bordered",
    }),
    sortOrder: 0,
    required: true,
  });

  // Step 2: Choose package
  const step2Id = crypto.randomUUID();
  await db.insert(schema.flowSteps).values({
    id: step2Id,
    flowId,
    type: "step",
    label: "Paket wählen",
    positionX: 250,
    positionY: 200,
    config: JSON.stringify({ title: "Paket wählen", subtitle: "Wie groß ist Dein Teil?", layout: "single-column", showProgress: true }),
    sortOrder: 1,
  });

  await db.insert(schema.stepComponents).values({
    stepId: step2Id,
    componentType: "pricing-card",
    fieldKey: "packageSize",
    label: "Paket",
    config: JSON.stringify({
      columns: 2,
      cards: [
        { key: "s", label: "S", title: "S Paket", size: "0 – 5 cm", price: "Ab 89 €", features: ["Persönliche Beratung", "3D Scan", "1:1 Kopie (SLS/FDM)", "Versicherter Versand"] },
        { key: "m", label: "M", title: "M Paket", size: "5 – 15 cm", price: "Ab 149 €", features: ["Persönliche Beratung", "3D Scan", "1:1 Kopie (SLS/FDM)", "Versicherter Versand"] },
        { key: "l", label: "L", title: "L Paket", size: "15 – 30 cm", price: "Ab 229 €", features: ["Persönliche Beratung", "3D Scan", "1:1 Kopie (SLS/FDM)", "Versicherter Versand"] },
        { key: "extra", label: "EXTRA", title: "EXTRA Paket", size: "30+ cm", price: "Auf Anfrage", features: ["Persönliche Beratung", "CT-Scan", "1:1 Kopie", "Versicherter Versand"] },
      ],
      style: "bordered",
    }),
    sortOrder: 0,
    required: true,
  });

  // Step 3: End - Contact details
  const step3Id = crypto.randomUUID();
  await db.insert(schema.flowSteps).values({
    id: step3Id,
    flowId,
    type: "end",
    label: "Kontaktdaten",
    positionX: 250,
    positionY: 400,
    config: JSON.stringify({ title: "Deine Kontaktdaten", subtitle: "Wir melden uns schnellstmöglich bei Dir", layout: "two-column", showProgress: true }),
    sortOrder: 2,
  });

  // Contact form components
  await db.insert(schema.stepComponents).values([
    { stepId: step3Id, componentType: "text-input", fieldKey: "name", label: "Dein Name", config: JSON.stringify({ placeholder: "Max Mustermann", inputType: "text" }), sortOrder: 0, required: true },
    { stepId: step3Id, componentType: "email-input", fieldKey: "email", label: "E-Mail", config: JSON.stringify({ placeholder: "max@example.de" }), sortOrder: 1, required: true },
    { stepId: step3Id, componentType: "phone-input", fieldKey: "phone", label: "Telefon (optional)", config: JSON.stringify({ placeholder: "+49 ..." }), sortOrder: 2, required: false },
    { stepId: step3Id, componentType: "text-area", fieldKey: "description", label: "Beschreibe Dein Teil", config: JSON.stringify({ placeholder: "Beschreibe kurz das Teil: Wo war es verbaut? Was ist kaputt? Welches Material vermutlich?", rows: 4 }), sortOrder: 3, required: true },
    { stepId: step3Id, componentType: "step-summary", fieldKey: "_summary", label: "Zusammenfassung", config: JSON.stringify({ showFieldLabels: true, groupByStep: true, editableFromSummary: false }), sortOrder: 4, required: false },
  ]);

  // Edges: step1 → step2 → step3
  await db.insert(schema.flowEdges).values([
    { flowId, sourceStepId: step1Id, targetStepId: step2Id, conditionType: "always", priority: 0 },
    { flowId, sourceStepId: step2Id, targetStepId: step3Id, conditionType: "always", priority: 0 },
  ]);

  console.log("Seed complete! Created:");
  console.log("  - 26 component definitions");
  console.log("  - 1 demo flow: Ersatzteilformular (etd-anfrage)");
  console.log("    - 3 steps: Zustand wählen → Paket wählen → Kontaktdaten");
  console.log("    - 7 form components");
  console.log("    - 2 edges");

  sqlite.close();
}

seed().catch(console.error);
