import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { ImageUpload } from "@/components/ImageUpload";
import { LithoConfigForm } from "@/components/LithoConfigForm";

interface LitophanePageProps {
  params: Promise<{ locale: string }>;
}

export default async function LitophanePage({ params }: LitophanePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("litophane");

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
      </div>

      {/* Image Upload */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">{t("uploadImage")}</h2>
        <ImageUpload />
      </section>

      {/* Config */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">{t("settings")}</h2>
        <LithoConfigForm />
      </section>

      {/* Filament Info */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">{t("filamentInfo")}</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-600 mb-3">{t("bambuCmykDefaults")}</p>
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <div className="w-full h-8 rounded bg-cyan-500 mb-1" />
              <span className="text-xs text-gray-500">Cyan (C)</span>
            </div>
            <div className="text-center">
              <div className="w-full h-8 rounded bg-pink-500 mb-1" />
              <span className="text-xs text-gray-500">Magenta (M)</span>
            </div>
            <div className="text-center">
              <div className="w-full h-8 rounded bg-yellow-400 mb-1" />
              <span className="text-xs text-gray-500">Yellow (Y)</span>
            </div>
            <div className="text-center">
              <div className="w-full h-8 rounded bg-gray-900 mb-1" />
              <span className="text-xs text-gray-500">Key (K)</span>
            </div>
          </div>
        </div>
      </section>

      {/* CMYK Channel Preview Placeholder */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">{t("cmykPreview")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {["C", "M", "Y", "K"].map((channel) => (
            <div
              key={channel}
              className="rounded-xl border border-dashed border-gray-300 bg-gray-50 h-40 flex items-center justify-center"
            >
              <p className="text-gray-400 text-sm">{channel} Channel</p>
            </div>
          ))}
        </div>
      </section>

      {/* Generate + Download */}
      <section className="flex items-center gap-4">
        <button
          type="button"
          className="px-6 py-2.5 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
        >
          {t("generate")}
        </button>
        <button
          type="button"
          disabled
          className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-400 font-medium cursor-not-allowed"
        >
          {t("downloadStl")}
        </button>
      </section>
    </div>
  );
}
