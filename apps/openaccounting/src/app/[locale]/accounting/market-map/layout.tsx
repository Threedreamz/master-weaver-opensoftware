"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Map, BarChart3, Users } from "lucide-react";

const tabs = [
  { href: "/accounting/market-map", label: "Map", icon: Map, exact: true },
  { href: "/accounting/market-map/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/accounting/market-map/leads", label: "Leads", icon: Users },
];

export default function MarketMapLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Extract locale from pathname (e.g., /en/accounting/market-map -> en)
  const locale = pathname.split("/")[1];

  return (
    <div className="flex flex-col h-screen">
      <nav className="flex items-center gap-1 px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0">
        {tabs.map((tab) => {
          const fullHref = `/${locale}${tab.href}`;
          const isActive = tab.exact
            ? pathname === fullHref
            : pathname.startsWith(fullHref);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={fullHref}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
