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
  Target,
  Ban,
  AlertTriangle,
  MessageSquareText,
  Award,
  Palette,
  Clock,
  Zap,
  DollarSign,
  MapPin,
  Smartphone,
  Lightbulb,
  SearchX,
  Settings,
} from "lucide-react";
import { AppShell, Sidebar, type SidebarSection } from "@opensoftware/ui";
import { setRequestLocale } from "next-intl/server";
import { SessionGuard } from "@/components/auth/SessionGuard";

export default async function SemLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sections: SidebarSection[] = [
    {
      key: "section-organic",
      label: "Organic SEO",
      items: [
        { key: "organic-dashboard", href: `/${locale}/sem/organic`, label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" />, exact: true },
        { key: "audit", href: `/${locale}/sem/organic/audit`, label: "Audit", icon: <FileSearch className="w-5 h-5" /> },
        { key: "pagespeed", href: `/${locale}/sem/organic/pagespeed`, label: "PageSpeed", icon: <Gauge className="w-5 h-5" /> },
        { key: "meta", href: `/${locale}/sem/organic/meta`, label: "Meta Tags", icon: <Tags className="w-5 h-5" /> },
        { key: "rankings", href: `/${locale}/sem/organic/rankings`, label: "Rankings", icon: <TrendingUp className="w-5 h-5" /> },
        { key: "semrush", href: `/${locale}/sem/organic/semrush`, label: "Semrush", icon: <Globe className="w-5 h-5" /> },
        { key: "sitemap", href: `/${locale}/sem/organic/sitemap`, label: "Sitemap", icon: <Map className="w-5 h-5" /> },
        { key: "robots", href: `/${locale}/sem/organic/robots`, label: "Robots.txt", icon: <Bot className="w-5 h-5" /> },
        { key: "redirects", href: `/${locale}/sem/organic/redirects`, label: "Redirects", icon: <ArrowRight className="w-5 h-5" /> },
      ],
    },
    {
      key: "section-paid",
      label: "Paid Search",
      items: [
        { key: "paid-dashboard", href: `/${locale}/sem/paid`, label: "SERP Dominance", icon: <Target className="w-5 h-5" />, exact: true },
        { key: "keyword-bridge", href: `/${locale}/sem/paid/keyword-bridge`, label: "Keyword Bridge", icon: <GitBranch className="w-5 h-5" /> },
        { key: "negative-keywords", href: `/${locale}/sem/paid/negative-keywords`, label: "Negative Keywords", icon: <Ban className="w-5 h-5" /> },
        { key: "cannibalization", href: `/${locale}/sem/paid/cannibalization`, label: "Cannibalization", icon: <AlertTriangle className="w-5 h-5" /> },
        { key: "search-terms", href: `/${locale}/sem/paid/search-terms`, label: "Search Terms", icon: <MessageSquareText className="w-5 h-5" /> },
        { key: "quality-score", href: `/${locale}/sem/paid/quality-score`, label: "Quality Score", icon: <Award className="w-5 h-5" /> },
        { key: "asset-lab", href: `/${locale}/sem/paid/asset-lab`, label: "Asset Lab", icon: <Palette className="w-5 h-5" /> },
        { key: "dayparting", href: `/${locale}/sem/paid/dayparting`, label: "Dayparting", icon: <Clock className="w-5 h-5" /> },
        { key: "automation", href: `/${locale}/sem/paid/automation`, label: "Automation", icon: <Zap className="w-5 h-5" /> },
      ],
    },
    {
      key: "section-intelligence",
      label: "Intelligence",
      items: [
        { key: "competitors", href: `/${locale}/sem/intelligence/competitors`, label: "Competitors", icon: <Users className="w-5 h-5" /> },
        { key: "budget", href: `/${locale}/sem/intelligence/budget`, label: "Budget Intelligence", icon: <DollarSign className="w-5 h-5" /> },
        { key: "landing-page-score", href: `/${locale}/sem/intelligence/landing-page-score`, label: "Landing Page Score", icon: <Award className="w-5 h-5" /> },
        { key: "keyword-gaps", href: `/${locale}/sem/intelligence/keyword-gaps`, label: "Keyword Gaps", icon: <SearchX className="w-5 h-5" /> },
        { key: "geo", href: `/${locale}/sem/intelligence/geo`, label: "Geo Intelligence", icon: <MapPin className="w-5 h-5" /> },
        { key: "device-strategy", href: `/${locale}/sem/intelligence/device-strategy`, label: "Device Strategy", icon: <Smartphone className="w-5 h-5" /> },
        { key: "recommendations", href: `/${locale}/sem/intelligence/recommendations`, label: "Recommendations", icon: <Lightbulb className="w-5 h-5" /> },
      ],
    },
    {
      key: "section-analytics",
      label: "Analytics",
      items: [
        { key: "analytics-dashboard", href: `/${locale}/sem/analytics`, label: "Dashboard", icon: <BarChart3 className="w-5 h-5" />, exact: true },
        { key: "events", href: `/${locale}/sem/analytics/events`, label: "Events", icon: <MousePointerClick className="w-5 h-5" /> },
        { key: "funnels", href: `/${locale}/sem/analytics/funnels`, label: "Funnels", icon: <Filter className="w-5 h-5" /> },
        { key: "attribution", href: `/${locale}/sem/analytics/attribution`, label: "Attribution", icon: <GitBranch className="w-5 h-5" /> },
        { key: "cohorts", href: `/${locale}/sem/analytics/cohorts`, label: "Cohorts", icon: <Users className="w-5 h-5" /> },
        { key: "performance", href: `/${locale}/sem/analytics/performance`, label: "Performance", icon: <Activity className="w-5 h-5" /> },
      ],
    },
    {
      key: "section-settings",
      label: "Settings",
      items: [
        { key: "settings", href: `/${locale}/sem/settings`, label: "Integrations", icon: <Settings className="w-5 h-5" /> },
      ],
    },
  ];

  const sidebarHeader = (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
        <Search className="w-6 h-6 text-white" />
      </div>
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white">OpenSEM</h2>
        <p className="text-xs text-gray-500">Search Engine Marketing</p>
      </div>
    </div>
  );

  return (
    <SessionGuard requiredRole="viewer">
      <AppShell sidebar={<Sidebar sections={sections} header={sidebarHeader} />}>
        {children}
      </AppShell>
    </SessionGuard>
  );
}
