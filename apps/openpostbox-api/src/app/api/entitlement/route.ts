import { NextResponse } from "next/server";

/**
 * Self-reported entitlement key. The opensoftware-gateway can hit this
 * to avoid re-parsing the manifest when enforcing paywall access. Must
 * match the `requiresEntitlement` in /api/appstore/manifest and the
 * `catalog.requiresEntitlement` in registry.json.
 */
export async function GET() {
  return NextResponse.json({
    service: "openpostbox",
    requiresEntitlement: "openpostbox.business",
  });
}
