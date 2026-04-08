"use client";

import { usePathname } from "next/navigation";
import { useParams } from "next/navigation";
import { AppShell } from "@opensoftware/ui";
import {
  Scale,
  LayoutDashboard,
  FolderKanban,
  FileText,
  FileStack,
  Activity,
  Users,
  BookOpen,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { SessionGuard } from "@/components/auth/SessionGuard";

const sidebarItems = [
  { href: "/legal", label: "Dashboard", icon: LayoutDashboard },
  { href: "/legal/projects", label: "Projects", icon: FolderKanban },
  { href: "/legal/documents", label: "Documents", icon: FileText },
  { href: "/legal/templates", label: "Templates", icon: FileStack },
  { href: "/legal/clauses", label: "Clause Library", icon: BookOpen },
  { href: "/legal/deadlines", label: "Deadlines", icon: Clock },
  { href: "/legal/monitoring", label: "Monitoring", icon: Activity },
  { href: "/legal/reviewers", label: "Reviewers", icon: Users },
];

function Sidebar() {
  const pathname = usePathname();
  const { locale } = useParams<{ locale: string }>();

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <span className="font-semibold text-gray-900 dark:text-white">OpenLawyer</span>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {sidebarItems.map((item) => {
          const fullHref = `/${locale}${item.href}`;
          const isActive =
            pathname === fullHref ||
            (item.href !== "/legal" && pathname.startsWith(fullHref));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={fullHref}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGuard requiredRole="viewer">
      <AppShell
        sidebar={<Sidebar />}
        header={
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            <span className="font-semibold">OpenLawyer</span>
          </div>
        }
      >
        {children}
      </AppShell>
    </SessionGuard>
  );
}
