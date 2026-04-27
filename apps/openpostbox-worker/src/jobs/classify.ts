/**
 * Classify job — reads the OCR text of a scanned_mail row and assigns one
 * of: rechnung | vertrag | behoerde | werbung | unknown. Writes the result
 * back via PATCH /api/scans/:id and emits a "classified" event.
 *
 * MVP stub: heuristic keyword match. Replace with an LLM prompt (or a
 * fine-tuned small classifier) for production accuracy.
 */

export interface ClassifyJobData {
  tenantId: string;
  mailId: string;
  ocrText: string;
}

export type Classification =
  | "rechnung"
  | "vertrag"
  | "behoerde"
  | "werbung"
  | "unknown";

export interface ClassifyJobResult {
  mailId: string;
  classification: Classification;
  confidence: number;
}

const HEURISTICS: Array<{ label: Classification; patterns: RegExp[] }> = [
  { label: "rechnung", patterns: [/rechnung/i, /invoice/i, /umsatzsteuer/i, /zahlbar/i] },
  { label: "vertrag", patterns: [/vertrag/i, /kündigung/i, /agb/i, /laufzeit/i] },
  { label: "behoerde", patterns: [/finanzamt/i, /amtsgericht/i, /bescheid/i, /krankenkasse/i] },
  { label: "werbung", patterns: [/werbung/i, /angebot/i, /rabatt/i, /gratis/i] },
];

export async function processClassify(data: ClassifyJobData): Promise<ClassifyJobResult> {
  for (const rule of HEURISTICS) {
    const matches = rule.patterns.reduce((n, rx) => n + (rx.test(data.ocrText) ? 1 : 0), 0);
    if (matches > 0) {
      return {
        mailId: data.mailId,
        classification: rule.label,
        confidence: Math.min(1, matches / rule.patterns.length),
      };
    }
  }
  return { mailId: data.mailId, classification: "unknown", confidence: 0 };
}
