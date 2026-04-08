import { PageHeader } from "@opensoftware/ui";
import { setRequestLocale } from "next-intl/server";

export default async function PaidDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="SERP Dominance"
        description="Cross-channel search performance overview"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="SERP Dominance Score" value="--" />
        <KpiCard label="Organic Keywords (Top 10)" value="--" />
        <KpiCard label="Paid Keywords Active" value="--" />
        <KpiCard label="Keyword Overlap %" value="--" />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Keyword Universe</h3>
        <p className="text-gray-500 dark:text-gray-400">
          Connect Google Ads and SEMrush in Settings to populate data.
        </p>
      </div>
    </>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
    </div>
  );
}
