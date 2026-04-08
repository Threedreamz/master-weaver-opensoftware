import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { Wrench, Plus, Trash2 } from "lucide-react";
import { deleteEquipment } from "./actions";

interface EquipmentPageProps {
  params: Promise<{ locale: string }>;
}

const statusBadge: Record<string, string> = {
  operational: "bg-green-100 text-green-700",
  broken: "bg-red-100 text-red-700",
  maintenance: "bg-yellow-100 text-yellow-700",
  retired: "bg-gray-100 text-gray-600",
};

export default async function EquipmentPage({ params }: EquipmentPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("equipment");
  const tc = await getTranslations("common");

  const equipment = await db.query.deskEquipment.findMany({
    with: {
      workstation: true,
    },
    orderBy: (eq, { asc }) => [asc(eq.name)],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <Link
          href={`/${locale}/admin/equipment/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          {t("addEquipment")}
        </Link>
      </div>

      {equipment.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Wrench size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">{t("noEquipment")}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("name")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("category")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("serialNumber")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("workstation")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("status")}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">{tc("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {equipment.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {t(item.category as Parameters<typeof t>[0])}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {item.serialNumber || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {item.workstation ? (
                      <Link
                        href={`/${locale}/admin/workstations/${item.workstation.id}`}
                        className="hover:text-indigo-600 transition-colors"
                      >
                        <span className="font-medium">{item.workstation.name}</span>
                        <span className="ml-1 font-mono text-xs text-gray-400">
                          ({item.workstation.code})
                        </span>
                      </Link>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge[item.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteEquipment}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                        title={tc("delete")}
                      >
                        <Trash2 size={14} />
                        {tc("delete")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
