import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { createWorkstation } from "../actions";

interface NewWorkstationPageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewWorkstationPage({ params }: NewWorkstationPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("workstations");
  const tc = await getTranslations("common");

  const zones = await db.query.deskZones.findMany({
    with: {
      building: true,
    },
    orderBy: (z, { asc }) => [asc(z.name)],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/admin/workstations`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          {tc("back")}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t("addWorkstation")}</h1>
      </div>

      <form action={createWorkstation} className="space-y-6">
        <input type="hidden" name="locale" value={locale} />

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Grundinformationen</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                {t("code")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="code"
                name="code"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                placeholder="WS-SCAN-01"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                {t("name")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                placeholder="z.B. Scan-Station Eingang"
              />
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                {t("type")} <span className="text-red-500">*</span>
              </label>
              <select
                id="type"
                name="type"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- Auswahl --</option>
                <option value="scanning">{t("scanning")}</option>
                <option value="cad">{t("cad")}</option>
                <option value="printing">{t("printing")}</option>
                <option value="quality_check">{t("quality_check")}</option>
                <option value="packaging">{t("packaging")}</option>
                <option value="assembly">{t("assembly")}</option>
                <option value="office">{t("office")}</option>
                <option value="general">{t("general")}</option>
              </select>
            </div>

            <div>
              <label htmlFor="zoneId" className="block text-sm font-medium text-gray-700 mb-1">
                {t("zone")} <span className="text-red-500">*</span>
              </label>
              <select
                id="zoneId"
                name="zoneId"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- Bereich auswaehlen --</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.building?.name ? `${zone.building.name} › ` : ""}{zone.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Optionale Angaben</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                {t("description")}
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                placeholder="Optionale Beschreibung des Arbeitsplatzes..."
              />
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                {t("tags")}
              </label>
              <input
                type="text"
                id="tags"
                name="tags"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                placeholder="z.B. produktion, schicht-a, kritisch (kommagetrennt)"
              />
              <p className="text-xs text-gray-400 mt-1">Mehrere Tags durch Komma trennen</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            {tc("save")}
          </button>
          <Link
            href={`/${locale}/admin/workstations`}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {tc("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}
