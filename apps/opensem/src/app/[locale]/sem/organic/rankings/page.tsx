import { PageHeader, EmptyState } from "@opensoftware/ui";
import { TrendingUp } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function RankingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Rankings"
        description="Track your keyword rankings and search positions"
      />
      <EmptyState
        icon={<TrendingUp className="w-12 h-12" />}
        title="No ranking data"
        description="Add keywords to start tracking your search engine rankings."
      />
    </>
  );
}
