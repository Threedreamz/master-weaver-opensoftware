import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import {
  Boxes,
  Plus,
  Trash2,
  Settings,
  Tag,
  LayoutList,
} from "lucide-react";
import { deleteModule } from "./actions";

interface ModulesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ModulesPage({ params }: ModulesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("modules");
  const tc = await getTranslations("common");

  const modules = await db.query.deskModules.findMany({
    with: {
      statuses: true,
      fields: true,
    },
    orderBy: (m, { asc }) => [asc(m.name)],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <Link
          href={`/${locale}/admin/modules/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          {t("addModule")}
        </Link>
      </div>

      {modules.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Boxes size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">{t("noModules")}</p>
          <p className="text-gray-400 text-sm mt-1">{t("noModulesHint")}</p>
          <Link
            href={`/${locale}/admin/modules/new`}
            className="inline-flex items-center gap-2 mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            {t("addModule")}
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {tc("name")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("color")}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("statuses")}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("fields")}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {tc("status")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {tc("actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {modules.map((mod) => (
                <tr key={mod.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {mod.icon && (
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: mod.color || "#6366f1" }}
                        >
                          {mod.icon.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <Link
                        href={`/${locale}/admin/modules/${mod.id}`}
                        className="font-medium text-gray-900 hover:text-indigo-700 transition-colors"
                      >
                        {mod.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {mod.slug}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {mod.color ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-full border border-gray-200"
                          style={{ backgroundColor: mod.color }}
                        />
                        <span className="text-xs text-gray-500 font-mono">{mod.color}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-600">
                      <Tag size={13} className="text-gray-400" />
                      <span className="font-medium">{mod.statuses.length}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-600">
                      <LayoutList size={13} className="text-gray-400" />
                      <span className="font-medium">{mod.fields.length}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {mod.isActive ? (
                      <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        {tc("active")}
                      </span>
                    ) : (
                      <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {tc("inactive")}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/${locale}/admin/modules/${mod.id}`}
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
                        title={tc("edit")}
                      >
                        <Settings size={14} />
                      </Link>
                      <form action={deleteModule}>
                        <input type="hidden" name="id" value={mod.id} />
                        <input type="hidden" name="locale" value={locale} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors"
                          title={tc("delete")}
                        >
                          <Trash2 size={14} />
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
