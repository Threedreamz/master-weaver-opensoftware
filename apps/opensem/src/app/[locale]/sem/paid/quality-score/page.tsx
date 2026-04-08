import { PageHeader, EmptyState } from "@opensoftware/ui";
import { Award } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function QualityScorePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Quality Score"
        description="Quality Factor drivers per keyword — expected CTR, ad relevance, landing page experience"
      />
      <EmptyState
        icon={<Award className="w-12 h-12" />}
        title="No quality score data"
        description="Connect Google Ads in Settings to view Quality Score breakdowns for your keywords."
      />
    </>
  );
}
