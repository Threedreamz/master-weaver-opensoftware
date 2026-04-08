import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { createPrinter } from "../actions";

interface NewPrinterPageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewPrinterPage({ params }: NewPrinterPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("printers");
  const tc = await getTranslations("common");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/admin/printers`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          {tc("back")}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t("addPrinter")}</h1>
      </div>

      <form action={createPrinter} className="space-y-8">
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
                placeholder="z.B. Prusa MK4 #1"
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
              <label htmlFor="protocol" className="block text-sm font-medium text-gray-700 mb-1">
                {t("protocol")} <span className="text-red-500">*</span>
              </label>
              <select
                id="protocol"
                name="protocol"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                <option value="">-- Auswahl --</option>
                <option value="moonraker">Moonraker</option>
                <option value="octoprint">OctoPrint</option>
                <option value="bambu_mqtt">Bambu MQTT</option>
                <option value="bambu_cloud">Bambu Cloud</option>
                <option value="formlabs_local">Formlabs Local</option>
                <option value="formlabs_cloud">Formlabs Cloud</option>
                <option value="sls4all">SLS4All</option>
                <option value="manual">Manuell</option>
              </select>
            </div>

            <div>
              <label htmlFor="make" className="block text-sm font-medium text-gray-700 mb-1">
                Hersteller
              </label>
              <input
                type="text"
                id="make"
                name="make"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                placeholder="z.B. Prusa, Bambu Lab"
              />
            </div>

            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                Modell
              </label>
              <input
                type="text"
                id="model"
                name="model"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                placeholder="z.B. MK4, X1 Carbon"
              />
            </div>

            <div>
              <label htmlFor="serialNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Seriennummer
              </label>
              <input
                type="text"
                id="serialNumber"
                name="serialNumber"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Connection */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Verbindung</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ipAddress" className="block text-sm font-medium text-gray-700 mb-1">
                IP-Adresse
              </label>
              <input
                type="text"
                id="ipAddress"
                name="ipAddress"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                placeholder="z.B. 192.168.1.100"
              />
            </div>

            <div>
              <label htmlFor="port" className="block text-sm font-medium text-gray-700 mb-1">
                Port
              </label>
              <input
                type="number"
                id="port"
                name="port"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                placeholder="z.B. 7125"
              />
            </div>

            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="text"
                id="apiKey"
                name="apiKey"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="accessToken" className="block text-sm font-medium text-gray-700 mb-1">
                Access Token
              </label>
              <input
                type="text"
                id="accessToken"
                name="accessToken"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Build Volume */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bauraum</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="buildVolumeX" className="block text-sm font-medium text-gray-700 mb-1">
                X (mm)
              </label>
              <input
                type="number"
                id="buildVolumeX"
                name="buildVolumeX"
                step="0.1"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                placeholder="250"
              />
            </div>

            <div>
              <label htmlFor="buildVolumeY" className="block text-sm font-medium text-gray-700 mb-1">
                Y (mm)
              </label>
              <input
                type="number"
                id="buildVolumeY"
                name="buildVolumeY"
                step="0.1"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                placeholder="210"
              />
            </div>

            <div>
              <label htmlFor="buildVolumeZ" className="block text-sm font-medium text-gray-700 mb-1">
                Z (mm)
              </label>
              <input
                type="number"
                id="buildVolumeZ"
                name="buildVolumeZ"
                step="0.1"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                placeholder="210"
              />
            </div>

            <div>
              <label htmlFor="nozzleDiameter" className="block text-sm font-medium text-gray-700 mb-1">
                Nozzle (mm)
              </label>
              <input
                type="number"
                id="nozzleDiameter"
                name="nozzleDiameter"
                step="0.05"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                placeholder="0.4"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notizen</h2>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
            placeholder="Optionale Notizen zum Drucker..."
          />
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
            href={`/${locale}/admin/printers`}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {tc("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}
