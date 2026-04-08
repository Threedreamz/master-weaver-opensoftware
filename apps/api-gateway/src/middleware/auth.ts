/**
 * API Key Authentication Middleware
 *
 * Validates incoming requests via the x-api-key header.
 * - Dev mode: accepts any key starting with "dev-"
 * - Production: validates against DB (TODO)
 *
 * API-Key-Authentifizierung fuer externe Apps (z.B. Ersatzteildrucken.de)
 */

export interface AuthResult {
  valid: boolean;
  appId?: string;
  error?: string;
}

export async function validateApiKey(request: Request): Promise<AuthResult> {
  const apiKey = request.headers.get("x-api-key");

  if (!apiKey) {
    return { valid: false, error: "Missing x-api-key header" };
  }

  if (apiKey.length < 8) {
    return { valid: false, error: "Invalid API key format" };
  }

  // Dev mode: accept any key starting with "dev-"
  // Entwicklungsmodus: Jeder Key mit "dev-" Prefix wird akzeptiert
  if (process.env.NODE_ENV === "development" && apiKey.startsWith("dev-")) {
    return { valid: true, appId: "dev" };
  }

  // Production: validate against registered API keys
  // TODO: Validate against database or key store
  // Produktion: Gegen registrierte API-Keys pruefen
  const knownKeys: Record<string, string> = {
    // Placeholder — in production these come from DB/env
    [process.env.ETD_API_KEY ?? ""]: "etd",
    [process.env.THREEDREAMZ_API_KEY ?? ""]: "3dreamz",
  };

  const appId = knownKeys[apiKey];
  if (appId) {
    return { valid: true, appId };
  }

  return { valid: false, error: "Invalid API key" };
}

/**
 * Helper to create a 401 JSON response
 * Hilfsfunktion fuer 401-Fehlerantwort
 */
export function unauthorizedResponse(error: string = "Unauthorized") {
  return new Response(JSON.stringify({ error }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
