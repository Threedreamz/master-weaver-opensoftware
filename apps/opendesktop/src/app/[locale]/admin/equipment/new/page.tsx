import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { createEquipment } from "../actions";

interface NewEquipmentPageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewEquipmentPage({ params }: NewEquipmentPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("equipment");
  const tc = await getTranslations("common");

  const workstations = await db.query.deskWorkstations.findMany({
    orderBy: (ws, { asc }) => [asc(ws.code)],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/admin/equipment`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          {tc("back")}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t("addEquipment")}</h1>
      </div>

      <form action={createEquipment} className="space-y-6">
        <input type="hidden" name="locale" value={locale} />

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Geraet erfassen</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                placeholder="z.B. Dell Monitor 27&quot;"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                {t("category")} <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                name="category"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- Auswahl --</option>
                <option value="computer">{t("computer")}</option>
                <option value="monitor">{t("monitor")}</option>
                <option value="scanner_3d">{t("scanner_3d")}</option>
                <option value="printer_3d">{t("printer_3d")}</option>
                <option value="tool">{t("tool")}</option>
                <option value="measurement">{t("measurement")}</option>
                <option value="safety">{t("safety")}</option>
                <option value="furniture">{t("furniture")}</option>
                <option value="other">{t("other")}</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="workstationId" className="block text-sm font-medium text-gray-700 mb-1">
                {t("workstation")} <span className="text-red-500">*</span>
              </label>
              <select
                id="workstationId"
                name="workstationId"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- Arbeitsplatz auswaehlen --</option>
                {workstations.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.code} — {ws.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="serialNumber" className="block text-sm font-medium text-gray-700 mb-1">
                {t("serialNumber")}
              </label>
              <input
                type="text"
                id="serialNumber"
                name="serialNumber"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                placeholder="z.B. SN-12345678"
              />
            </div>

            <div>
              <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700 mb-1">
                {t("purchaseDate")}
              </label>
              <input
                type="date"
                id="purchaseDate"
                name="purchaseDate"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="warrantyUntil" className="block text-sm font-medium text-gray-700 mb-1">
                {t("warrantyUntil")}
              </label>
              <input
                type="date"
                id="warrantyUntil"
                name="warrantyUntil"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                {t("notes")}
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                placeholder="Optionale Notizen zum Geraet..."
              />
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
            href={`/${locale}/admin/equipment`}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {tc("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}
