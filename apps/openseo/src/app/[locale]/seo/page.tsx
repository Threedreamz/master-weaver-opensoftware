import { PageHeader } from "@opensoftware/ui";
import { setRequestLocale } from "next-intl/server";

export default async function SeoDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="SEO Dashboard"
        description="Overview of your SEO performance and site health"
      />
    </>
  );
}
