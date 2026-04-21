"use client";

/**
 * opensimulation — SidebarNav
 *
 * Left-hand navigation for the admin panel. Listed here once, rendered
 * by every simulation admin page. Planned entries are grayed and non-clickable;
 * active slug is highlighted in blue.
 *
 * When Wave 3C ships the manifest, this list can be driven from the manifest
 * response instead of the hardcoded DOMAINS array below — but for M1 the static
 * list keeps SSR prefetch simple.
 */

import Link from "next/link";

export interface SidebarNavProps {
  activeSlug?: string;
}

interface DomainEntry {
  slug: string;
  label: string;
  href: string;
  status: "live" | "planned";
}

const DOMAINS: DomainEntry[] = [
  {
    slug: "kinematic-fwd",
    label: "Kinematic FWD",
    href: "/admin/simulation/kinematic-fwd",
    status: "live",
  },
  {
    slug: "kinematic-ik",
    label: "Kinematic IK",
    href: "/admin/simulation/kinematic-ik",
    status: "live",
  },
  {
    slug: "fea-static",
    label: "FEA Static",
    href: "/admin/simulation/fea-static",
    status: "live",
  },
  {
    slug: "thermal-steady",
    label: "Thermal Steady",
    href: "/admin/simulation/thermal-steady",
    status: "live",
  },
  {
    slug: "modal",
    label: "Modal",
    href: "/admin/simulation/modal",
    status: "planned",
  },
  {
    slug: "rigid-body",
    label: "Rigid-Body",
    href: "/admin/simulation/rigid-body",
    status: "planned",
  },
  {
    slug: "cleaning-emulator",
    label: "Cleaning Emulator",
    href: "/admin/simulation/cleaning-emulator",
    status: "live",
  },
];

export default function SidebarNav({
  activeSlug,
}: SidebarNavProps) {
  return (
    <nav
      aria-label="Simulation domains"
      style={{
        width: 220,
        minHeight: "100vh",
        background: "#0a0d10",
        color: "#dfe7f0",
        borderRight: "1px solid #1c2128",
        padding: "16px 0",
        fontFamily: "system-ui, sans-serif",
        fontSize: 14,
      }}
    >
      <div
        style={{
          padding: "0 16px 12px",
          fontSize: 11,
          letterSpacing: 1,
          textTransform: "uppercase",
          color: "#7a8794",
        }}
      >
        Simulation
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {DOMAINS.map((d) => {
          const isActive = activeSlug === d.slug;
          const isPlanned = d.status === "planned";
          const baseStyle: React.CSSProperties = {
            display: "block",
            padding: "8px 16px",
            color: isPlanned ? "#556270" : isActive ? "#4ea3ff" : "#dfe7f0",
            background: isActive ? "rgba(78, 163, 255, 0.08)" : "transparent",
            borderLeft: isActive
              ? "3px solid #4ea3ff"
              : "3px solid transparent",
            textDecoration: "none",
            cursor: isPlanned ? "not-allowed" : "pointer",
            userSelect: "none",
          };
          if (isPlanned) {
            return (
              <li key={d.slug}>
                <span
                  style={baseStyle}
                  aria-disabled="true"
                  title="Planned — not yet available"
                >
                  {d.label}
                  <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.7 }}>
                    (planned)
                  </span>
                </span>
              </li>
            );
          }
          return (
            <li key={d.slug}>
              <Link
                href={d.href}
                style={baseStyle}
                aria-current={isActive ? "page" : undefined}
              >
                {d.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
