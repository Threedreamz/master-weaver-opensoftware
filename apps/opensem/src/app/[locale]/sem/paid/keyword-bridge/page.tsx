import { PageHeader, EmptyState } from "@opensoftware/ui";
import { GitBranch } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function KeywordBridgePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Keyword Bridge"
        description="SEO to Paid recommendations — find organic keywords worth bidding on"
      />
      <EmptyState
        icon={<GitBranch className="w-12 h-12" />}
        title="No bridge data"
        description="Connect Google Ads and SEMrush in Settings to generate SEO-to-Paid keyword recommendations."
      />
    </>
  );
}
