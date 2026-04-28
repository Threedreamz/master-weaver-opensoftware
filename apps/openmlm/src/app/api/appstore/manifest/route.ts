import { NextResponse } from "next/server";

/**
 * AppStore Manifest — openmlm.
 *
 * Protocol: Grand-Master-Weaver/.claude/rules/bubble-conventions.md →
 * "OpenSoftware AppStore — Catalog + Manifest Protocol".
 *
 * openmlm exposes loyalty / career / commission tiles. Phase 1 ships the
 * loyalty dashboard; later phases add referral, career, commission,
 * wallet/coin and KYC tiles. Pre-registered here so admin sidebars are
 * stable across releases.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MANIFEST_VERSION = "0.1.0";

export async function GET() {
  return NextResponse.json({
    service: "openmlm",
    version: MANIFEST_VERSION,
    sidebar: [
      {
        label: "MLM",
        href: "/admin/mlm",
        icon: "Network",
        permission: "mlm.view",
      },
    ],
    dashboards: [
      { id: "loyalty",     route: "/admin/mlm/loyalty",     mode: "iframe", remoteUrl: "/admin/loyalty",     title: "Loyalty (Points + Rewards)" },
      { id: "referral",    route: "/admin/mlm/referral",    mode: "iframe", remoteUrl: "/admin/referral",    title: "Referral (planned)" },
      { id: "career",      route: "/admin/mlm/career",      mode: "iframe", remoteUrl: "/admin/career",      title: "Career / Stages (planned)" },
      { id: "commission",  route: "/admin/mlm/commission",  mode: "iframe", remoteUrl: "/admin/commission",  title: "Commission (planned)" },
      { id: "wallet",      route: "/admin/mlm/wallet",      mode: "iframe", remoteUrl: "/admin/wallet",      title: "Wallet / Coins (planned)" },
      { id: "kyc",         route: "/admin/mlm/kyc",         mode: "iframe", remoteUrl: "/admin/kyc",         title: "KYC / Compliance (planned)" },
    ],
    widgets: [],
    injections: [],
  });
}
