import { setRequestLocale } from "next-intl/server";
import { PageHeader } from "@opensoftware/ui";
import { FileStack } from "lucide-react";

export default async function TemplatesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div>
      <PageHeader title="Templates" description="Reusable legal document templates" />
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileStack className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No templates yet</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create reusable templates for common legal documents.</p>
      </div>
    </div>
  );
}
