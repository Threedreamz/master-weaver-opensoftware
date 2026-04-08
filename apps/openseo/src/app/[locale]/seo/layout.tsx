import {
  Search,
  LayoutDashboard,
  FileSearch,
  Gauge,
  Tags,
  TrendingUp,
  Globe,
  BarChart3,
  MousePointerClick,
  Filter,
  GitBranch,
  Users,
  Activity,
  Map,
  Bot,
  ArrowRight,
} from "lucide-react";
import { AppShell, Sidebar, type SidebarItem } from "@opensoftware/ui";
import { setRequestLocale } from "next-intl/server";
import { SessionGuard } from "@/components/auth/SessionGuard";

export default async function SeoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const navItems: SidebarItem[] = [
    { key: "dashboard", href: `/${locale}/seo`, label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" />, exact: true },
    { key: "audit", href: `/${locale}/seo/audit`, label: "Audit", icon: <FileSearch className="w-5 h-5" /> },
    { key: "pagespeed", href: `/${locale}/seo/pagespeed`, label: "PageSpeed", icon: <Gauge className="w-5 h-5" /> },
    { key: "meta", href: `/${locale}/seo/meta`, label: "Meta Tags", icon: <Tags className="w-5 h-5" /> },
    { key: "rankings", href: `/${locale}/seo/rankings`, label: "Rankings", icon: <TrendingUp className="w-5 h-5" /> },
    { key: "semrush", href: `/${locale}/seo/semrush`, label: "Semrush", icon: <Globe className="w-5 h-5" /> },
    { key: "sitemap", href: `/${locale}/seo/sitemap`, label: "Sitemap", icon: <Map className="w-5 h-5" /> },
    { key: "robots", href: `/${locale}/seo/robots`, label: "Robots.txt", icon: <Bot className="w-5 h-5" /> },
    { key: "redirects", href: `/${locale}/seo/redirects`, label: "Redirects", icon: <ArrowRight className="w-5 h-5" /> },
    { key: "analytics", href: `/${locale}/seo/analytics`, label: "Analytics Dashboard", icon: <BarChart3 className="w-5 h-5" />, exact: true },
    { key: "events", href: `/${locale}/seo/analytics/events`, label: "Events", icon: <MousePointerClick className="w-5 h-5" /> },
    { key: "funnels", href: `/${locale}/seo/analytics/funnels`, label: "Funnels", icon: <Filter className="w-5 h-5" /> },
    { key: "attribution", href: `/${locale}/seo/analytics/attribution`, label: "Attribution", icon: <GitBranch className="w-5 h-5" /> },
    { key: "cohorts", href: `/${locale}/seo/analytics/cohorts`, label: "Cohorts", icon: <Users className="w-5 h-5" /> },
    { key: "performance", href: `/${locale}/seo/analytics/performance`, label: "Performance", icon: <Activity className="w-5 h-5" /> },
  ];

  const sidebarHeader = (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
        <Search className="w-6 h-6 text-white" />
      </div>
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white">OpenSEO</h2>
        <p className="text-xs text-gray-500">SEO & Analytics</p>
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
