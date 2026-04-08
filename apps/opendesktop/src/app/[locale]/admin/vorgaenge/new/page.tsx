import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { deskFlows } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { createVorgang } from "../actions";

interface NewVorgangPageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewVorgangPage({ params }: NewVorgangPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("vorgaenge");
  const tc = await getTranslations("common");

  const flows = await db.query.deskFlows.findMany({
    where: eq(deskFlows.status, "live"),
    orderBy: (f, { asc }) => [asc(f.name)],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/admin/vorgaenge`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          {tc("back")}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t("addVorgang")}</h1>
      </div>

      <form action={createVorgang} className="space-y-6">
        <input type="hidden" name="locale" value={locale} />

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("vorgangDetails")}</h2>
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
                placeholder="z.B. Kundenauftrag #12345 – 3D-Druck Gehäuse"
              />
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

            {flows.length > 0 && (
              <div>
                <label htmlFor="flowId" className="block text-sm font-medium text-gray-700 mb-1">
                  Flow
                </label>
                <select
                  id="flowId"
                  name="flowId"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">Keinen Flow auswählen</option>
                  {flows.map((flow) => (
                    <option key={flow.id} value={flow.id}>
                      {flow.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                {tc("description")}
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                placeholder="Optionale Beschreibung des Vorgangs..."
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
            href={`/${locale}/admin/vorgaenge`}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {tc("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}
