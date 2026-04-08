import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getSpareParts } from "@/db/queries/maintenance";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SparePartsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("maintenance");

  const parts = await getSpareParts();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${locale}/admin/maintenance`} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("spareParts")}</h1>
      </div>

      {parts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t("noParts")}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t("partName")}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t("partNumber")}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t("category")}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t("stockLevel")}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t("supplier")}</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((part) => {
                const isLow = part.quantity <= part.minQuantity;
                return (
                  <tr key={part.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{part.name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{part.partNumber ?? "\u2014"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 capitalize">{part.category ?? "\u2014"}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${isLow ? "text-red-600" : "text-green-600"}`}>
                        {part.quantity}
                      </span>
                      <span className="text-gray-400">/{part.minQuantity}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{part.supplier ?? "\u2014"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
