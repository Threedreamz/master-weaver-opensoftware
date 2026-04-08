import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Droplets } from "lucide-react";

interface SlaPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SlaPage({ params }: SlaPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sla");

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
      </div>

      <div className="rounded-xl border border-dashed border-purple-300 bg-purple-50 p-12 flex flex-col items-center justify-center text-center">
        <Droplets size={48} className="text-purple-400 mb-4" />
        <h2 className="text-lg font-semibold text-purple-700 mb-2">{t("comingSoon")}</h2>
        <p className="text-sm text-purple-500 max-w-sm">
          {t("comingSoonDescription")}
        </p>
      </div>
    </div>
  );
}
