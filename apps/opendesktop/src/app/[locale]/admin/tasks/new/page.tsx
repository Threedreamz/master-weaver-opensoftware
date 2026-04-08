import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { deskVorgaenge, deskModules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { createTask } from "../actions";

interface NewTaskPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ vorgangId?: string }>;
}

export default async function NewTaskPage({ params, searchParams }: NewTaskPageProps) {
  const { locale } = await params;
  const { vorgangId: preselectedVorgangId } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("tasks");
  const tc = await getTranslations("common");

  const [activeVorgaenge, modules] = await Promise.all([
    db.query.deskVorgaenge.findMany({
      where: eq(deskVorgaenge.globalStatus, "aktiv"),
      orderBy: (v, { desc }) => [desc(v.createdAt)],
    }),
    db.query.deskModules.findMany({
      where: eq(deskModules.isActive, true),
      orderBy: (m, { asc }) => [asc(m.name)],
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/admin/tasks`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          {tc("back")}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t("addTask")}</h1>
      </div>

      <form action={createTask} className="space-y-6">
        <input type="hidden" name="locale" value={locale} />

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("taskDetails")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                {tc("title")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                placeholder="z.B. CAD-Zeichnung prüfen"
              />
            </div>

            <div>
              <label htmlFor="vorgangId" className="block text-sm font-medium text-gray-700 mb-1">
                Vorgang
              </label>
              <select
                id="vorgangId"
                name="vorgangId"
                defaultValue={preselectedVorgangId || ""}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">Keinen Vorgang verknüpfen</option>
                {activeVorgaenge.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.globalId} – {v.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="moduleId" className="block text-sm font-medium text-gray-700 mb-1">
                Modul
              </label>
              <select
                id="moduleId"
                name="moduleId"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">Kein Modul</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                Priorität
              </label>
              <select
                id="priority"
                name="priority"
                defaultValue="medium"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="low">Niedrig</option>
                <option value="medium">Mittel</option>
                <option value="high">Hoch</option>
                <option value="critical">Kritisch</option>
              </select>
            </div>

            <div>
              <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">
                Fälligkeitsdatum
              </label>
              <input
                type="date"
                id="deadline"
                name="deadline"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 mb-1">
                Zuweisen an
              </label>
              <input
                type="text"
                id="assignedTo"
                name="assignedTo"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                placeholder="Name oder E-Mail"
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" name="blocksAdvance" className="rounded" />
                <span>Blockiert Weitergabe</span>
              </label>
              <span className="text-xs text-gray-400">
                Vorgang kann nicht weitergeleitet werden, solange diese Aufgabe offen ist
              </span>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {tc("description")}
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                placeholder="Optionale Beschreibung..."
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            {tc("save")}
          </button>
          <Link
            href={`/${locale}/admin/tasks`}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {tc("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}
