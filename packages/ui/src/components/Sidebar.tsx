"use client";

import { cn } from "../lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

export interface SidebarItem {
  key: string;
  href: string;
  label: string;
  icon?: ReactNode;
  exact?: boolean;
}

export interface SidebarSection {
  key: string;
  label: string;
  items: SidebarItem[];
}

interface SidebarProps {
  items?: SidebarItem[];
  sections?: SidebarSection[];
  header?: ReactNode;
  footer?: ReactNode;
  techFilter?: boolean;
  onTechFilterChange?: (tech: string) => void;
}

const TECH_OPTIONS = ["Alle", "FDM", "SLA", "SLS"];

function NavItem({ item, pathname }: { item: SidebarItem; pathname: string }) {
  const isActive = item.exact
    ? pathname === item.href
    : pathname.startsWith(item.href);

  return (
    <Link
      key={item.key}
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
        isActive
          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
      )}
    >
      {item.icon && <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>}
      <span>{item.label}</span>
    </Link>
  );
}

export function Sidebar({ items, sections, header, footer, techFilter, onTechFilterChange }: SidebarProps) {
  const pathname = usePathname();
  const [activeTech, setActiveTech] = useState("Alle");

  const handleTechChange = (tech: string) => {
    setActiveTech(tech);
    onTechFilterChange?.(tech);
  };

  return (
    <div className="flex flex-col h-full p-4">
      {header && <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">{header}</div>}

      {techFilter && (
        <div className="flex gap-1 mb-4 px-1">
          {TECH_OPTIONS.map((tech) => (
            <button
              key={tech}
              onClick={() => handleTechChange(tech)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full transition-colors",
                activeTech === tech
                  ? "bg-amber-100 text-amber-700 font-medium"
                  : "text-gray-500 hover:bg-gray-100"
              )}
            >
              {tech}
            </button>
          ))}
        </div>
      )}

      <nav className="flex-1 space-y-1">
        {items?.map((item) => (
          <NavItem key={item.key} item={item} pathname={pathname} />
        ))}
        {sections?.map((section, idx) => (
          <div key={section.key} className={idx === 0 && !items?.length ? "mt-2" : "mt-5 mb-2"}>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
              {section.label}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavItem key={item.key} item={item} pathname={pathname} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {footer && <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">{footer}</div>}
    </div>
  );
}
