import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Map, BarChart3, Users, Globe2 } from "lucide-react";

export const metadata: Metadata = {
  title: "OpenMaps — SME Market Intelligence",
  description: "European SME market analysis with interactive maps, leads, and enrichment",
};

const tabs = [
  { href: "/", label: "Map", icon: Map, exact: true },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/leads", label: "Leads", icon: Users },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen flex flex-col">
        <header className="flex items-center gap-6 px-6 py-3 bg-zinc-900 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-bold text-white">OpenMaps</span>
            <span className="text-xs text-zinc-500">SME Market Intelligence</span>
          </div>
          <nav className="flex items-center gap-1">
            {tabs.map((tab) => (
              <NavTab key={tab.href} href={tab.href} icon={tab.icon} label={tab.label} />
            ))}
          </nav>
        </header>
        <main className="flex-1 min-h-0">{children}</main>
      </body>
    </html>
  );
}

function NavTab({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}
