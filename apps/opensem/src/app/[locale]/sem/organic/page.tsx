import { PageHeader } from "@opensoftware/ui";
import { setRequestLocale } from "next-intl/server";

export default async function OrganicDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Organic SEO Dashboard"
        description="Overview of your organic SEO performance and site health"
      />
    </>
  );
}
