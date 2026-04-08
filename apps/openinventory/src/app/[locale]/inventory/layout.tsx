import {
  Package,
  LayoutDashboard,
  BoxIcon,
  Tags,
  Truck,
  ShoppingCart,
  PackageCheck,
  Warehouse,
  Factory,
  Settings,
} from "lucide-react";
import { AppShell, Sidebar, type SidebarItem } from "@opensoftware/ui";
import { setRequestLocale } from "next-intl/server";
import { SessionGuard } from "@/components/auth/SessionGuard";

export default async function InventoryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const navItems: SidebarItem[] = [
    { key: "dashboard", href: `/${locale}/inventory`, label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" />, exact: true },
    { key: "articles", href: `/${locale}/inventory/articles`, label: "Artikel", icon: <BoxIcon className="w-5 h-5" /> },
    { key: "categories", href: `/${locale}/inventory/categories`, label: "Kategorien", icon: <Tags className="w-5 h-5" /> },
    { key: "suppliers", href: `/${locale}/inventory/suppliers`, label: "Lieferanten", icon: <Truck className="w-5 h-5" /> },
    { key: "orders", href: `/${locale}/inventory/orders`, label: "Bestellungen", icon: <ShoppingCart className="w-5 h-5" /> },
    { key: "goods-receipt", href: `/${locale}/inventory/goods-receipt`, label: "Wareneingang", icon: <PackageCheck className="w-5 h-5" /> },
    { key: "warehouse", href: `/${locale}/inventory/warehouse`, label: "Lager", icon: <Warehouse className="w-5 h-5" /> },
    { key: "production", href: `/${locale}/inventory/production`, label: "Produktion", icon: <Factory className="w-5 h-5" /> },
    { key: "settings", href: `/${locale}/inventory/settings`, label: "Einstellungen", icon: <Settings className="w-5 h-5" /> },
  ];

  const sidebarHeader = (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
        <Package className="w-6 h-6 text-white" />
      </div>
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white">OpenInventory</h2>
        <p className="text-xs text-gray-500">Warenwirtschaft</p>
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
