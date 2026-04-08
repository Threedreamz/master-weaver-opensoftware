import { PageHeader, EmptyState } from "@opensoftware/ui";
import { Users } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function CohortsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Cohorts"
        description="Analyze user retention and behavior by cohort"
      />
      <EmptyState
        icon={<Users className="w-12 h-12" />}
        title="No cohort data"
        description="Cohort analysis will be available once you have sufficient user data."
      />
    </>
  );
}
