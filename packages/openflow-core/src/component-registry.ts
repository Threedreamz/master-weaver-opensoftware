import type { ComponentDefinition, ComponentCategory } from "./types";

const registry = new Map<string, ComponentDefinition>();

export function registerComponent<TConfig = Record<string, unknown>>(
  definition: ComponentDefinition<TConfig>
): void {
  registry.set(definition.type, definition as ComponentDefinition);
}

export function getComponent(type: string): ComponentDefinition | undefined {
  return registry.get(type);
}

export function getAllComponents(): ComponentDefinition[] {
  return Array.from(registry.values());
}

export function getComponentsByCategory(category: ComponentCategory): ComponentDefinition[] {
  return getAllComponents().filter(c => c.category === category);
}

export function getComponentCategories(): { category: ComponentCategory; label: string; components: ComponentDefinition[] }[] {
  const categories: { category: ComponentCategory; label: string }[] = [
    { category: "input", label: "Input Fields" },
    { category: "choice", label: "Choice & Selection" },
    { category: "advanced", label: "Advanced" },
    { category: "display", label: "Display" },
    { category: "layout", label: "Layout" },
  ];

  return categories.map(cat => ({
    ...cat,
    components: getComponentsByCategory(cat.category),
  }));
}

export function isComponentRegistered(type: string): boolean {
  return registry.has(type);
}

/**
 * Default component definitions (headless — no React components, just metadata).
 * React-specific EditorPreview/Renderer/ConfigPanel are registered separately in the app.
 */
