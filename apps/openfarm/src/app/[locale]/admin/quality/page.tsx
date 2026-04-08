import { setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { farmFeasibilityChecks, farmPrintJobs, farmModels } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { ShieldCheck, AlertTriangle, XCircle, CheckCircle2, FileSearch } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface QualityPageProps {
  params: Promise<{ locale: string }>;
}

const VERDICT_BADGES: Record<string, { label: string; className: string }> = {
  printable: { label: "Druckbar", className: "bg-green-100 text-green-700" },
  printable_with_issues: { label: "Mit Einschr\u00e4nkungen", className: "bg-amber-100 text-amber-700" },
  needs_rework: { label: "Nacharbeit", className: "bg-red-100 text-red-700" },
  needs_redesign: { label: "Redesign", className: "bg-red-100 text-red-700" },
};

export default async function QualityPage({ params }: QualityPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Stats queries
  const [
    totalResult,
    printableResult,
    issuesResult,
    reworkResult,
    completedJobsResult,
    failedJobsResult,
    recentChecks,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(farmFeasibilityChecks),
    db.select({ count: sql<number>`count(*)` }).from(farmFeasibilityChecks).where(eq(farmFeasibilityChecks.verdict, "printable")),
    db.select({ count: sql<number>`count(*)` }).from(farmFeasibilityChecks).where(eq(farmFeasibilityChecks.verdict, "printable_with_issues")),
    db.select({ count: sql<number>`count(*)` }).from(farmFeasibilityChecks).where(
      sql`${farmFeasibilityChecks.verdict} IN ('needs_rework', 'needs_redesign')`
    ),
    db.select({ count: sql<number>`count(*)` }).from(farmPrintJobs).where(eq(farmPrintJobs.status, "completed")),
    db.select({ count: sql<number>`count(*)` }).from(farmPrintJobs).where(eq(farmPrintJobs.status, "failed")),
    db
      .select({
        id: farmFeasibilityChecks.id,
        modelId: farmFeasibilityChecks.modelId,
        verdict: farmFeasibilityChecks.verdict,
        overallScore: farmFeasibilityChecks.overallScore,
        technology: farmFeasibilityChecks.technology,
        createdAt: farmFeasibilityChecks.createdAt,
        modelName: farmModels.name,
        isManifold: farmModels.isManifold,
        triangleCount: farmModels.triangleCount,
      })
      .from(farmFeasibilityChecks)
      .leftJoin(farmModels, eq(farmFeasibilityChecks.modelId, farmModels.id))
      .orderBy(desc(farmFeasibilityChecks.createdAt))
      .limit(10),
  ]);

  const totalChecks = totalResult[0]?.count ?? 0;
  const printableCount = printableResult[0]?.count ?? 0;
  const issuesCount = issuesResult[0]?.count ?? 0;
  const reworkCount = reworkResult[0]?.count ?? 0;

  const completedJobs = completedJobsResult[0]?.count ?? 0;
  const failedJobs = failedJobsResult[0]?.count ?? 0;
  const totalJobs = completedJobs + failedJobs;
  const successRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

  const stats = [
    { label: "Gepr\u00fcft", value: totalChecks, color: "bg-gray-100 text-gray-700", borderColor: "border-gray-200" },
    { label: "Druckbar", value: printableCount, color: "bg-green-100 text-green-700", borderColor: "border-green-200" },
    { label: "Mit Einschr\u00e4nkungen", value: issuesCount, color: "bg-amber-100 text-amber-700", borderColor: "border-amber-200" },
    { label: "Nacharbeit n\u00f6tig", value: reworkCount, color: "bg-red-100 text-red-700", borderColor: "border-red-200" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck size={24} className="text-amber-500" />
          Qualit&auml;tssicherung
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Druckqualit&auml;t &uuml;berwachen, Machbarkeit pr&uuml;fen, Probleme erkennen
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border ${stat.borderColor} bg-white p-4 text-center`}
          >
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className={`text-xs font-medium mt-1 inline-flex items-center rounded-full px-2 py-0.5 ${stat.color}`}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Print Success Rate */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Druck-Erfolgsquote</h2>
        {totalJobs === 0 ? (
          <p className="text-sm text-gray-500">Noch keine abgeschlossenen Druckauftr&auml;ge</p>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">
                {completedJobs} erfolgreich / {totalJobs} abgeschlossen
              </span>
              <span className="text-sm font-semibold text-gray-900">
                Erfolgsquote: {successRate}%
              </span>
            </div>
            <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${successRate}%` }}
              />
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 size={12} className="text-green-500" />
                {completedJobs} erfolgreich
              </span>
              <span className="flex items-center gap-1">
                <XCircle size={12} className="text-red-500" />
                {failedJobs} fehlgeschlagen
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Recent Checks */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Letzte Pr&uuml;fungen</h2>
        {recentChecks.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <ShieldCheck size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-2">Noch keine Qualit&auml;tspr&uuml;fungen</p>
            <p className="text-xs text-gray-400 mb-4">
              Qualit&auml;tspr&uuml;fungen werden automatisch bei der Machbarkeitsanalyse erstellt.
            </p>
            <Link
              href={`/${locale}/admin/models`}
              className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
            >
              <FileSearch size={14} />
              Zu den Modellen
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Modell</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Ergebnis</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Manifold</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Dreiecke</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Datum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentChecks.map((check) => {
                  const badge = VERDICT_BADGES[check.verdict] ?? {
                    label: check.verdict,
                    className: "bg-gray-100 text-gray-700",
                  };
                  return (
                    <tr key={check.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/${locale}/admin/models/${check.modelId}`}
                          className="text-gray-900 hover:text-amber-600 transition-colors font-medium"
                        >
                          {check.modelName ?? "Unbekannt"}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {check.isManifold === true ? (
                          <CheckCircle2 size={16} className="inline text-green-500" />
                        ) : check.isManifold === false ? (
                          <XCircle size={16} className="inline text-red-500" />
                        ) : (
                          <span className="text-gray-300">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 tabular-nums">
                        {check.triangleCount != null
                          ? check.triangleCount.toLocaleString("de-DE")
                          : "--"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400 text-xs">
                        {check.createdAt instanceof Date
                          ? check.createdAt.toLocaleDateString("de-DE")
                          : new Date(check.createdAt).toLocaleDateString("de-DE")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
