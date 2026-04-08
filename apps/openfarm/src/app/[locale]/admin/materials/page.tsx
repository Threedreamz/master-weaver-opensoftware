import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getMaterials } from "@/db/queries/materials";
import { deleteMaterial } from "./actions";
import { Palette, Plus, Trash2 } from "lucide-react";

interface MaterialsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function MaterialsPage({ params }: MaterialsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("materials");
  const allMaterials = await getMaterials();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <Link
          href={`/${locale}/admin/materials/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
        >
          <Plus size={16} />
          {t("addMaterial")}
        </Link>
      </div>

      {allMaterials.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Palette size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">{t("noMaterials")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  {t("name")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  {t("technology")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  {t("type")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  {t("color")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  {t("stock")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  {t("manufacturer")}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  {/* actions */}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allMaterials.map((material) => {
                const total = material.totalQuantity ?? 0;
                const used = material.usedQuantity ?? 0;
                const remaining = Math.max(total - used, 0);
                const percent = total > 0 ? Math.round((remaining / total) * 100) : 0;

                return (
                  <tr key={material.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {material.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          material.technology === "fdm"
                            ? "bg-blue-100 text-blue-700"
                            : material.technology === "sla"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {material.technology.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {material.type}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {material.colorHex && (
                          <div
                            className="h-5 w-5 rounded-full border border-gray-200 shrink-0"
                            style={{ backgroundColor: material.colorHex }}
                          />
                        )}
                        <span className="text-sm text-gray-600">{material.color ?? ""}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1 min-w-[120px]">
                        <span className="text-xs text-gray-600">
                          {remaining}{material.unit} / {total}{material.unit}
                        </span>
                        <div className="h-2 w-full rounded-full bg-gray-200">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              percent > 50
                                ? "bg-green-500"
                                : percent > 20
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {material.manufacturer ?? ""}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <form action={deleteMaterial}>
                        <input type="hidden" name="id" value={material.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </form>
                    </td>
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