export const COMPONENT_DEFINITIONS = {
  // Input
  "text-input": { type: "text-input", category: "input" as const, icon: "Type", label: "Text Input", description: "Single-line text field", defaultConfig: { placeholder: "", maxLength: 500, inputType: "text" }, configSchema: [{ key: "placeholder", label: "Placeholder", type: "text" as const }, { key: "maxLength", label: "Max Length", type: "number" as const, defaultValue: 500 }, { key: "inputType", label: "Input Type", type: "select" as const, options: [{ value: "text", label: "Text" }, { value: "email", label: "Email" }, { value: "phone", label: "Phone" }, { value: "url", label: "URL" }] }] },
  "text-area": { type: "text-area", category: "input" as const, icon: "AlignLeft", label: "Text Area", description: "Multi-line text field", defaultConfig: { placeholder: "", maxLength: 2000, rows: 4 }, configSchema: [{ key: "placeholder", label: "Placeholder", type: "text" as const }, { key: "rows", label: "Rows", type: "number" as const, defaultValue: 4 }, { key: "maxLength", label: "Max Length", type: "number" as const, defaultValue: 2000 }] },
  "email-input": { type: "email-input", category: "input" as const, icon: "Mail", label: "Email", description: "Email address field with validation", defaultConfig: { placeholder: "name@example.com" }, configSchema: [{ key: "placeholder", label: "Placeholder", type: "text" as const }] },
  "phone-input": { type: "phone-input", category: "input" as const, icon: "Phone", label: "Phone", description: "Phone number field", defaultConfig: { placeholder: "+49 ..." }, configSchema: [{ key: "placeholder", label: "Placeholder", type: "text" as const }] },
  "number-input": { type: "number-input", category: "input" as const, icon: "Hash", label: "Number", description: "Numeric input field", defaultConfig: { placeholder: "", min: undefined, max: undefined, step: 1 }, configSchema: [{ key: "placeholder", label: "Placeholder", type: "text" as const }, { key: "min", label: "Min", type: "number" as const }, { key: "max", label: "Max", type: "number" as const }, { key: "step", label: "Step", type: "number" as const, defaultValue: 1 }] },
  "date-picker": { type: "date-picker", category: "input" as const, icon: "Calendar", label: "Date Picker", description: "Date selection field", defaultConfig: { format: "DD.MM.YYYY", includeTime: false }, configSchema: [{ key: "format", label: "Format", type: "select" as const, options: [{ value: "DD.MM.YYYY", label: "DD.MM.YYYY" }, { value: "MM/DD/YYYY", label: "MM/DD/YYYY" }, { value: "YYYY-MM-DD", label: "YYYY-MM-DD" }] }, { key: "includeTime", label: "Include Time", type: "boolean" as const }] },
  "file-upload": { type: "file-upload", category: "input" as const, icon: "Upload", label: "File Upload", description: "File attachment field", defaultConfig: { acceptedTypes: ["image/*", "application/pdf"], maxFileSizeMb: 10, maxFiles: 3, description: "" }, configSchema: [{ key: "maxFileSizeMb", label: "Max File Size (MB)", type: "number" as const, defaultValue: 10 }, { key: "maxFiles", label: "Max Files", type: "number" as const, defaultValue: 3 }, { key: "description", label: "Help Text", type: "text" as const }] },
  "signature-pad": { type: "signature-pad", category: "input" as const, icon: "PenTool", label: "Signature", description: "Digital signature pad", defaultConfig: { width: 400, height: 200, penColor: "#000000", backgroundColor: "#ffffff" }, configSchema: [{ key: "penColor", label: "Pen Color", type: "color" as const }, { key: "backgroundColor", label: "Background", type: "color" as const }] },

  // Choice
  "card-selector": { type: "card-selector", category: "choice" as const, icon: "LayoutGrid", label: "Card Selector", description: "Visual card-based choice", defaultConfig: { selectionMode: "single", columns: 3, cards: [{ key: "option1", title: "Option 1", subtitle: "" }, { key: "option2", title: "Option 2", subtitle: "" }, { key: "option3", title: "Option 3", subtitle: "" }], style: "bordered" }, configSchema: [{ key: "selectionMode", label: "Selection Mode", type: "select" as const, options: [{ value: "single", label: "Single" }, { value: "multiple", label: "Multiple" }] }, { key: "columns", label: "Spalten (0 = automatisch)", type: "number" as const, defaultValue: 3 }, { key: "style", label: "Style", type: "select" as const, options: [{ value: "bordered", label: "Bordered" }, { value: "filled", label: "Filled" }, { value: "minimal", label: "Minimal" }] }] },
  "radio-group": { type: "radio-group", category: "choice" as const, icon: "CircleDot", label: "Radio Group", description: "Single-choice radio buttons", defaultConfig: { layout: "vertical", options: [{ value: "option1", label: "Option 1" }, { value: "option2", label: "Option 2" }] }, configSchema: [{ key: "layout", label: "Layout", type: "select" as const, options: [{ value: "vertical", label: "Vertical" }, { value: "horizontal", label: "Horizontal" }, { value: "grid", label: "Grid" }] }] },
  "checkbox-group": { type: "checkbox-group", category: "choice" as const, icon: "CheckSquare", label: "Checkbox Group", description: "Multi-choice checkboxes", defaultConfig: { layout: "vertical", options: [{ value: "option1", label: "Option 1" }, { value: "option2", label: "Option 2" }] }, configSchema: [{ key: "layout", label: "Layout", type: "select" as const, options: [{ value: "vertical", label: "Vertical" }, { value: "horizontal", label: "Horizontal" }, { value: "grid", label: "Grid" }] }] },
  "dropdown": { type: "dropdown", category: "choice" as const, icon: "ChevronDown", label: "Dropdown", description: "Dropdown select field", defaultConfig: { placeholder: "Select...", options: [{ value: "option1", label: "Option 1" }, { value: "option2", label: "Option 2" }], searchable: false }, configSchema: [{ key: "placeholder", label: "Placeholder", type: "text" as const }, { key: "searchable", label: "Searchable", type: "boolean" as const }] },
  "image-choice": { type: "image-choice", category: "choice" as const, icon: "Image", label: "Image Choice", description: "Image-based selection", defaultConfig: { selectionMode: "single", columns: 2, options: [{ value: "option1", label: "Option A" }, { value: "option2", label: "Option B" }] }, configSchema: [{ key: "selectionMode", label: "Selection Mode", type: "select" as const, options: [{ value: "single", label: "Single" }, { value: "multiple", label: "Multiple" }] }, { key: "columns", label: "Columns", type: "select" as const, options: [{ value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }] }] },
  "pricing-card": { type: "pricing-card", category: "choice" as const, icon: "CreditCard", label: "Pricing Card", description: "Package/pricing selector", defaultConfig: { columns: 2, cards: [], style: "bordered" }, configSchema: [{ key: "columns", label: "Columns", type: "select" as const, options: [{ value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }] }, { key: "style", label: "Style", type: "select" as const, options: [{ value: "bordered", label: "Bordered" }, { value: "filled", label: "Filled" }] }] },
  "rating": { type: "rating", category: "choice" as const, icon: "Star", label: "Rating", description: "Star/heart rating", defaultConfig: { maxRating: 5, icon: "star", allowHalf: false }, configSchema: [{ key: "maxRating", label: "Max Rating", type: "number" as const, defaultValue: 5 }, { key: "icon", label: "Icon", type: "select" as const, options: [{ value: "star", label: "Star" }, { value: "heart", label: "Heart" }, { value: "thumbsUp", label: "Thumbs Up" }] }, { key: "allowHalf", label: "Allow Half", type: "boolean" as const }] },

  // Advanced
  "slider": { type: "slider", category: "advanced" as const, icon: "SlidersHorizontal", label: "Slider", description: "Range slider input", defaultConfig: { min: 0, max: 100, step: 1, unit: "", showValue: true, trackColor: "", progressColor: "", thumbColor: "" }, configSchema: [{ key: "min", label: "Min", type: "number" as const, defaultValue: 0 }, { key: "max", label: "Max", type: "number" as const, defaultValue: 100 }, { key: "step", label: "Step", type: "number" as const, defaultValue: 1 }, { key: "unit", label: "Unit", type: "text" as const }, { key: "showValue", label: "Show Value", type: "boolean" as const }, { key: "progressColor", label: "Fortschrittsfarbe", type: "color" as const }, { key: "trackColor", label: "Track-Farbe", type: "color" as const }, { key: "thumbColor", label: "Regler-Farbe", type: "color" as const }] },
  "location-picker": { type: "location-picker", category: "advanced" as const, icon: "MapPin", label: "Location", description: "Address/location picker", defaultConfig: { placeholder: "Enter address..." }, configSchema: [{ key: "placeholder", label: "Placeholder", type: "text" as const }] },
  "payment-field": { type: "payment-field", category: "advanced" as const, icon: "Wallet", label: "Payment", description: "Payment amount selector", defaultConfig: { currency: "EUR", amounts: [500, 1000, 2500, 5000], allowCustomAmount: true, minAmount: 100, maxAmount: 100000 }, configSchema: [{ key: "currency", label: "Currency", type: "select" as const, options: [{ value: "EUR", label: "EUR" }, { value: "USD", label: "USD" }, { value: "GBP", label: "GBP" }] }, { key: "allowCustomAmount", label: "Custom Amount", type: "boolean" as const }] },
  "hidden-field": { type: "hidden-field", category: "advanced" as const, icon: "EyeOff", label: "Hidden Field", description: "Hidden data capture", defaultConfig: { defaultValue: "", source: "static" }, configSchema: [{ key: "source", label: "Source", type: "select" as const, options: [{ value: "static", label: "Static Value" }, { value: "url_param", label: "URL Parameter" }, { value: "referrer", label: "Referrer" }, { value: "user_agent", label: "User Agent" }] }, { key: "defaultValue", label: "Default Value", type: "text" as const }, { key: "paramName", label: "Parameter Name", type: "text" as const, condition: { field: "source", value: "url_param" } }] },

  // Button / CTA
  "button": { type: "button", category: "advanced" as const, icon: "MousePointer", label: "Button", description: "Klickbarer Button mit Aktion", defaultConfig: { text: "Weiter", variant: "primary", action: "next", targetStepId: "", externalUrl: "", fullWidth: true, iconLeft: "", iconRight: "ArrowRight", buttonColor: "", buttonTextColor: "", borderColor: "", borderRadius: "", size: "medium" }, configSchema: [{ key: "text", label: "Button-Text", type: "text" as const }, { key: "variant", label: "Variante", type: "select" as const, options: [{ value: "primary", label: "Primär" }, { value: "secondary", label: "Sekundär" }, { value: "outline", label: "Outline" }, { value: "ghost", label: "Ghost" }] }, { key: "action", label: "Aktion", type: "select" as const, options: [{ value: "next", label: "Nächste Seite" }, { value: "previous", label: "Vorherige Seite" }, { value: "submit", label: "Absenden" }, { value: "jump", label: "Zu Seite springen" }, { value: "url", label: "Externer Link" }] }, { key: "targetStepId", label: "Zielseite", type: "text" as const, condition: { field: "action", value: "jump" } }, { key: "externalUrl", label: "URL", type: "text" as const, condition: { field: "action", value: "url" } }, { key: "fullWidth", label: "Volle Breite", type: "boolean" as const }, { key: "size", label: "Größe", type: "select" as const, options: [{ value: "small", label: "Klein" }, { value: "medium", label: "Mittel" }, { value: "large", label: "Groß" }] }, { key: "buttonColor", label: "Button-Farbe", type: "color" as const }, { key: "buttonTextColor", label: "Textfarbe", type: "color" as const }, { key: "borderColor", label: "Rahmenfarbe", type: "color" as const }, { key: "borderRadius", label: "Rundung", type: "select" as const, options: [{ value: "", label: "Standard (Theme)" }, { value: "0", label: "Eckig" }, { value: "0.25rem", label: "Leicht" }, { value: "0.5rem", label: "Normal" }, { value: "0.75rem", label: "Rund" }, { value: "9999px", label: "Pill" }] }] },

  // Display
  "heading": { type: "heading", category: "display" as const, icon: "Heading", label: "Heading", description: "Section heading", defaultConfig: { level: 2, text: "Heading", alignment: "left" }, configSchema: [{ key: "text", label: "Text", type: "text" as const }, { key: "level", label: "Level", type: "select" as const, options: [{ value: "1", label: "H1" }, { value: "2", label: "H2" }, { value: "3", label: "H3" }, { value: "4", label: "H4" }] }, { key: "alignment", label: "Alignment", type: "select" as const, options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }] }] },
  "paragraph": { type: "paragraph", category: "display" as const, icon: "Text", label: "Paragraph", description: "Text content block", defaultConfig: { text: "", alignment: "left" }, configSchema: [{ key: "text", label: "Text", type: "textarea" as const }, { key: "alignment", label: "Alignment", type: "select" as const, options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }] }] },
  "divider": { type: "divider", category: "display" as const, icon: "Minus", label: "Divider", description: "Visual separator", defaultConfig: {}, configSchema: [] },
  "image-block": { type: "image-block", category: "display" as const, icon: "ImageIcon", label: "Image", description: "Display image", defaultConfig: { src: "", alt: "", alignment: "center" }, configSchema: [{ key: "src", label: "Image URL", type: "text" as const }, { key: "alt", label: "Alt Text", type: "text" as const }, { key: "alignment", label: "Alignment", type: "select" as const, options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }] }] },

  // Layout
  "two-column": { type: "two-column", category: "layout" as const, icon: "Columns", label: "Two Column", description: "Two column layout", defaultConfig: { leftWidth: "1/2" }, configSchema: [{ key: "leftWidth", label: "Left Width", type: "select" as const, options: [{ value: "1/3", label: "1/3 + 2/3" }, { value: "1/2", label: "1/2 + 1/2" }, { value: "2/3", label: "2/3 + 1/3" }] }] },
  "accordion-group": { type: "accordion-group", category: "layout" as const, icon: "ChevronsUpDown", label: "Accordion", description: "Collapsible sections", defaultConfig: { items: [{ title: "Section 1", defaultOpen: true }] }, configSchema: [] },
  "step-summary": { type: "step-summary", category: "layout" as const, icon: "ClipboardList", label: "Summary", description: "Review all answers", defaultConfig: { showFieldLabels: true, groupByStep: true, editableFromSummary: false }, configSchema: [{ key: "showFieldLabels", label: "Show Labels", type: "boolean" as const }, { key: "groupByStep", label: "Group by Step", type: "boolean" as const }, { key: "editableFromSummary", label: "Editable", type: "boolean" as const }] },

  // 3D
  "stl-viewer": {
    type: "stl-viewer",
    category: "display" as const,
    icon: "Box",
    label: "3D Viewer",
    description: "Interaktiver 3D-Modell Viewer für STL-Dateien",
    defaultConfig: { fileUrl: "", backgroundColor: "#f1f5f9", modelColor: "#6366f1", autoRotate: false, showGrid: true, caption: "", height: 400 },
    configSchema: [
      { key: "fileUrl", label: "STL-Datei", type: "file" as const, accept: ".stl", description: "STL-Datei hochladen oder URL eingeben" },
      { key: "caption", label: "Beschriftung", type: "text" as const },
      { key: "height", label: "Höhe (px)", type: "number" as const, defaultValue: 400 },
      { key: "backgroundColor", label: "Hintergrundfarbe", type: "color" as const },
      { key: "modelColor", label: "Modellfarbe", type: "color" as const },
      { key: "autoRotate", label: "Auto-Rotation", type: "boolean" as const },
      { key: "showGrid", label: "Gitter anzeigen", type: "boolean" as const },
    ],
  },
} as const;

