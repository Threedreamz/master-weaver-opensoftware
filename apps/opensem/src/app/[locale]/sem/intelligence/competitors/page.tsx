import { PageHeader, EmptyState } from "@opensoftware/ui";
import { Users } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function CompetitorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Competitors"
        description="SEMrush competitor data — domain overlap, keyword battles, traffic estimates"
      />
      <EmptyState
        icon={<Users className="w-12 h-12" />}
        title="No competitor data"
        description="Connect SEMrush in Settings to analyze competitor domains and keyword strategies."
      />
    </>
  );
}
