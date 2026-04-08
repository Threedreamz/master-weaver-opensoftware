import { PageHeader } from "@opensoftware/ui";
import { setRequestLocale } from "next-intl/server";

export default async function AnalyticsDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Analytics Dashboard"
        description="Overview of your website analytics and user behavior"
      />
    </>
  );
}
