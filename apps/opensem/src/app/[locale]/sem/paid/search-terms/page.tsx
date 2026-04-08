import { PageHeader, EmptyState } from "@opensoftware/ui";
import { MessageSquareText } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function SearchTermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Search Terms"
        description="Query-level analysis of actual search terms triggering your ads"
      />
      <EmptyState
        icon={<MessageSquareText className="w-12 h-12" />}
        title="No search term data"
        description="Connect Google Ads in Settings to analyze search terms triggering your ad impressions."
      />
    </>
  );
}
