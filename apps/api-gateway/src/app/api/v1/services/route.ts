import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/middleware/auth";

/**
 * Service Discovery Endpoint
 *
 * Returns the list of available OpenSoftware services with health status.
 * Gibt die Liste verfuegbarer OpenSoftware-Dienste mit Gesundheitsstatus zurueck.
 */

const SERVICES = [
  { name: "inventory", port: 4170, label: "OpenInventory", description: "Inventory & warehouse management / Lager- und Bestandsverwaltung" },
  { name: "accounting", port: 4162, label: "OpenAccounting", description: "Financial tracking & invoicing / Finanzverwaltung & Rechnungen" },
  { name: "farm", port: 4174, label: "OpenFarm", description: "3D print farm management / 3D-Druckfarm-Verwaltung" },
  { name: "slicer", port: 4175, label: "OpenSlicer", description: "Cloud slicing service / Cloud-Slicing-Service" },
  { name: "payroll", port: 4172, label: "OpenPayroll", description: "Payroll & HR management / Lohn- und Personalverwaltung" },
  { name: "mailer", port: 4160, label: "OpenMailer", description: "Email management / E-Mail-Verwaltung" },
  { name: "flow", port: 4168, label: "OpenFlow", description: "Visual form flow builder / Visueller Formular-Flow-Builder" },
  { name: "bounty", port: 4670, label: "OpenBounty", description: "Bug bounty & task management / Bug-Bounty & Aufgabenverwaltung" },
  { name: "lawyer", port: 4164, label: "OpenLawyer", description: "Legal project management / Rechtsprojekt-Verwaltung" },
  { name: "seo", port: 4166, label: "OpenSEO", description: "SEO auditing & analytics / SEO-Audit & Analyse" },
  { name: "desktop", port: 4176, label: "OpenDesktop", description: "Workstation management / Arbeitsplatz-Verwaltung" },
];

interface ServiceStatus {
  name: string;
  label: string;
  description: string;
  status: "healthy" | "unhealthy" | "unknown";
  responseTime?: number;
  endpoint: string;
}

async function checkServiceHealth(
  service: (typeof SERVICES)[number]
): Promise<ServiceStatus> {
  const host = process.env.GATEWAY_INTERNAL_HOST ?? "http://localhost";
  const healthUrl = `${host}:${service.port}/api/health`;
  const endpoint = `/api/v1/${service.name}`;

  try {
    const start = Date.now();
    const response = await fetch(healthUrl, {
      signal: AbortSignal.timeout(3000), // 3s timeout
    });
    const responseTime = Date.now() - start;

    return {
      name: service.name,
      label: service.label,
      description: service.description,
      status: response.ok ? "healthy" : "unhealthy",
      responseTime,
      endpoint,
    };
  } catch {
    return {
      name: service.name,
      label: service.label,
      description: service.description,
      status: "unknown",
      endpoint,
    };
  }
}

export async function GET(request: NextRequest) {
  // Auth is optional for service discovery — if key provided, validate it
  const apiKey = request.headers.get("x-api-key");
  if (apiKey) {
    const auth = await validateApiKey(request);
    if (!auth.valid) {
      return unauthorizedResponse(auth.error);
    }
  }

  // Check health of all services in parallel
  // Gesundheit aller Services parallel pruefen
  const results = await Promise.all(SERVICES.map(checkServiceHealth));

  const healthy = results.filter((s) => s.status === "healthy").length;
  const total = results.length;

  return NextResponse.json({
    gateway: "OpenSoftware API Gateway",
    version: "1.0.0",
    services: results,
    summary: {
      total,
      healthy,
      unhealthy: total - healthy,
    },
    timestamp: new Date().toISOString(),
  });
}
