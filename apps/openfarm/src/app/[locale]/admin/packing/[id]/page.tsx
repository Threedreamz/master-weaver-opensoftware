import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getPackingJobById } from "@/db/queries/packing";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, Clock, DollarSign, Layers } from "lucide-react";
import { PackingActions } from "@/components/admin/packing/PackingActions";

export const dynamic = "force-dynamic";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default async function PackingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("packing");

  const job = await getPackingJobById(id);
  if (!job) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${locale}/admin/packing`} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{job.name}</h1>
          <p className="text-sm text-gray-500">
            {(job as any).printer?.name} · {job.buildVolumeX}{"×"}{job.buildVolumeY}{"×"}{job.buildVolumeZ} mm
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 flex items-center gap-1"><Package className="w-3 h-3" /> {t("parts")}</p>
          <p className="text-2xl font-bold">{job.packedParts}/{job.totalParts}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 flex items-center gap-1"><Layers className="w-3 h-3" /> {t("utilization")}</p>
          <p className="text-2xl font-bold">{job.utilizationPercent?.toFixed(1) ?? "—"}%</p>
        </div>
        {job.estimatedPrintTime && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {t("estTime")}</p>
            <p className="text-2xl font-bold">{formatDuration(job.estimatedPrintTime)}</p>
          </div>
        )}
        {job.estimatedCost !== null && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 flex items-center gap-1"><DollarSign className="w-3 h-3" /> {t("estCost")}</p>
            <p className="text-2xl font-bold">{"€"}{job.estimatedCost?.toFixed(2)}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <PackingActions jobId={id} status={job.status} />

      {/* Parts list */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t("includedParts")}</h2>
        {job.items.length === 0 ? (
          <p className="text-sm text-gray-500">{t("noParts")}</p>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">{t("model")}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">{t("quantity")}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">{t("dimensions")}</th>
                </tr>
              </thead>
              <tbody>
                {job.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {item.model?.name ?? "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.quantity}{"×"}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {item.model?.boundingBoxX?.toFixed(0) ?? "?"}{"×"}
                      {item.model?.boundingBoxY?.toFixed(0) ?? "?"}{"×"}
                      {item.model?.boundingBoxZ?.toFixed(0) ?? "?"} mm
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
