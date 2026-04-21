import { NextResponse } from "next/server";

/**
 * AppStore Manifest — opensimulation.
 *
 * Protocol: Grand-Master-Weaver/.claude/rules/bubble-conventions.md →
 * "OpenSoftware AppStore — Catalog + Manifest Protocol".
 *
 * opensimulation is part of the Open3D family — browser-based simulation
 * (kinematics, FEA, thermal) that pairs with opencad (design → simulate)
 * and opencam (simulate → toolpath).
 *
 * Milestones: M1 core solvers (kinematic fwd/ik, FEA static, thermal
 * steady) — shipping now. M2 modal + rigid-body pre-registered here;
 * routes return "coming soon" until implementation lands. Dashboard
 * entries stay registered so the admin sidebar is stable across
 * milestone releases.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MANIFEST_VERSION = "1.0.0";

export async function GET() {
  return NextResponse.json({
    service: "opensimulation",
    version: MANIFEST_VERSION,
    sidebar: [
      {
        label: "Simulation",
        href: "/admin/simulation",
        icon: "Gauge",
        permission: "simulation.view",
      },
    ],
    dashboards: [
      { id: "kinematic-fwd",  route: "/admin/simulation/kinematic-fwd",  mode: "iframe", remoteUrl: "/simulation/kinematic-fwd",  title: "Kinematic FK" },
      { id: "kinematic-ik",   route: "/admin/simulation/kinematic-ik",   mode: "iframe", remoteUrl: "/simulation/kinematic-ik",   title: "Kinematic IK" },
      { id: "fea-static",     route: "/admin/simulation/fea-static",     mode: "iframe", remoteUrl: "/simulation/fea-static",     title: "FEA Static" },
      { id: "thermal-steady", route: "/admin/simulation/thermal",        mode: "iframe", remoteUrl: "/simulation/thermal",        title: "Thermal Steady" },
      { id: "modal",          route: "/admin/simulation/modal",          mode: "iframe", remoteUrl: "/simulation/modal",          title: "Modal (planned)" },
      { id: "rigid-body",     route: "/admin/simulation/rigid-body",     mode: "iframe", remoteUrl: "/simulation/rigid-body",     title: "Rigid-Body (planned)" },
    ],
    widgets: [
      { id: "recent-runs", mode: "local", dataFetch: "/api/services/simulation/recent", size: "1x2", title: "Recent Simulation Runs" },
    ],
    injections: [],
  });
}
