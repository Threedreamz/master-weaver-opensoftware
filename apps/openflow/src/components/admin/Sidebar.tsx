"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Workflow,
  FileText,
  Settings,
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

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: `/${locale}/admin`,
      icon: <LayoutDashboard size={18} />,
    },
    {
      label: "Flows",
      href: `/${locale}/admin/flows`,
      icon: <Workflow size={18} />,
    },
    {
      label: "Submissions",
      href: `/${locale}/admin/submissions`,
      icon: <FileText size={18} />,
    },
    {
      label: "Settings",
      href: `/${locale}/admin/settings`,
      icon: <Settings size={18} />,
    },
  ];

  function isActive(href: string): boolean {
    if (href === `/${locale}/admin`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-60 shrink-0 h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2 px-4 border-b border-gray-200">
        <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">OF</span>
        </div>
        <span className="font-semibold text-gray-900">OpenFlow</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-indigo-600 text-white"
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

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200">
        <p className="text-xs text-gray-400">OpenFlow Admin</p>
      </div>
    </aside>
  );
}
