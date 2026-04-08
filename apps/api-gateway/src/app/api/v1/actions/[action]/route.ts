import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/middleware/auth";

/**
 * Action-zu-Service-Zuordnung
 * Maps action names to internal service endpoints
 *
 * Vordefinierte Aktionen fuer externe Apps (z.B. Ersatzteildrucken.de):
 * - print-delivery-note: Lieferschein drucken
 * - generate-invoice: Rechnung erstellen
 * - start-print-job: Druckauftrag starten
 * - send-email: E-Mail senden
 * - export-data: Daten exportieren
 */
const ACTION_MAP: Record<
  string,
  { service: string; port: number; path: string; method: string; description: string }
> = {
  "print-delivery-note": {
    service: "OpenInventory",
    port: 4170,
    path: "/api/delivery-notes/print",
    method: "POST",
    description: "Generate and print a delivery note / Lieferschein generieren",
  },
  "generate-invoice": {
    service: "OpenAccounting",
    port: 4162,
    path: "/api/invoices/generate",
    method: "POST",
    description: "Generate an invoice / Rechnung erstellen",
  },
  "start-print-job": {
    service: "OpenFarm",
    port: 4174,
    path: "/api/jobs/start",
    method: "POST",
    description: "Start a 3D print job / Druckauftrag starten",
  },
  "send-email": {
    service: "OpenMailer",
    port: 4160,
    path: "/api/send",
    method: "POST",
    description: "Send a transactional email / Transaktions-E-Mail senden",
  },
  "export-data": {
    service: "OpenInventory",
    port: 4170,
    path: "/api/export",
    method: "POST",
    description: "Export data as CSV/JSON / Daten als CSV/JSON exportieren",
  },
};

function getActionUrl(action: typeof ACTION_MAP[string]): string {
  const host = process.env.GATEWAY_INTERNAL_HOST ?? "http://localhost";
  return `${host}:${action.port}${action.path}`;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ action: string }> }
) {
  const { action } = await context.params;

  // 1. Authenticate / Authentifizierung
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    return unauthorizedResponse(auth.error);
  }

  // 2. Resolve action
  const actionConfig = ACTION_MAP[action];
  if (!actionConfig) {
    return NextResponse.json(
      {
        error: `Unknown action: ${action}`,
        availableActions: Object.keys(ACTION_MAP),
      },
      { status: 404 }
    );
  }

  // 3. Forward to internal service
  // An internen Service weiterleiten
  const targetUrl = getActionUrl(actionConfig);

  try {
    const body = await request.text();

    const response = await fetch(targetUrl, {
      method: actionConfig.method,
      headers: {
        "Content-Type": "application/json",
        "X-Gateway-App-Id": auth.appId ?? "unknown",
        "X-Gateway-Request-Id": crypto.randomUUID(),
      },
      body: body || undefined,
    });

    const status = response.status;
    let result: unknown;

    try {
      result = await response.json();
    } catch {
      result = { rawStatus: status };
    }

    // Return status only — no PII in action responses
    // Nur Status zurueckgeben — keine personenbezogenen Daten in Aktions-Antworten
    return NextResponse.json(
      {
        action,
        service: actionConfig.service,
        status: status >= 200 && status < 300 ? "success" : "error",
        httpStatus: status,
        requestId: crypto.randomUUID(),
        ...(status >= 400 ? { detail: result } : {}),
      },
      { status: status >= 200 && status < 300 ? 200 : status }
    );
  } catch (error) {
    console.error(`[API Gateway] Action error for ${action}:`, error);
    return NextResponse.json(
      {
        action,
        service: actionConfig.service,
        status: "error",
        detail: "Service unavailable",
      },
      { status: 502 }
    );
  }
}

/**
 * GET: List available actions
 * Verfuegbare Aktionen auflisten
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ action: string }> }
) {
  const { action } = await context.params;

  const auth = await validateApiKey(request);
  if (!auth.valid) {
    return unauthorizedResponse(auth.error);
  }

  const actionConfig = ACTION_MAP[action];
  if (!actionConfig) {
    return NextResponse.json(
      {
        error: `Unknown action: ${action}`,
        availableActions: Object.entries(ACTION_MAP).map(([name, cfg]) => ({
          name,
          service: cfg.service,
          method: cfg.method,
          description: cfg.description,
        })),
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    action,
    service: actionConfig.service,
    method: actionConfig.method,
    description: actionConfig.description,
  });
}
