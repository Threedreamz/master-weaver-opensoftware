import {
  Monitor,
  LayoutDashboard,
  Building2,
  Wrench,
  GitBranch,
  PlayCircle,
  AlertTriangle,
  Link2,
  Settings,
  FolderKanban,
  Boxes,
  Workflow,
  ClipboardCheck,
} from "lucide-react";
import { AppShell, Sidebar, type SidebarItem } from "@opensoftware/ui";
import { setRequestLocale } from "next-intl/server";
import { SessionGuard } from "@/components/auth/SessionGuard";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const navItems: SidebarItem[] = [
    { key: "dashboard", href: `/${locale}/admin`, label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" />, exact: true },
    { key: "vorgaenge", href: `/${locale}/admin/vorgaenge`, label: "Vorgaenge", icon: <FolderKanban className="w-5 h-5" /> },
    { key: "modules", href: `/${locale}/admin/modules`, label: "Module", icon: <Boxes className="w-5 h-5" /> },
    { key: "flows", href: `/${locale}/admin/flows`, label: "Flows", icon: <Workflow className="w-5 h-5" /> },
    { key: "tasks", href: `/${locale}/admin/tasks`, label: "Aufgaben", icon: <ClipboardCheck className="w-5 h-5" /> },
    { key: "zones", href: `/${locale}/admin/zones`, label: "Bereiche", icon: <Building2 className="w-5 h-5" /> },
    { key: "workstations", href: `/${locale}/admin/workstations`, label: "Arbeitsplaetze", icon: <Monitor className="w-5 h-5" /> },
    { key: "equipment", href: `/${locale}/admin/equipment`, label: "Ausstattung", icon: <Wrench className="w-5 h-5" /> },
    { key: "workflows", href: `/${locale}/admin/workflows`, label: "Workflows", icon: <GitBranch className="w-5 h-5" /> },
    { key: "runs", href: `/${locale}/admin/runs`, label: "Ausfuehrungen", icon: <PlayCircle className="w-5 h-5" /> },
    { key: "issues", href: `/${locale}/admin/issues`, label: "Meldungen", icon: <AlertTriangle className="w-5 h-5" /> },
    { key: "integrations", href: `/${locale}/admin/integrations`, label: "Integrationen", icon: <Link2 className="w-5 h-5" /> },
    { key: "settings", href: `/${locale}/admin/settings`, label: "Einstellungen", icon: <Settings className="w-5 h-5" /> },
  ];

  const sidebarHeader = (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
        <Monitor className="w-6 h-6 text-white" />
      </div>
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white">OpenDesktop</h2>
        <p className="text-xs text-gray-500">Arbeitsplatz-Verwaltung</p>
      </div>
    </div>
  );

  return (
    <SessionGuard requiredRole="viewer">
      <AppShell sidebar={<Sidebar items={navItems} header={sidebarHeader} />}>
        {children}
      </AppShell>
    </SessionGuard>
  );
}
