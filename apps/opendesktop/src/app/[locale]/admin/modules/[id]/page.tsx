import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Tag,
  LayoutList,
  Kanban,
} from "lucide-react";
import {
  deleteModule,
  createModuleStatus,
  deleteModuleStatus,
  createModuleField,
  deleteModuleField,
} from "../actions";

interface ModuleDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

const fieldTypeBadge: Record<string, string> = {
  text: "bg-blue-100 text-blue-700",
  number: "bg-purple-100 text-purple-700",
  date: "bg-orange-100 text-orange-700",
  select: "bg-teal-100 text-teal-700",
  checkbox: "bg-green-100 text-green-700",
  textarea: "bg-indigo-100 text-indigo-700",
  file: "bg-yellow-100 text-yellow-700",
  url: "bg-pink-100 text-pink-700",
};

export default async function ModuleDetailPage({ params }: ModuleDetailPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("modules");
  const tc = await getTranslations("common");

  const mod = await db.query.deskModules.findFirst({
    where: (m, { eq }) => eq(m.id, id),
    with: {
      statuses: {
        orderBy: (s, { asc }) => [asc(s.sortOrder)],
      },
      fields: {
        orderBy: (f, { asc }) => [asc(f.sortOrder)],
      },
    },
  });

  if (!mod) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/admin/modules`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          {tc("back")}
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold"
            style={{ backgroundColor: mod.color || "#6366f1" }}
          >
            {mod.icon ? mod.icon.slice(0, 2).toUpperCase() : mod.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{mod.name}</h1>
              {mod.isActive ? (
                <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  {tc("active")}
                </span>
              ) : (
                <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {tc("inactive")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {mod.slug}
              </span>
              {mod.color && (
                <div
                  className="w-4 h-4 rounded-full border border-gray-200"
                  style={{ backgroundColor: mod.color }}
                />
              )}
            </div>
            {mod.description && (
              <p className="text-sm text-gray-500 mt-1">{mod.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/admin/modules/${mod.id}/board`}
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            <Kanban size={16} />
            {t("board")}
          </Link>
          <form action={deleteModule}>
            <input type="hidden" name="id" value={mod.id} />
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
            >
              <Trash2 size={16} />
              {tc("delete")}
            </button>
          </form>
        </div>
      </div>

      {/* Section 1: Statuses */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Tag size={18} className="text-indigo-500" />
            <h2 className="text-base font-semibold text-gray-900">{t("statuses")}</h2>
            <span className="text-xs text-gray-400">({mod.statuses.length})</span>
          </div>
        </div>

        {mod.statuses.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">
            {t("noStatuses")}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
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
                  Final
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Default
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("sortOrder")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {tc("actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mod.statuses.map((status) => (
                <tr key={status.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      {status.color && (
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: status.color }}
                        />
                      )}
                      <span className="font-medium text-gray-900">{status.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {status.slug}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    {status.color ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full border border-gray-200"
                          style={{ backgroundColor: status.color }}
                        />
                        <span className="text-xs text-gray-500 font-mono">{status.color}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-center">
                    {status.isFinal ? (
                      <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        Final
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-center">
                    {status.isDefault ? (
                      <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        Default
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-center text-gray-500">{status.sortOrder}</td>
                  <td className="px-6 py-3 text-right">
                    <form action={deleteModuleStatus}>
                      <input type="hidden" name="id" value={status.id} />
                      <input type="hidden" name="moduleId" value={mod.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <button
                        type="submit"
                        className="inline-flex items-center text-xs text-red-400 hover:text-red-600 transition-colors"
                        title={tc("delete")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Add status form */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-600 mb-3 flex items-center gap-1">
            <Plus size={14} />
            {t("addStatus")}
          </p>
          <form action={createModuleStatus} className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input type="hidden" name="moduleId" value={mod.id} />
            <input type="hidden" name="locale" value={locale} />
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                {tc("name")} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="z.B. In Bearbeitung"
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Slug</label>
              <input
                type="text"
                name="slug"
                placeholder="in-bearbeitung"
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("color")}</label>
              <input
                type="color"
                name="color"
                defaultValue="#6366f1"
                className="h-8 w-full rounded border border-gray-300 cursor-pointer p-0.5"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("sortOrder")}</label>
              <input
                type="number"
                name="sortOrder"
                defaultValue="0"
                min="0"
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-4 md:col-span-2">
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" name="isFinal" className="rounded" />
                Final
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" name="isDefault" className="rounded" />
                Default
              </label>
            </div>
            <div className="md:col-span-2 flex items-end justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                <Plus size={12} />
                {t("addStatus")}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Section 2: Custom Fields */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <LayoutList size={18} className="text-indigo-500" />
            <h2 className="text-base font-semibold text-gray-900">{t("customFields")}</h2>
            <span className="text-xs text-gray-400">({mod.fields.length})</span>
          </div>
        </div>

        {mod.fields.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">
            {t("noFields")}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {tc("name")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Typ
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pflichtfeld
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("sortOrder")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {tc("actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mod.fields.map((field) => (
                <tr key={field.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-900">{field.name}</td>
                  <td className="px-6 py-3">
                    <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {field.slug}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${fieldTypeBadge[field.fieldType] || "bg-gray-100 text-gray-600"}`}
                    >
                      {field.fieldType}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    {field.required ? (
                      <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        Ja
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-center text-gray-500">{field.sortOrder}</td>
                  <td className="px-6 py-3 text-right">
                    <form action={deleteModuleField}>
                      <input type="hidden" name="id" value={field.id} />
                      <input type="hidden" name="moduleId" value={mod.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <button
                        type="submit"
                        className="inline-flex items-center text-xs text-red-400 hover:text-red-600 transition-colors"
                        title={tc("delete")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Add field form */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-600 mb-3 flex items-center gap-1">
            <Plus size={14} />
            {t("addField")}
          </p>
          <form action={createModuleField} className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input type="hidden" name="moduleId" value={mod.id} />
            <input type="hidden" name="locale" value={locale} />
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                {tc("name")} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="z.B. Kundennummer"
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Slug</label>
              <input
                type="text"
                name="slug"
                placeholder="kundennummer"
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Typ <span className="text-red-400">*</span>
              </label>
              <select
                name="fieldType"
                required
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="text">text</option>
                <option value="number">number</option>
                <option value="date">date</option>
                <option value="select">select</option>
                <option value="checkbox">checkbox</option>
                <option value="textarea">textarea</option>
                <option value="file">file</option>
                <option value="url">url</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("sortOrder")}</label>
              <input
                type="number"
                name="sortOrder"
                defaultValue="0"
                min="0"
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Standardwert</label>
              <input
                type="text"
                name="defaultValue"
                placeholder="Optional"
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" name="required" className="rounded" />
                Pflichtfeld
              </label>
            </div>
            <div className="md:col-span-2 flex items-end justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                <Plus size={12} />
                {t("addField")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
