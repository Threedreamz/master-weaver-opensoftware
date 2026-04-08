import { PageHeader, EmptyState } from "@opensoftware/ui";
import { FileSearch } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function SeoAuditPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="SEO Audit"
        description="Analyze your website for SEO issues and optimization opportunities"
      />
      <EmptyState
        icon={<FileSearch className="w-12 h-12" />}
        title="No audits yet"
        description="Run your first SEO audit to identify issues and improvement opportunities."
      />
    </>
  );
}
