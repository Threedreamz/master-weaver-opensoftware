import { PageHeader, EmptyState } from "@opensoftware/ui";
import { SearchX } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function KeywordGapsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Keyword Gaps"
        description="Unserved keywords where competitors rank but you don't"
      />
      <EmptyState
        icon={<SearchX className="w-12 h-12" />}
        title="No keyword gap data"
        description="Connect SEMrush in Settings to discover keywords your competitors rank for that you're missing."
      />
    </>
  );
}
