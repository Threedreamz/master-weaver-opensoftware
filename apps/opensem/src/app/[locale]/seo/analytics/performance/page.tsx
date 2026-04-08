import { PageHeader, EmptyState } from "@opensoftware/ui";
import { Activity } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function PerformancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Performance"
        description="Monitor site performance metrics and trends"
      />
      <EmptyState
        icon={<Activity className="w-12 h-12" />}
        title="No performance data"
        description="Performance metrics will appear here once monitoring is configured."
      />
    </>
  );
}
