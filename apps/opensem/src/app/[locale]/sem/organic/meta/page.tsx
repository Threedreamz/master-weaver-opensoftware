import { PageHeader, EmptyState } from "@opensoftware/ui";
import { Tags } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function MetaTagsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Meta Tags"
        description="Inspect and manage meta tags across your pages"
      />
      <EmptyState
        icon={<Tags className="w-12 h-12" />}
        title="No meta tag data"
        description="Crawl your site to analyze meta titles, descriptions, and Open Graph tags."
      />
    </>
  );
}
