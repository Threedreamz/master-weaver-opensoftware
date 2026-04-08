import { setRequestLocale } from "next-intl/server";
import { PageHeader } from "@opensoftware/ui";
import { FolderKanban } from "lucide-react";

export default async function ProjectsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div>
      <PageHeader title="Projects" description="Manage your legal projects" />
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FolderKanban className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No projects yet</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create your first legal project to get started.</p>
      </div>
    </div>
  );
}
