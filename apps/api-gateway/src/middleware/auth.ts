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
  // Produktion: Gegen registrierte API-Keys pruefen
  //
  // OPENSOFTWARE_API_KEY is the canonical per-bubble shared secret set by
  // scripts/register-<bubble>-opensoftware-clients.cjs on both the gateway
  // (consumer) and the bubble's admin panel (caller). ETD_API_KEY /
  // THREEDREAMZ_API_KEY are legacy per-caller aliases kept for backwards
  // compatibility with older admin builds.
  const knownKeys: Record<string, string> = {
    [process.env.OPENSOFTWARE_API_KEY ?? ""]: "bubble",
    [process.env.ETD_API_KEY ?? ""]: "etd",
    [process.env.THREEDREAMZ_API_KEY ?? ""]: "3dreamz",
  };
  // Drop the empty-string key that appears when an env var is unset, so an
  // unconfigured env var cannot accidentally authenticate empty input.
  delete knownKeys[""];

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
