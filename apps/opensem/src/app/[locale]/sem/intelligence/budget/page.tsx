import { PageHeader, EmptyState } from "@opensoftware/ui";
import { DollarSign } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function BudgetIntelligencePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Budget Intelligence"
        description="Competitor budget estimates and spend efficiency analysis"
      />
      <EmptyState
        icon={<DollarSign className="w-12 h-12" />}
        title="No budget intelligence"
        description="Connect Google Ads and SEMrush in Settings to estimate competitor budgets and benchmark your spend."
      />
    </>
  );
}
