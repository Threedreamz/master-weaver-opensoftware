import { PageHeader, EmptyState } from "@opensoftware/ui";
import { Clock } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function DaypartingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Dayparting"
        description="Conversion rate analysis by hour and day of week"
      />
      <EmptyState
        icon={<Clock className="w-12 h-12" />}
        title="No dayparting data"
        description="Connect Google Ads in Settings to view conversion patterns across time periods."
      />
    </>
  );
}
