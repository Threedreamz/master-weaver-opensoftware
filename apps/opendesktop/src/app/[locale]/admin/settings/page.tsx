import { getTranslations, setRequestLocale } from "next-intl/server";
import { Settings } from "lucide-react";

interface SettingsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("settings");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings size={24} className="text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("description")}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <Settings size={48} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-lg font-semibold text-gray-700 mb-2">{t("comingSoon")}</h2>
        <p className="text-sm text-gray-400 max-w-sm mx-auto">
          {t("comingSoonDescription")}
        </p>
      </div>
    </div>
  );
}
