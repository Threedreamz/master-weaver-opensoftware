import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getPackingJobs } from "@/db/queries/packing";
import Link from "next/link";
import { Package, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  packing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  packed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  approved: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  printing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default async function PackingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("packing");

  const jobs = await getPackingJobs();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
        </div>
        <Link
          href={`/${locale}/admin/packing/new`}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-sm font-medium rounded-lg hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          {t("newPackingJob")}
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t("noJobs")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/${locale}/admin/packing/${job.id}`}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">{job.name}</h3>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLES[job.status] ?? STATUS_STYLES.draft}`}>
                  {t(`statuses.${job.status}`)}
                </span>
              </div>
              <div className="space-y-1 text-sm text-gray-500">
                <p>{t("printer")}: {(job as any).printer?.name ?? "—"}</p>
                <p>{t("buildVolume")}: {job.buildVolumeX}{"×"}{job.buildVolumeY}{"×"}{job.buildVolumeZ} mm</p>
                <p>{t("parts")}: {job.packedParts}/{job.totalParts}</p>
                {job.utilizationPercent !== null && (
                  <div className="flex items-center gap-2">
                    <span>{t("utilization")}:</span>
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${job.utilizationPercent}%` }}
                      />
                    </div>
                    <span className="font-semibold">{job.utilizationPercent?.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
