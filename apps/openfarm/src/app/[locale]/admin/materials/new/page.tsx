import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import MaterialForm from "./MaterialForm";

interface NewMaterialPageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewMaterialPage({ params }: NewMaterialPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("materials");
  const tc = await getTranslations("common");

  const labels = {
    name: t("name"),
    technology: t("technology"),
    type: t("type"),
    manufacturer: t("manufacturer"),
    color: t("color"),
    colorHex: t("colorHex"),
    totalQuantity: t("totalQuantity"),
    unit: t("unit"),
    costPerUnit: t("costPerUnit"),
    diameter: t("diameter"),
    printTempMin: t("printTempMin"),
    printTempMax: t("printTempMax"),
    bedTempMin: t("bedTempMin"),
    bedTempMax: t("bedTempMax"),
    notes: t("notes"),
    basicInfo: t("basicInfo"),
    appearance: t("appearance"),
    inventory: t("inventory"),
    fdmProperties: t("fdmProperties"),
    submit: tc("save"),
    selectTechnology: t("selectTechnology"),
    selectUnit: t("selectUnit"),
    selectDiameter: t("selectDiameter"),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/admin/materials`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          {tc("back")}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t("addMaterial")}</h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-8">
        <MaterialForm locale={locale} labels={labels} />
      </div>
    </div>
  );
}
