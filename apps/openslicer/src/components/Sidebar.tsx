"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Box,
  Image,
  Droplets,
  Settings,
  Menu,
  X,
  Warehouse,
} from "lucide-react";

interface SidebarProps {
  locale: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export function Sidebar({ locale }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations("nav");

  const navItems: NavItem[] = [
    { label: t("dashboard"), href: `/${locale}/admin`, icon: <LayoutDashboard size={18} /> },
    { label: t("slice"), href: `/${locale}/admin/slice`, icon: <Box size={18} /> },
    { label: t("litophane"), href: `/${locale}/admin/litophane`, icon: <Image size={18} /> },
    { label: t("sla"), href: `/${locale}/admin/sla`, icon: <Droplets size={18} /> },
    { label: t("profiles"), href: `/${locale}/admin/profiles`, icon: <Settings size={18} /> },
  ];

  function isActive(href: string): boolean {
    if (href === `/${locale}/admin`) return pathname === href;
    return pathname.startsWith(href);
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="h-14 flex items-center gap-2 px-4 border-b border-gray-200">
        <div className="w-7 h-7 rounded-md bg-blue-500 flex items-center justify-center">
          <span className="text-white text-xs font-bold">OS</span>
        </div>
        <span className="font-semibold text-gray-900">OpenSlicer</span>
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
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <span className={active ? "text-white" : "text-gray-500"}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* OpenFarm link */}
      <div className="px-3 pb-2">
        <Link
          href={`/${locale}/openfarm`}
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
        >
          <Warehouse size={18} />
          OpenFarm
        </Link>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">OpenSlicer Admin</p>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-md bg-white border border-gray-200 shadow-sm"
        aria-label="Toggle navigation menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-40 w-60 bg-white border-r border-gray-200 flex flex-col transform transition-transform ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 h-full bg-white border-r border-gray-200 flex-col">
        {sidebarContent}
      </aside>
    </>
  );
}
