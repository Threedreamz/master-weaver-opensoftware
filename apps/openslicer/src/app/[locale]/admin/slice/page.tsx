import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { SlicePageClient } from "./SlicePageClient";

interface SlicePageProps {
  params: Promise<{ locale: string }>;
}

export default async function SlicePage({ params }: SlicePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("slice");

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
      </div>

      <SlicePageClient
        labels={{
          uploadModel: t("uploadModel"),
          selectPrinter: t("selectPrinter"),
          sliceSettings: t("sliceSettings"),
          preview: t("preview"),
          previewPlaceholder: t("previewPlaceholder"),
        }}
      />
    </div>
  );
}
