import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { deskVorgaenge } from "@/db/schema";
import { desc } from "drizzle-orm";
import { ClipboardList, Plus, Calendar, User } from "lucide-react";

interface VorgaengePageProps {
  params: Promise<{ locale: string }>;
}

const statusBadge: Record<string, string> = {
  entwurf: "bg-gray-100 text-gray-600",
  aktiv: "bg-blue-100 text-blue-700",
  pausiert: "bg-yellow-100 text-yellow-700",
  abgeschlossen: "bg-green-100 text-green-700",
  storniert: "bg-red-100 text-red-700",
};

const priorityBadge: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default async function VorgaengePage({ params }: VorgaengePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("vorgaenge");
  const tc = await getTranslations("common");

  const vorgaenge = await db.query.deskVorgaenge.findMany({
    with: {
      currentModule: true,
    },
    orderBy: [desc(deskVorgaenge.createdAt)],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <Link
          href={`/${locale}/admin/vorgaenge/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          {t("addVorgang")}
        </Link>
      </div>

      {vorgaenge.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <ClipboardList size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">{t("noVorgaenge")}</p>
          <p className="text-gray-400 text-sm mt-1">{t("noVorgaengeHint")}</p>
          <Link
            href={`/${locale}/admin/vorgaenge/new`}
            className="inline-flex items-center gap-2 mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            {t("addVorgang")}
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {tc("title")}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priorität
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {tc("status")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Modul
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zugewiesen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fällig
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Erstellt
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vorgaenge.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      href={`/${locale}/admin/vorgaenge/${v.id}`}
                      className="font-mono text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded transition-colors"
                    >
                      {v.globalId}
                    </Link>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <Link
                      href={`/${locale}/admin/vorgaenge/${v.id}`}
                      className="font-medium text-gray-900 hover:text-indigo-700 transition-colors line-clamp-1"
                    >
                      {v.title}
                    </Link>
                    {v.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{v.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${priorityBadge[v.priority] || "bg-gray-100 text-gray-600"}`}
                    >
                      {v.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge[v.globalStatus] || "bg-gray-100 text-gray-600"}`}
                    >
                      {v.globalStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {v.currentModule ? (
                      <span
                        className="inline-block text-xs font-medium px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: v.currentModule.color || "#6366f1" }}
                      >
                        {v.currentModule.name}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {v.assignedTo ? (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <User size={12} className="text-gray-400" />
                        {v.assignedTo}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {v.deadline ? (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Calendar size={12} className="text-gray-400" />
                        {new Date(v.deadline).toLocaleDateString("de-DE")}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-400">
                      {new Date(v.createdAt).toLocaleDateString("de-DE")}
                    </span>
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