/**
 * Register all default components.
 * Call this once at app initialization.
 */
export function registerAllDefaults(): void {
  for (const def of Object.values(COMPONENT_DEFINITIONS)) {
    registerComponent({
      ...def,
      validate: createDefaultValidator(def.type),
    });
  }
}

function createDefaultValidator(type: string) {
  return (value: unknown, _config: Record<string, unknown>, required: boolean): string | null => {
    if (required && (value === undefined || value === null || value === "")) {
      return "This field is required.";
    }

    switch (type) {
      case "email-input":
        if (value && typeof value === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return "Please enter a valid email address.";
        }
        break;
      case "phone-input":
        if (value && typeof value === "string" && value.length < 6) {
          return "Please enter a valid phone number.";
        }
        break;
      case "number-input": {
        const config = _config as { min?: number; max?: number };
        if (value !== undefined && value !== null && value !== "") {
          const num = Number(value);
          if (isNaN(num)) return "Please enter a valid number.";
          if (config.min !== undefined && num < config.min) return `Minimum value is ${config.min}.`;
          if (config.max !== undefined && num > config.max) return `Maximum value is ${config.max}.`;
        }
        break;
      }
      case "file-upload": {
        // File validation happens at upload time, not here
        break;
      }
    }
    return null;
  };
}
