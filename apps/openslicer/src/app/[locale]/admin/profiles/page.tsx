import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Settings, Plus } from "lucide-react";

interface ProfilesPageProps {
  params: Promise<{ locale: string }>;
}

const MOCK_PROFILES = [
  { id: "1", name: "PLA Standard", layerHeight: 0.2, infill: 20, speed: 60, technology: "FDM" },
  { id: "2", name: "PLA Fine Detail", layerHeight: 0.1, infill: 30, speed: 40, technology: "FDM" },
  { id: "3", name: "PETG Functional", layerHeight: 0.25, infill: 40, speed: 50, technology: "FDM" },
  { id: "4", name: "TPU Flexible", layerHeight: 0.2, infill: 15, speed: 25, technology: "FDM" },
];

export default async function ProfilesPage({ params }: ProfilesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("profiles");

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          <Plus size={16} />
          {t("addProfile")}
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t("name")}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t("technology")}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t("layerHeight")}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t("infill")}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t("speed")}</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_PROFILES.map((profile) => (
              <tr key={profile.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{profile.name}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                    {profile.technology}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{profile.layerHeight} mm</td>
                <td className="px-4 py-3 text-gray-600">{profile.infill}%</td>
                <td className="px-4 py-3 text-gray-600">{profile.speed} mm/s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
