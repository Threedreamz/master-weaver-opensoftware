import { PageHeader, EmptyState } from "@opensoftware/ui";
import { Award } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function LandingPageScorePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Landing Page Score"
        description="Combined Quality Score and on-page SEO analysis for landing pages"
      />
      <EmptyState
        icon={<Award className="w-12 h-12" />}
        title="No landing page scores"
        description="Connect Google Ads in Settings to correlate Quality Score with on-page SEO metrics for each landing page."
      />
    </>
  );
}
