import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { farmPrintJobs } from "@/db/schema";
import { desc } from "drizzle-orm";
import { PlayCircle, Plus } from "lucide-react";
import { AutoAssignButton } from "@/components/admin/AutoAssignButton";

export const dynamic = "force-dynamic";

interface JobsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function JobsPage({ params }: JobsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("jobs");

  const allJobs = await db.query.farmPrintJobs.findMany({
    orderBy: [desc(farmPrintJobs.queuedAt)],
    with: { printer: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <Link
          href={`/${locale}/admin/jobs/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
        >
          <Plus size={16} />
          {t("createJob")}
        </Link>
      </div>

      {allJobs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <PlayCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">{t("noJobs")}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {allJobs.map((job) => (
              <Link
                key={job.id}
                href={`/${locale}/admin/jobs/${job.id}`}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 block"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{job.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500">
                      {t("printer")}: {job.printer?.name ?? "—"}
                    </p>
                    {(!job.printerId || !job.printer) && job.status === "queued" && (
                      <AutoAssignButton jobId={job.id} />
                    )}
                  </div>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    job.status === "printing"
                      ? "bg-green-100 text-green-700"
                      : job.status === "completed"
                      ? "bg-blue-100 text-blue-700"
                      : job.status === "failed"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {job.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
