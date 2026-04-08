export interface ContactData {
  email: string;
  firstName?: string;
  lastName?: string;
  customFields: Record<string, unknown>;
}

/**
 * Renders a template string by substituting {{variable}} placeholders
 * with contact data values.
 */
export function renderTemplate(template: string, data: ContactData): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, key: string) => {
    if (key === "email") return data.email;
    if (key === "firstName") return data.firstName ?? "";
    if (key === "lastName") return data.lastName ?? "";

    // Support customFields.xxx or direct custom field lookup
    if (key.startsWith("customFields.")) {
      const fieldName = key.slice("customFields.".length);
      return String(data.customFields[fieldName] ?? "");
    }

    // Fallback: check customFields directly
    if (key in data.customFields) {
      return String(data.customFields[key] ?? "");
    }

    return "";
  });
}
