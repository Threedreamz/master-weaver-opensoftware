import { PageHeader, EmptyState } from "@opensoftware/ui";
import { Lightbulb } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function RecommendationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Recommendations"
        description="AI-driven suggestions combining organic SEO and paid search insights"
      />
      <EmptyState
        icon={<Lightbulb className="w-12 h-12" />}
        title="No recommendations yet"
        description="Connect Google Ads and SEMrush in Settings. Recommendations are generated after analyzing both organic and paid search data."
      />
    </>
  );
}
