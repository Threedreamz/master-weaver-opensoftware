import {
  Wallet,
  LayoutDashboard,
  Users,
  ListTree,
  Calculator,
  BookOpen,
  Settings,
} from "lucide-react";
import { AppShell, Sidebar, type SidebarItem } from "@opensoftware/ui";
import { setRequestLocale } from "next-intl/server";
import { SessionGuard } from "@/components/auth/SessionGuard";

export default async function PayrollLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const navItems: SidebarItem[] = [
    { key: "dashboard", href: `/${locale}/payroll`, label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" />, exact: true },
    { key: "employees", href: `/${locale}/payroll/employees`, label: "Mitarbeiter", icon: <Users className="w-5 h-5" /> },
    { key: "salary-types", href: `/${locale}/payroll/salary-types`, label: "Lohnarten", icon: <ListTree className="w-5 h-5" /> },
    { key: "payroll", href: `/${locale}/payroll/payroll`, label: "Lohnabrechnung", icon: <Calculator className="w-5 h-5" /> },
    { key: "journal", href: `/${locale}/payroll/journal`, label: "Lohnjournal", icon: <BookOpen className="w-5 h-5" /> },
    { key: "settings", href: `/${locale}/payroll/settings`, label: "Einstellungen", icon: <Settings className="w-5 h-5" /> },
  ];

  const sidebarHeader = (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
        <Wallet className="w-6 h-6 text-white" />
      </div>
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white">OpenPayroll</h2>
        <p className="text-xs text-gray-500">Lohnbuchhaltung</p>
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
