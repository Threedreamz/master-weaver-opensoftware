import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Trash2 } from "lucide-react";
import { getPrinterById } from "@/db/queries/printers";
import { updatePrinterAction, deletePrinterAction } from "./actions";

export const dynamic = "force-dynamic";

interface PrinterEditPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function PrinterEditPage({ params }: PrinterEditPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("printers");
  const tc = await getTranslations("common");

  const printer = await getPrinterById(id);
  if (!printer) notFound();

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
        <h1 className="text-2xl font-bold text-gray-900">Edit: {printer.name}</h1>
      </div>

      <form action={updatePrinterAction} className="space-y-8">
        <input type="hidden" name="id" value={printer.id} />
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
                defaultValue={printer.name}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
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
                defaultValue={printer.technology}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
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
                defaultValue={printer.protocol}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
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
                defaultValue={printer.make ?? ""}
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
                defaultValue={printer.model ?? ""}
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
                defaultValue={printer.serialNumber ?? ""}
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
                defaultValue={printer.ipAddress ?? ""}
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
                defaultValue={printer.port ?? ""}
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
                defaultValue={printer.apiKey ?? ""}
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
                defaultValue={printer.accessToken ?? ""}
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
                defaultValue={printer.buildVolumeX ?? ""}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
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
                defaultValue={printer.buildVolumeY ?? ""}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
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
                defaultValue={printer.buildVolumeZ ?? ""}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
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
                defaultValue={printer.nozzleDiameter ?? ""}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
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
            defaultValue={printer.notes ?? ""}
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

      {/* Delete Section */}
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-6">
        <h2 className="text-lg font-semibold text-red-900 mb-2">Danger Zone</h2>
        <p className="text-sm text-red-600 mb-4">
          Deleting a printer will remove it from the farm permanently. Active print jobs on this printer will lose their assignment.
        </p>
        <form action={deletePrinterAction}>
          <input type="hidden" name="id" value={printer.id} />
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Printer
          </button>
        </form>
      </div>
    </div>
  );
}
