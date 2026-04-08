import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { deskInventoryLinks, deskPrinterLinks } from "@/db/schema";
import { sql } from "drizzle-orm";
import { Link2, Package, Printer, RefreshCw } from "lucide-react";

interface IntegrationsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function IntegrationsPage({ params }: IntegrationsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("integrations");

  const [inventoryCountResult, printerCountResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(deskInventoryLinks),
    db.select({ count: sql<number>`count(*)` }).from(deskPrinterLinks),
  ]);

  const inventoryCount = inventoryCountResult[0]?.count ?? 0;
  const printerCount = printerCountResult[0]?.count ?? 0;

  // Find most recent sync times from the link tables
  const [latestInventorySync, latestPrinterSync] = await Promise.all([
    db.query.deskInventoryLinks.findFirst({
      orderBy: (l, { desc }) => [desc(l.lastSyncAt)],
    }),
    db.query.deskPrinterLinks.findFirst({
      orderBy: (l, { desc }) => [desc(l.lastSyncAt)],
    }),
  ]);

  function formatDate(date: Date | null | undefined): string {
    if (!date) return t("neverSynced");
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link2 size={24} className="text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("description")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* OpenInventory Card */}
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Package size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-blue-900">OpenInventory</h2>
                <p className="text-xs text-blue-600">{t("inventoryIntegration")}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              {t("connected")}
            </span>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700">{t("linkedItems")}</span>
              <span className="font-bold text-blue-900">{inventoryCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700">{t("lastSync")}</span>
              <span className="text-blue-800 font-medium">
                {formatDate(latestInventorySync?.lastSyncAt ?? null)}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors opacity-60 cursor-not-allowed"
            disabled
            title={t("syncComingSoon")}
          >
            <RefreshCw size={14} />
            {t("sync")}
          </button>
          <p className="text-xs text-blue-500 mt-2">{t("syncComingSoon")}</p>
        </div>

        {/* OpenFarm Card */}
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
                <Printer size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-amber-900">OpenFarm</h2>
                <p className="text-xs text-amber-600">{t("farmIntegration")}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              {t("connected")}
            </span>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-amber-700">{t("linkedPrinters")}</span>
              <span className="font-bold text-amber-900">{printerCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-amber-700">{t("lastSync")}</span>
              <span className="text-amber-800 font-medium">
                {formatDate(latestPrinterSync?.lastSyncAt ?? null)}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors opacity-60 cursor-not-allowed"
            disabled
            title={t("syncComingSoon")}
          >
            <RefreshCw size={14} />
            {t("sync")}
          </button>
          <p className="text-xs text-amber-500 mt-2">{t("syncComingSoon")}</p>
        </div>
      </div>
    </div>
  );
}
