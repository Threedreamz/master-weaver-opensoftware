import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/middleware/auth";
import { stripPII, getPrivacyLevel } from "@/middleware/pii-filter";
import { checkEntitlement, entitlementDeniedResponse } from "@/middleware/entitlement";

/**
 * Service-zu-Port-Zuordnung fuer alle OpenSoftware-Apps
 * Maps external service names to internal ports
 */
const SERVICE_MAP: Record<string, { port: number; name: string }> = {
  inventory: { port: 4170, name: "OpenInventory" },
  accounting: { port: 4162, name: "OpenAccounting" },
  farm: { port: 4174, name: "OpenFarm" },
  slicer: { port: 4175, name: "OpenSlicer" },
  payroll: { port: 4172, name: "OpenPayroll" },
  mailer: { port: 4160, name: "OpenMailer" },
  flow: { port: 4168, name: "OpenFlow" },
  bounty: { port: 4670, name: "OpenBounty" },
  lawyer: { port: 4164, name: "OpenLawyer" },
  seo: { port: 4166, name: "OpenSEO" },
  desktop: { port: 4176, name: "OpenDesktop" },
  postbox: { port: 4167, name: "OpenPostbox" },
};

/**
 * Internal base URL for proxying requests.
 * In Railway, services communicate via internal URLs.
 * Locally, everything runs on localhost.
 *
 * Interne Basis-URL: In Railway via Service-Mesh, lokal via localhost
 */
function getServiceUrl(service: string): string | null {
  const entry = SERVICE_MAP[service];
  if (!entry) return null;

  // Check for Railway service URL env var (e.g., RAILWAY_SERVICE_OPENINVENTORY_URL)
  const envKey = `RAILWAY_SERVICE_${entry.name.toUpperCase().replace("OPEN", "OPEN_")}_URL`;
  const railwayUrl = process.env[envKey];
  if (railwayUrl) return railwayUrl;

  // Fallback: localhost with port
  const host = process.env.GATEWAY_INTERNAL_HOST ?? "http://localhost";
  return `${host}:${entry.port}`;
}

/**
 * Proxy handler — validates auth, forwards request, filters PII in response
 * Proxy-Handler: Authentifizierung, Weiterleitung, Datenschutz-Filter
 */
async function proxyRequest(
  request: NextRequest,
  params: Promise<{ service: string; path: string[] }>
): Promise<NextResponse | Response> {
  const { service, path } = await params;

  // 1. Validate API key
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    return unauthorizedResponse(auth.error);
  }

  // 1b. Enforce paywall entitlement (reads X-User-Plan from the hub).
  // Services not listed in SERVICE_ENTITLEMENTS pass through unchanged.
  const entitlement = checkEntitlement(service, request);
  if (!entitlement.ok) {
    return entitlementDeniedResponse(entitlement);
  }

  // 2. Resolve target service
  const baseUrl = getServiceUrl(service);
  if (!baseUrl) {
    return NextResponse.json(
      { error: `Unknown service: ${service}`, availableServices: Object.keys(SERVICE_MAP) },
      { status: 404 }
    );
  }

  // 3. Build target URL
  const targetPath = path.join("/");
  const url = new URL(request.url);
  const targetUrl = `${baseUrl}/${targetPath}${url.search}`;

  // 4. Forward request to internal service
  // Anfrage an internen Service weiterleiten
  try {
    const headers = new Headers();
    headers.set("Content-Type", request.headers.get("Content-Type") ?? "application/json");
    headers.set("Accept", request.headers.get("Accept") ?? "application/json");
    // Pass through the authenticated app ID
    headers.set("X-Gateway-App-Id", auth.appId ?? "unknown");
    headers.set("X-Gateway-Request-Id", crypto.randomUUID());

    // Forward the shared api key + paywall/quota context to the downstream
    // service. Services like openpostbox-api scope queries by X-Tenant-Id
    // and enforce per-month quotas from X-Plan-Scan-Pages.
    const serviceKey = process.env.OPENSOFTWARE_API_KEY;
    if (serviceKey) headers.set("X-API-Key", serviceKey);
    const tenantId = request.headers.get("x-tenant-id");
    if (tenantId) headers.set("X-Tenant-Id", tenantId);
    const userPlan = request.headers.get("x-user-plan");
    if (userPlan) headers.set("X-User-Plan", userPlan);
    const planScanPages = request.headers.get("x-plan-scan-pages");
    if (planScanPages) headers.set("X-Plan-Scan-Pages", planScanPages);

    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
    };

    // Forward body for non-GET requests
    if (request.method !== "GET" && request.method !== "HEAD") {
      fetchOptions.body = await request.text();
    }

    const response = await fetch(targetUrl, fetchOptions);

    // 5. Apply PII filter to response
    // Datenschutz-Filter auf Antwort anwenden
    const privacyLevel = getPrivacyLevel(request);
    const contentType = response.headers.get("Content-Type") ?? "";

    if (contentType.includes("application/json")) {
      const data = await response.json();
      const filtered = stripPII(data, privacyLevel);

      return NextResponse.json(filtered, {
        status: response.status,
        headers: {
          "X-Privacy-Level": privacyLevel,
          "X-Gateway-App-Id": auth.appId ?? "unknown",
        },
      });
    }

    // Non-JSON responses: pass through without filtering
    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
        "X-Gateway-App-Id": auth.appId ?? "unknown",
      },
    });
  } catch (error) {
    console.error(`[API Gateway] Proxy error for ${service}/${targetPath}:`, error);
    return NextResponse.json(
      { error: "Service unavailable", service, detail: "Could not reach internal service" },
      { status: 502 }
    );
  }
}

// All HTTP methods proxy through the same handler
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ service: string; path: string[] }> }
) {
  return proxyRequest(request, context.params);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ service: string; path: string[] }> }
) {
  return proxyRequest(request, context.params);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ service: string; path: string[] }> }
) {
  return proxyRequest(request, context.params);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ service: string; path: string[] }> }
) {
  return proxyRequest(request, context.params);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ service: string; path: string[] }> }
) {
  return proxyRequest(request, context.params);
}
