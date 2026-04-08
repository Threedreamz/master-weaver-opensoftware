import {
  Factory,
  LayoutDashboard,
  Printer,
  Box,
  ClipboardList,
  Layers,
  SlidersHorizontal,
  Beaker,
  Settings,
  Monitor,
  Bell,
  Wrench,
  Package,
  Scissors,
  ShieldCheck,
  GitMerge,
  Crosshair,
} from "lucide-react";
import { AppShell, Sidebar, type SidebarSection, type SidebarItem } from "@opensoftware/ui";
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

  const dashboardItem: SidebarItem = {
    key: "dashboard",
    href: `/${locale}/admin`,
    label: "Dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
    exact: true,
  };

  const navSections: SidebarSection[] = [
    {
      key: "preparation",
      label: "Vorbereitung",
      items: [
        { key: "models", href: `/${locale}/admin/models`, label: "Modelle", icon: <Box className="w-5 h-5" /> },
        { key: "materials", href: `/${locale}/admin/materials`, label: "Materialien", icon: <Beaker className="w-5 h-5" /> },
        { key: "profiles", href: `/${locale}/admin/profiles`, label: "Slicer-Profile", icon: <SlidersHorizontal className="w-5 h-5" /> },
      ],
    },
    {
      key: "slicing",
      label: "Slicen",
      items: [
        { key: "slicing", href: `/${locale}/admin/slicing`, label: "OpenSlicer", icon: <Scissors className="w-5 h-5" /> },
        { key: "packing", href: `/${locale}/admin/packing`, label: "SLS Packing", icon: <Package className="w-5 h-5" /> },
      ],
    },
    {
      key: "queue",
      label: "Warteschlange",
      items: [
        { key: "jobs", href: `/${locale}/admin/jobs`, label: "Druckaufträge", icon: <ClipboardList className="w-5 h-5" /> },
        { key: "batch", href: `/${locale}/admin/batch`, label: "Batch-Jobs", icon: <Layers className="w-5 h-5" /> },
        { key: "assignment", href: `/${locale}/admin/assignment`, label: "Zuweisung", icon: <GitMerge className="w-5 h-5" /> },
      ],
    },
    {
      key: "printMonitoring",
      label: "Drucken & Überwachung",
      items: [
        { key: "printers", href: `/${locale}/admin/printers`, label: "Drucker", icon: <Printer className="w-5 h-5" /> },
        { key: "monitoring", href: `/${locale}/admin/monitoring`, label: "Live-Monitor", icon: <Monitor className="w-5 h-5" /> },
      ],
    },
    {
      key: "qualityControl",
      label: "Qualitätssicherung",
      items: [
        { key: "quality", href: `/${locale}/admin/quality`, label: "Prüfungen", icon: <ShieldCheck className="w-5 h-5" /> },
      ],
    },
    {
      key: "system",
      label: "System",
      items: [
        { key: "maintenance", href: `/${locale}/admin/maintenance`, label: "Wartung", icon: <Wrench className="w-5 h-5" /> },
        { key: "calibration", href: `/${locale}/admin/calibration`, label: "Kalibrierung", icon: <Crosshair className="w-5 h-5" /> },
        { key: "notifications", href: `/${locale}/admin/notifications`, label: "Benachrichtigungen", icon: <Bell className="w-5 h-5" /> },
        { key: "settings", href: `/${locale}/admin/settings`, label: "Einstellungen", icon: <Settings className="w-5 h-5" /> },
      ],
    },
  ];

  const sidebarHeader = (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-amber-700 rounded-lg flex items-center justify-center">
        <Factory className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1">
        <h2 className="font-semibold text-gray-900 dark:text-white">OpenFarm</h2>
        <p className="text-xs text-gray-500">3D Print Farm Management</p>
      </div>
    </div>
  );

  return (
    <SessionGuard requiredRole="viewer">
      <AppShell
        sidebar={
          <Sidebar
            items={[dashboardItem]}
            sections={navSections}
            header={sidebarHeader}
            techFilter
          />
        }
      >
        {children}
      </AppShell>
    </SessionGuard>
  );
}
