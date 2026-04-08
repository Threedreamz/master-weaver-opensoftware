import { PageHeader, EmptyState } from "@opensoftware/ui";
import { Filter } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function FunnelsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Funnels"
        description="Visualize and optimize your conversion funnels"
      />
      <EmptyState
        icon={<Filter className="w-12 h-12" />}
        title="No funnels configured"
        description="Create a funnel to track user journeys through your conversion paths."
      />
    </>
  );
}
