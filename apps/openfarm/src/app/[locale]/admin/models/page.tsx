import { getTranslations, setRequestLocale } from "next-intl/server";
import { getModels } from "@/db/queries/models";
import { formatBytes } from "@/lib/format-bytes";
import { uploadModel, deleteModel } from "./actions";
import { Box, Upload, Trash2 } from "lucide-react";
import Link from "next/link";

interface ModelsPageProps {
  params: Promise<{ locale: string }>;
}

const FORMAT_COLORS: Record<string, string> = {
  stl: "bg-blue-100 text-blue-700",
  "3mf": "bg-green-100 text-green-700",
  obj: "bg-purple-100 text-purple-700",
  step: "bg-orange-100 text-orange-700",
};

export default async function ModelsPage({ params }: ModelsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("models");
  const allModels = await getModels();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
      </div>

      {/* Upload Form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Upload size={20} />
          {t("upload")}
        </h2>
        <form action={uploadModel} encType="multipart/form-data">
          <input type="hidden" name="locale" value={locale} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                {t("name")}
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                placeholder={t("namePlaceholder")}
              />
            </div>
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
                {t("file")}
              </label>
              <input
                type="file"
                id="file"
                name="file"
                required
                accept=".stl,.3mf,.obj,.step"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-amber-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-amber-700 hover:file:bg-amber-100"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                {t("description")}
              </label>
              <input
                type="text"
                id="description"
                name="description"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                placeholder={t("descriptionPlaceholder")}
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
            >
              <Upload size={16} />
              {t("uploadButton")}
            </button>
          </div>
        </form>
      </div>

      {/* Model Library */}
      {allModels.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Box size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-2">{t("noModels")}</p>
          <p className="text-xs text-gray-400">{t("supportedFormats")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allModels.map((model) => (
            <div
              key={model.id}
              className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <Link href={`/${locale}/admin/models/${model.id}`} className="font-semibold text-gray-900 truncate hover:text-amber-600 transition-colors">
                    {model.name}
                  </Link>
                  <p className="text-xs text-gray-500 mt-1 truncate">{model.filename}</p>
                </div>
                <span
                  className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium uppercase ${FORMAT_COLORS[model.fileFormat] || "bg-gray-100 text-gray-700"}`}
                >
                  {model.fileFormat}
                </span>
              </div>
              {model.description && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{model.description}</p>
              )}
              <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                <span>{formatBytes(model.fileSizeBytes)}</span>
                <span>
                  {model.createdAt instanceof Date
                    ? model.createdAt.toLocaleDateString()
                    : new Date(model.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="mt-3 border-t border-gray-100 pt-3">
                <form action={deleteModel}>
                  <input type="hidden" name="id" value={model.id} />
                  <input type="hidden" name="locale" value={locale} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 size={14} />
                    {t("delete")}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
