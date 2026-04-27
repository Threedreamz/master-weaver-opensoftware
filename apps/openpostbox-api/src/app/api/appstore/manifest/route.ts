import { NextResponse } from "next/server";

/**
 * AppStore Manifest — OpenPostbox.
 *
 * Protocol: see Grand-Master-Weaver/.claude/rules/bubble-conventions.md →
 * "OpenSoftware AppStore — Catalog + Manifest Protocol".
 *
 * The hub admin fetches this (directly or via the gateway aggregator) to
 * discover sidebar entries, dashboards, widgets, and — critically — the
 * `requiresEntitlement` key that paywalls the feature behind a plan tier.
 *
 * The hub reads `requiresEntitlement`, resolves it via `plans.ts →
 * getOpensoftwareEntitlement(tier, "openpostbox")`, and renders either an
 * unlocked iframe or a paywall CTA. The opensoftware-gateway re-checks the
 * same entitlement on every API call for defence-in-depth.
 */

const MANIFEST_VERSION = "0.1.0";

export async function GET() {
  return NextResponse.json({
    service: "openpostbox",
    version: MANIFEST_VERSION,
    requiresEntitlement: "openpostbox.business",
    sidebar: [
      {
        label: "Postfach",
        href: "/admin/postbox",
        icon: "Mailbox",
        permission: "postbox.view",
      },
    ],
    dashboards: [
      {
        id: "postbox-inbox",
        route: "/admin/postbox",
        mode: "iframe",
        remoteUrl: "/postbox",
        title: "Eingehende Post",
      },
    ],
    widgets: [
      {
        id: "postbox-unread-count",
        mode: "local",
        dataFetch: "/api/scans?unread=1&count=1",
        size: "1x1",
        title: "Ungelesen",
      },
      {
        id: "postbox-recent",
        mode: "local",
        dataFetch: "/api/scans?limit=5",
        size: "2x1",
        title: "Letzte Scans",
      },
    ],
    injections: [],
  });
}
