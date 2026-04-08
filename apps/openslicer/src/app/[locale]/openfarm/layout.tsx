"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Printer,
  ListOrdered,
  Wrench,
  Activity,
  Menu,
  X,
  ArrowLeft,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export default function OpenFarmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Extract locale from pathname (e.g., /en/openfarm/... -> en)
  const locale = pathname.split("/")[1] || "de";

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: `/${locale}/openfarm`,
      icon: <LayoutDashboard size={18} />,
    },
    {
      label: "Devices",
      href: `/${locale}/openfarm/devices`,
      icon: <Printer size={18} />,
    },
    {
      label: "Print Queue",
      href: `/${locale}/openfarm/queue`,
      icon: <ListOrdered size={18} />,
    },
    {
      label: "Calibration",
      href: `/${locale}/openfarm/calibration`,
      icon: <Wrench size={18} />,
    },
    {
      label: "Monitoring",
      href: `/${locale}/openfarm/monitoring`,
      icon: <Activity size={18} />,
    },
  ];

  function isActive(href: string): boolean {
    if (href === `/${locale}/openfarm`) return pathname === href;
    return pathname.startsWith(href);
  }

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="h-14 flex items-center gap-2 px-4 border-b border-zinc-800">
        <div className="w-7 h-7 rounded-md bg-emerald-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">OF</span>
        </div>
        <span className="font-semibold text-zinc-100">OpenFarm</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-emerald-600 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              <span className={active ? "text-white" : "text-zinc-500"}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer — link back to slicer */}
      <div className="px-3 py-3 border-t border-zinc-800">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Slicer
        </Link>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-md bg-zinc-800 border border-zinc-700"
        aria-label="Toggle navigation menu"
      >
        {mobileOpen ? (
          <X size={20} className="text-zinc-300" />
        ) : (
          <Menu size={20} className="text-zinc-300" />
        )}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-40 w-60 bg-zinc-900 border-r border-zinc-800 flex flex-col transform transition-transform ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 h-full bg-zinc-900 border-r border-zinc-800 flex-col">
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between px-6 pl-14 md:pl-6 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">OF</span>
            </div>
            <span className="font-semibold text-zinc-100 hidden sm:inline">
              OpenFarm
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
