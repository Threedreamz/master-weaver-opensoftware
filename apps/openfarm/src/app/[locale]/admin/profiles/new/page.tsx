import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { createProfile } from "../actions";

interface NewProfilePageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewProfilePage({ params }: NewProfilePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("profiles");
  const tc = await getTranslations("common");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/admin/profiles`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          {tc("back")}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t("addProfile")}</h1>
      </div>

      <form action={createProfile} className="space-y-8">
        <input type="hidden" name="locale" value={locale} />
        {/* Basic Info */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Grundinformationen</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                placeholder="z.B. PLA Standard 0.2mm"
              />
            </div>

            <div>
              <label htmlFor="technology" className="block text-sm font-medium text-gray-700 mb-1">
                {t("technology")} <span className="text-red-500">*</span>
              </label>
              <select
                id="technology"
                name="technology"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                <option value="">-- Auswahl --</option>
                <option value="fdm">{tc("fdm")}</option>
                <option value="sla">{tc("sla")}</option>
                <option value="sls">{tc("sls")}</option>
              </select>
            </div>

            <div>
              <label htmlFor="slicerEngine" className="block text-sm font-medium text-gray-700 mb-1">
                {t("slicerEngine")} <span className="text-red-500">*</span>
              </label>
              <select
                id="slicerEngine"
                name="slicerEngine"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                <option value="">-- Auswahl --</option>
                <option value="prusaslicer">PrusaSlicer</option>
                <option value="orcaslicer">OrcaSlicer</option>
                <option value="bambu_studio">Bambu Studio</option>
                <option value="preform">PreForm</option>
                <option value="chitubox">ChiTuBox</option>
                <option value="lychee">Lychee Slicer</option>
                <option value="sls4all">SLS4All</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                {t("description")}
              </label>
              <textarea
                id="description"
                name="description"
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                placeholder="Optionale Beschreibung des Profils..."
              />
            </div>
          </div>
        </div>

        {/* Print Parameters */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Druckparameter</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="layerHeight" className="block text-sm font-medium text-gray-700 mb-1">
                {t("layerHeight")} (mm)
              </label>
              <input
                type="number"
                id="layerHeight"
                name="layerHeight"
                step="0.01"
                min="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                placeholder="0.2"
              />
            </div>

            <div>
              <label htmlFor="nozzleDiameter" className="block text-sm font-medium text-gray-700 mb-1">
                {t("nozzleDiameter")} (mm)
              </label>
              <input
                type="number"
                id="nozzleDiameter"
                name="nozzleDiameter"
                step="0.05"
                min="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                placeholder="0.4"
              />
              <p className="text-xs text-gray-400 mt-1">Nur FDM</p>
            </div>

            <div>
              <label htmlFor="infillDensity" className="block text-sm font-medium text-gray-700 mb-1">
                {t("infillDensity")} (%)
              </label>
              <input
                type="number"
                id="infillDensity"
                name="infillDensity"
                min="0"
                max="100"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                placeholder="20"
              />
              <p className="text-xs text-gray-400 mt-1">Nur FDM</p>
            </div>
          </div>
        </div>

        {/* Advanced Config */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Konfiguration (JSON)</h2>
          <textarea
            id="config"
            name="config"
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
            placeholder='{}'
          />
          <p className="text-xs text-gray-400 mt-1">Optionale erweiterte Konfiguration als JSON-Objekt</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center rounded-lg bg-amber-500 px-6 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
          >
            {tc("save")}
          </button>
          <Link
            href={`/${locale}/admin/profiles`}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {tc("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}
