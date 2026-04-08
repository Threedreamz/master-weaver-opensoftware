/**
 * PII Privacy Filter Middleware
 *
 * Filters personally identifiable information from API responses
 * based on the requested privacy level.
 *
 * Datenschutz-Filter: Entfernt personenbezogene Daten aus API-Antworten
 * je nach angeforderter Datenschutzstufe.
 */

export type PrivacyLevel = "full" | "pseudonymized" | "anonymous";

/** Fields considered PII — Felder mit personenbezogenen Daten */
const PII_FIELDS = new Set([
  "email",
  "phone",
  "address",
  "street",
  "city",
  "zip",
  "postalCode",
  "firstName",
  "lastName",
  "fullName",
  "dateOfBirth",
  "birthDate",
  "ssn",
  "taxId",
  "iban",
  "bankAccount",
  "ipAddress",
  "ip",
]);

/** Fields that get pseudonymized rather than removed */
const PSEUDONYMIZE_FIELDS = new Set(["name", "firstName", "lastName", "fullName"]);

/** Fields kept even in anonymous mode — IDs and numeric values */
const ANONYMOUS_KEEP = new Set(["id", "count", "total", "amount", "quantity", "price", "status", "type", "createdAt", "updatedAt"]);

/**
 * Strip PII from data based on privacy level.
 *
 * - full: no filtering, return data as-is
 * - pseudonymized: replace names with initials, remove contact info
 * - anonymous: keep only IDs and numeric fields
 */
export function stripPII(data: unknown, level: PrivacyLevel): unknown {
  if (level === "full") return data;

  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => stripPII(item, level));
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (level === "anonymous") {
      // Anonymer Modus: Nur IDs und Zahlenwerte behalten
      if (ANONYMOUS_KEEP.has(key) || key.endsWith("Id") || key.endsWith("_id")) {
        result[key] = typeof value === "object" ? stripPII(value, level) : value;
      }
      continue;
    }

    // Pseudonymized mode
    if (PSEUDONYMIZE_FIELDS.has(key) && typeof value === "string") {
      result[key] = pseudonymizeName(value);
    } else if (PII_FIELDS.has(key)) {
      // PII-Felder entfernen (nicht ins Ergebnis uebernehmen)
      continue;
    } else if (typeof value === "object") {
      result[key] = stripPII(value, level);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Pseudonymize a name: "Max Mustermann" -> "Max M."
 * Name pseudonymisieren: Nur Vorname + Initiale des Nachnamens
 */
function pseudonymizeName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[parts.length - 1]![0]}.`;
  }
  return `${name[0]}.`;
}

/**
 * Extract privacy level from request headers or query params.
 * Default: pseudonymized (sicherer Standard)
 */
export function getPrivacyLevel(request: Request): PrivacyLevel {
  const headerLevel = request.headers.get("x-privacy-level");
  if (headerLevel && isValidLevel(headerLevel)) return headerLevel;

  const url = new URL(request.url);
  const queryLevel = url.searchParams.get("privacy");
  if (queryLevel && isValidLevel(queryLevel)) return queryLevel;

  // Default to pseudonymized for safety
  return "pseudonymized";
}

function isValidLevel(level: string): level is PrivacyLevel {
  return level === "full" || level === "pseudonymized" || level === "anonymous";
}
