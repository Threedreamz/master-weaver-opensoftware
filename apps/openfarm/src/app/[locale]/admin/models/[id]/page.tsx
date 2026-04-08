import { db } from "@/db";
import { farmModels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getFeasibilityChecks } from "@/db/queries/feasibility";
import { getOrientations } from "@/db/queries/orientations";
import { FeasibilityReport } from "@/components/admin/FeasibilityReport";
import { OrientationList } from "@/components/admin/OrientationList";
import { AnalyzeButton } from "@/components/admin/AnalyzeButton";
import Link from "next/link";
import { ArrowLeft, Box, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("feasibility");

  const model = await db.query.farmModels.findFirst({
    where: eq(farmModels.id, id),
  });

  if (!model) notFound();

  const feasibilityChecks = await getFeasibilityChecks(id);
  const orientations = await getOrientations(id);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/admin/models`}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <Box className="w-8 h-8 text-amber-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{model.name}</h1>
            <p className="text-sm text-gray-500">
              {model.filename} · {formatBytes(model.fileSizeBytes)} · {model.fileFormat.toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Model info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500">{t("dimensions")}</p>
          <p className="text-lg font-semibold">
            {model.boundingBoxX?.toFixed(1) ?? "—"} x {model.boundingBoxY?.toFixed(1) ?? "—"} x {model.boundingBoxZ?.toFixed(1) ?? "—"} mm
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500">{t("volume")}</p>
          <p className="text-lg font-semibold">{model.volumeCm3?.toFixed(2) ?? "—"} cm3</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500">{t("triangles")}</p>
          <p className="text-lg font-semibold">{model.triangleCount?.toLocaleString() ?? "—"}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500">{t("manifold")}</p>
          <p className="text-lg font-semibold">
            {model.isManifold === null ? "—" : model.isManifold ? "Yes" : "No"}
          </p>
        </div>
      </div>

      {/* Analyze button */}
      {!model.meshAnalyzed && (
        <AnalyzeButton modelId={id} modelFormat={model.fileFormat} />
      )}

      {/* Feasibility results */}
      {feasibilityChecks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t("title")}
          </h2>
          <FeasibilityReport checks={feasibilityChecks} />
        </div>
      )}

      {/* Orientation results */}
      {orientations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t("orientations")}
          </h2>
          <OrientationList orientations={orientations} modelId={id} />
        </div>
      )}
    </div>
  );
}
