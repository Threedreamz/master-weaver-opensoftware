import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { MonitoringDashboard } from "@/components/admin/monitoring/MonitoringDashboard";

export const dynamic = "force-dynamic";

export default async function MonitoringPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("monitoring");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
      </div>

      <MonitoringDashboard />
    </div>
  );
}
