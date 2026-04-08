import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { deskWorkstations } from "@/db/schema";
import { Monitor, Plus, Trash2 } from "lucide-react";
import { deleteWorkstation } from "./actions";

interface WorkstationsPageProps {
  params: Promise<{ locale: string }>;
}

const statusBadge: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  maintenance: "bg-yellow-100 text-yellow-700",
  reserved: "bg-blue-100 text-blue-700",
};

export default async function WorkstationsPage({ params }: WorkstationsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("workstations");
  const tc = await getTranslations("common");

  const workstations = await db.query.deskWorkstations.findMany({
    with: {
      zone: {
        with: {
          building: true,
        },
      },
    },
    orderBy: (ws, { asc }) => [asc(ws.code)],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <Link
          href={`/${locale}/admin/workstations/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          {t("addWorkstation")}
        </Link>
      </div>

      {workstations.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Monitor size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">{t("noWorkstations")}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("code")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("name")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("type")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("zone")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("status")}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">{tc("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {workstations.map((ws) => (
                <tr
                  key={ws.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      {ws.code}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/${locale}/admin/workstations/${ws.id}`}
                      className="font-medium text-gray-900 hover:text-indigo-600 transition-colors"
                    >
                      {ws.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      {t(ws.type as Parameters<typeof t>[0])}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {ws.zone ? (
                      <span>
                        {ws.zone.building?.name}
                        <span className="text-gray-400 mx-1">›</span>
                        {ws.zone.name}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge[ws.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {t(ws.status as Parameters<typeof t>[0])}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-3">
                      <Link
                        href={`/${locale}/admin/workstations/${ws.id}`}
                        className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
                      >
                        {tc("edit")}
                      </Link>
                      <form action={deleteWorkstation}>
                        <input type="hidden" name="id" value={ws.id} />
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
                    </div>
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
