import { setRequestLocale } from "next-intl/server";
import { PageHeader } from "@opensoftware/ui";

export default async function LegalDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div>
      <PageHeader title="Legal Dashboard" description="Overview of your legal projects and activity" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Projects</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">0</p>
        </div>
        <div className="p-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Documents</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">0</p>
        </div>
        <div className="p-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Reviews</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">0</p>
        </div>
      </div>
    </div>
  );
}
