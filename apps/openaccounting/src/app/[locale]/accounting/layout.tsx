import {
  Calculator,
  LayoutDashboard,
  Users,
  FileText,
  ArrowLeftRight,
  BookOpen,
  Link2,
  FolderOpen,
  ListTree,
  Truck,
  BarChart3,
  Download,
  Settings,
  Upload,
  FileSpreadsheet,
  Receipt,
  MessageSquare,
  FileCheck,
  ShoppingCart,
  FileX,
  Bell,
  CreditCard,
  Package,
  Building,
  Building2,
  Map,
  CalendarCheck,
  Shield,
  Bot,
} from "lucide-react";
import { AppShell, Sidebar, type SidebarItem } from "@opensoftware/ui";
import { setRequestLocale } from "next-intl/server";
import { SessionGuard } from "@/components/auth/SessionGuard";

export default async function AccountingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const navItems: SidebarItem[] = [
    // Uebersicht
    { key: "dashboard", href: `/${locale}/accounting`, label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" />, exact: true },

    // Vertrieb (Sales)
    { key: "customers", href: `/${locale}/accounting/customers`, label: "Customers", icon: <Users className="w-5 h-5" /> },
    { key: "inquiries", href: `/${locale}/accounting/inquiries`, label: "Inquiries", icon: <MessageSquare className="w-5 h-5" /> },
    { key: "quotes", href: `/${locale}/accounting/quotes`, label: "Quotes", icon: <FileCheck className="w-5 h-5" /> },
    { key: "orders", href: `/${locale}/accounting/orders`, label: "Orders", icon: <ShoppingCart className="w-5 h-5" /> },
    { key: "invoices", href: `/${locale}/accounting/invoices`, label: "Invoices", icon: <FileText className="w-5 h-5" /> },
    { key: "credit-notes", href: `/${locale}/accounting/credit-notes`, label: "Credit Notes", icon: <FileX className="w-5 h-5" /> },
    { key: "reminders", href: `/${locale}/accounting/reminders`, label: "Reminders", icon: <Bell className="w-5 h-5" /> },
    { key: "payments", href: `/${locale}/accounting/payments`, label: "Payments", icon: <CreditCard className="w-5 h-5" /> },
    { key: "shipping", href: `/${locale}/accounting/shipping`, label: "Shipping", icon: <Package className="w-5 h-5" /> },

    // Buchhaltung (Accounting)
    { key: "transactions", href: `/${locale}/accounting/transactions`, label: "Transactions", icon: <ArrowLeftRight className="w-5 h-5" /> },
    { key: "import", href: `/${locale}/accounting/import`, label: "Bank Import", icon: <Upload className="w-5 h-5" /> },
    { key: "booking", href: `/${locale}/accounting/booking`, label: "Booking", icon: <BookOpen className="w-5 h-5" /> },
    { key: "matching", href: `/${locale}/accounting/matching`, label: "Matching", icon: <Link2 className="w-5 h-5" /> },
    { key: "documents", href: `/${locale}/accounting/documents`, label: "Documents", icon: <FolderOpen className="w-5 h-5" /> },
    { key: "kontenplan", href: `/${locale}/accounting/kontenplan`, label: "Kontenplan", icon: <ListTree className="w-5 h-5" /> },
    { key: "suppliers", href: `/${locale}/accounting/suppliers`, label: "Suppliers", icon: <Truck className="w-5 h-5" /> },
    { key: "business-checker", href: `/${locale}/accounting/business-checker`, label: "Business Checker", icon: <Building className="w-5 h-5" /> },
    { key: "market-map", href: "http://localhost:4175", label: "OpenMaps \u2197", icon: <Map className="w-5 h-5" /> },

    // Berichte (Reports)
    { key: "reports", href: `/${locale}/accounting/reports`, label: "Reports", icon: <BarChart3 className="w-5 h-5" /> },
    { key: "vat", href: `/${locale}/accounting/reports/vat`, label: "VAT Return", icon: <Receipt className="w-5 h-5" /> },
    { key: "fixed-assets", href: `/${locale}/accounting/fixed-assets`, label: "Fixed Assets", icon: <Building2 className="w-5 h-5" /> },
    { key: "year-end", href: `/${locale}/accounting/year-end`, label: "Year-End", icon: <CalendarCheck className="w-5 h-5" /> },

    // Export & Tools
    { key: "export", href: `/${locale}/accounting/export`, label: "Export", icon: <Download className="w-5 h-5" /> },
    { key: "datev", href: `/${locale}/accounting/export/datev`, label: "DATEV Export", icon: <FileSpreadsheet className="w-5 h-5" /> },
    { key: "compliance", href: `/${locale}/accounting/compliance`, label: "Compliance", icon: <Shield className="w-5 h-5" /> },
    { key: "ai-agents", href: `/${locale}/accounting/ai-agents`, label: "KI-Berater", icon: <Bot className="w-5 h-5" /> },
    { key: "settings", href: `/${locale}/accounting/settings`, label: "Settings", icon: <Settings className="w-5 h-5" /> },
  ];

  const sidebarHeader = (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
        <Calculator className="w-6 h-6 text-white" />
      </div>
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white">OpenAccounting</h2>
        <p className="text-xs text-gray-500">Double-Entry Bookkeeping</p>
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
