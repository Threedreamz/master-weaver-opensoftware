import { PageHeader, EmptyState } from "@opensoftware/ui";
import { GitBranch } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function AttributionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Attribution"
        description="Understand which channels drive conversions"
      />
      <EmptyState
        icon={<GitBranch className="w-12 h-12" />}
        title="No attribution data"
        description="Set up attribution tracking to understand your marketing channel performance."
      />
    </>
  );
}
