import { setRequestLocale } from "next-intl/server";
import { PageHeader } from "@opensoftware/ui";
import { FileText } from "lucide-react";

export default async function DocumentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div>
      <PageHeader title="Documents" description="Legal documents and files" />
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No documents yet</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Upload or create your first legal document.</p>
      </div>
    </div>
  );
}
