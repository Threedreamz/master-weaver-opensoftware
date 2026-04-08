import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { deskWorkstations } from "@/db/schema";
import { ArrowLeft } from "lucide-react";
import { createIssue } from "../actions";

interface NewIssuePageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewIssuePage({ params }: NewIssuePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("issues");
  const tc = await getTranslations("common");

  const workstations = await db.query.deskWorkstations.findMany({
    where: eq(deskWorkstations.status, "active"),
    orderBy: (ws, { asc }) => [asc(ws.code)],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/admin/issues`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          {tc("back")}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t("addIssue")}</h1>
      </div>

      <form action={createIssue} className="space-y-6">
        <input type="hidden" name="locale" value={locale} />

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("issueDetails")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                {t("issueTitle")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                placeholder="z.B. Scanner reagiert nicht"
              />
            </div>

            <div>
              <label htmlFor="workstationId" className="block text-sm font-medium text-gray-700 mb-1">
                {t("workstation")} <span className="text-red-500">*</span>
              </label>
              <select
                id="workstationId"
                name="workstationId"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">{t("selectWorkstation")}</option>
                {workstations.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.code} — {ws.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                {t("priority")}
              </label>
              <select
                id="priority"
                name="priority"
                defaultValue="medium"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                {t("category")}
              </label>
              <select
                id="category"
                name="category"
                defaultValue="other"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="hardware">Hardware</option>
                <option value="software">Software</option>
                <option value="environment">Environment</option>
                <option value="safety">Safety</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                {tc("description")}
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                placeholder="Beschreibe das Problem detailliert..."
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
            href={`/${locale}/admin/issues`}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {tc("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}
