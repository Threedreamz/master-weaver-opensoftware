import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getBatchJobs } from "@/db/queries/batch";
import { Layers, Plus } from "lucide-react";

interface BatchPageProps {
  params: Promise<{ locale: string }>;
}

export default async function BatchPage({ params }: BatchPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("batch");
  const allBatchJobs = await getBatchJobs();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <Link
          href={`/${locale}/admin/batch/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
        >
          <Plus size={16} />
          {t("createBatch")}
        </Link>
      </div>

      {allBatchJobs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Layers size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">{t("noBatch")}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {allBatchJobs.map((batch) => (
              <div
                key={batch.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{batch.name}</p>
                  <p className="text-xs text-gray-500">
                    {t("combinations")}: {batch.totalJobs}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    batch.status === "running"
                      ? "bg-green-100 text-green-700"
                      : batch.status === "completed"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {batch.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
