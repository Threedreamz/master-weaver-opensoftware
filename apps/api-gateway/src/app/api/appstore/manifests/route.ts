import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/middleware/auth";

/**
 * AppStore Manifest Aggregator.
 *
 * Fetches /api/appstore/manifest from every OpenSoftware service running in
 * this bubble and returns a single JSON payload. The admin panel calls this
 * instead of hitting each service individually.
 *
 * Protocol: see Grand-Master-Weaver/.claude/rules/bubble-conventions.md →
 * "OpenSoftware AppStore — Catalog + Manifest Protocol".
 */

// Services that currently expose an AppStore manifest in this monorepo.
// Keep in sync with the `catalog` blocks in registry.json. When a new
// opensoftware service ships /api/appstore/manifest, add it here.
const MANIFEST_SERVICES = [
  { slug: "openaccounting",  port: 4162 },
  { slug: "openmailer",      port: 4161 },
  { slug: "opensem",         port: 4164 },
  { slug: "openlawyer",      port: 4165 },
  { slug: "openportal-api",  port: 4179 },
  { slug: "openportal",      port: 4178 },
  { slug: "open3d-api",      port: 4173 },
  { slug: "open3d-studio",   port: 4172 },
  { slug: "open3d-desktop",  port: 4181 },
  { slug: "open3d-worker",   port: 4182 },  // moved from 4174 (openfarm collision)
] as const;

const FETCH_TIMEOUT_MS = 3000;

interface ManifestResult {
  slug: string;
  status: "ok" | "unreachable" | "error";
  responseTime?: number;
  manifest?: unknown;
  error?: string;
}

async function fetchManifest(
  service: (typeof MANIFEST_SERVICES)[number]
): Promise<ManifestResult> {
  const host = process.env.GATEWAY_INTERNAL_HOST ?? "http://localhost";
  const url = `${host}:${service.port}/api/appstore/manifest`;

  try {
    const start = Date.now();
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { accept: "application/json" },
    });
    const responseTime = Date.now() - start;

    if (!res.ok) {
      return {
        slug: service.slug,
        status: "error",
        responseTime,
        error: `HTTP ${res.status}`,
      };
    }

    const manifest = await res.json();
    return { slug: service.slug, status: "ok", responseTime, manifest };
  } catch (err) {
    return {
      slug: service.slug,
      status: "unreachable",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET(request: NextRequest) {
  // Aggregator requires a valid API key — it exposes the shape of every
  // installed service's UI, which is only meaningful for the owning admin.
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    return unauthorizedResponse(auth.error);
  }

  const results = await Promise.all(MANIFEST_SERVICES.map(fetchManifest));

  const reachable = results.filter((r) => r.status === "ok").length;

  return NextResponse.json({
    bubble: auth.appId ?? "unknown",
    manifests: results,
    summary: {
      total: results.length,
      reachable,
      unreachable: results.length - reachable,
    },
    generatedAt: new Date().toISOString(),
  });
}
