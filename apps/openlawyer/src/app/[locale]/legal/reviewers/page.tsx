import { setRequestLocale } from "next-intl/server";
import { PageHeader } from "@opensoftware/ui";
import { Users } from "lucide-react";

export default async function ReviewersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div>
      <PageHeader title="Reviewers" description="Manage document reviewers and approvals" />
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No reviewers yet</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Add reviewers to collaborate on legal documents.</p>
      </div>
    </div>
  );
}
