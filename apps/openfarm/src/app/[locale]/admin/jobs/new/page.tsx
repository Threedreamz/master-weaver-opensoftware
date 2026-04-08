import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { getModels } from "@/db/queries/models";
import { getPrinters } from "@/db/queries/printers";
import { getProfiles } from "@/db/queries/profiles";
import { getMaterials } from "@/db/queries/materials";
import { createJob } from "../actions";

interface NewJobPageProps {
  params: Promise<{ locale: string }>;
}

const TECH_BADGE: Record<string, { bg: string; label: string }> = {
  fdm: { bg: "bg-amber-100 text-amber-700", label: "FDM" },
  sla: { bg: "bg-purple-100 text-purple-700", label: "SLA" },
  sls: { bg: "bg-blue-100 text-blue-700", label: "SLS" },
};

export default async function NewJobPage({ params }: NewJobPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("jobs");
  const tc = await getTranslations("common");

  const [models, printers, profiles, materials] = await Promise.all([
    getModels(),
    getPrinters(),
    getProfiles(),
    getMaterials(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/admin/jobs`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          {tc("back")}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t("createJob")}</h1>
      </div>

      <form action={createJob} className="space-y-8">
        <input type="hidden" name="locale" value={locale} />

        {/* Basic Info */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Details</h2>
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
                placeholder="e.g. Enclosure Part A"
              />
            </div>

            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                Quantity
              </label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                min="1"
                defaultValue="1"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="modelId" className="block text-sm font-medium text-gray-700 mb-1">
                {t("model")} <span className="text-red-500">*</span>
              </label>
              <select
                id="modelId"
                name="modelId"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                <option value="">-- Select Model --</option>
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.filename} ({model.fileFormat.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="printerId" className="block text-sm font-medium text-gray-700 mb-1">
                {t("printer")}
              </label>
              <select
                id="printerId"
                name="printerId"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                <option value="">-- Auto-assign later --</option>
                {printers.map((printer) => (
                  <option key={printer.id} value={printer.id}>
                    {printer.name} [{printer.technology.toUpperCase()}]
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="profileId" className="block text-sm font-medium text-gray-700 mb-1">
                Profile
              </label>
              <select
                id="profileId"
                name="profileId"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                <option value="">-- No profile --</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name} [{profile.technology.toUpperCase()}]
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="materialId" className="block text-sm font-medium text-gray-700 mb-1">
                Material
              </label>
              <select
                id="materialId"
                name="materialId"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                <option value="">-- No material --</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name}{material.color ? ` (${material.color})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                <option value="0">Normal</option>
                <option value="-1">Low</option>
                <option value="1">High</option>
                <option value="2">Urgent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
            placeholder="Optional notes for this print job..."
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
            href={`/${locale}/admin/jobs`}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {tc("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}
