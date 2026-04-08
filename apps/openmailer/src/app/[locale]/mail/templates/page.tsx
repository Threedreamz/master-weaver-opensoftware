"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader, StatusBadge } from "@opensoftware/ui";
import { SessionGuard } from "@/components/auth/SessionGuard";
import {
  FileStack,
  Plus,
  Copy,
  Trash2,
  Pencil,
  Eye,
  LayoutGrid,
  List,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TemplateCategory = "transactional" | "marketing" | "system";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: TemplateCategory;
  status: "draft" | "published";
  updatedAt: string;
  previewColor: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_TEMPLATES: EmailTemplate[] = [
  {
    id: "tpl-1",
    name: "Welcome Email",
    subject: "Welcome to {{company}}!",
    category: "transactional",
    status: "published",
    updatedAt: "2026-03-10",
    previewColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    id: "tpl-2",
    name: "Password Reset",
    subject: "Reset your password",
    category: "transactional",
    status: "published",
    updatedAt: "2026-03-08",
    previewColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  {
    id: "tpl-3",
    name: "Monthly Newsletter",
    subject: "{{company}} - Monthly Update",
    category: "marketing",
    status: "draft",
    updatedAt: "2026-03-12",
    previewColor: "bg-green-100 dark:bg-green-900/30",
  },
  {
    id: "tpl-4",
    name: "System Alert",
    subject: "Action Required: {{alert_title}}",
    category: "system",
    status: "published",
    updatedAt: "2026-02-28",
    previewColor: "bg-red-100 dark:bg-red-900/30",
  },
  {
    id: "tpl-5",
    name: "Promotional Offer",
    subject: "Exclusive offer for you, {{name}}!",
    category: "marketing",
    status: "draft",
    updatedAt: "2026-03-14",
    previewColor: "bg-purple-100 dark:bg-purple-900/30",
  },
];

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  transactional: "Transactional",
  marketing: "Marketing",
  system: "System",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TemplatesPage() {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filterCategory, setFilterCategory] = useState<TemplateCategory | "all">("all");
  const [templates, setTemplates] = useState(MOCK_TEMPLATES);

  const filtered =
    filterCategory === "all"
      ? templates
      : templates.filter((t) => t.category === filterCategory);

  function handleDelete(id: string) {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  function handleDuplicate(template: EmailTemplate) {
    const copy: EmailTemplate = {
      ...template,
      id: `tpl-${Date.now()}`,
      name: `${template.name} (Copy)`,
      status: "draft",
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    setTemplates((prev) => [copy, ...prev]);
  }

  return (
    <SessionGuard requiredRole="viewer">
      <PageHeader
        title="Email Templates"
        description="Create and manage reusable email templates"
        actions={
          <button
            onClick={() => router.push(`/${locale}/mail/templates/new`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            New Template
          </button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {/* Category filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="category-filter" className="sr-only">
            Filter by category
          </label>
          <select
            id="category-filter"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as TemplateCategory | "all")}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-1.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {(Object.entries(CATEGORY_LABELS) as [TemplateCategory, string][]).map(
              ([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              )
            )}
          </select>
        </div>

        {/* View toggle */}
        <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden" role="group" aria-label="View mode">
          <button
            onClick={() => setView("grid")}
            className={`p-2 ${view === "grid" ? "bg-gray-100 dark:bg-gray-700" : "bg-white dark:bg-gray-800"} hover:bg-gray-50 dark:hover:bg-gray-700`}
            aria-pressed={view === "grid"}
            aria-label="Grid view"
          >
            <LayoutGrid className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-2 ${view === "list" ? "bg-gray-100 dark:bg-gray-700" : "bg-white dark:bg-gray-800"} hover:bg-gray-50 dark:hover:bg-gray-700`}
            aria-pressed={view === "list"}
            aria-label="List view"
          >
            <List className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Templates */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileStack className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No templates found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create your first email template to get started.
          </p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((tpl) => (
            <article
              key={tpl.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Preview thumbnail */}
              <div
                className={`h-32 ${tpl.previewColor} flex items-center justify-center`}
                aria-hidden="true"
              >
                <FileStack className="w-10 h-10 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">
                    {tpl.name}
                  </h3>
                  <StatusBadge status={tpl.status} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">
                  {tpl.subject}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                  {CATEGORY_LABELS[tpl.category]} &middot; Updated {tpl.updatedAt}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => router.push(`/${locale}/mail/templates/${tpl.id}`)}
                    className="p-1.5 text-gray-500 hover:text-blue-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-label={`Edit ${tpl.name}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => router.push(`/${locale}/mail/templates/${tpl.id}?preview=true`)}
                    className="p-1.5 text-gray-500 hover:text-blue-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-label={`Preview ${tpl.name}`}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicate(tpl)}
                    className="p-1.5 text-gray-500 hover:text-blue-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-label={`Duplicate ${tpl.name}`}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(tpl.id)}
                    className="p-1.5 text-gray-500 hover:text-red-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-label={`Delete ${tpl.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        /* List view */
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Subject</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Category</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Updated</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tpl) => (
                <tr
                  key={tpl.id}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{tpl.name}</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-300 truncate max-w-[200px]">{tpl.subject}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{CATEGORY_LABELS[tpl.category]}</span>
                  </td>
                  <td className="py-3 px-4"><StatusBadge status={tpl.status} /></td>
                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{tpl.updatedAt}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => router.push(`/${locale}/mail/templates/${tpl.id}`)} className="p-1.5 text-gray-500 hover:text-blue-600 rounded" aria-label={`Edit ${tpl.name}`}><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDuplicate(tpl)} className="p-1.5 text-gray-500 hover:text-blue-600 rounded" aria-label={`Duplicate ${tpl.name}`}><Copy className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(tpl.id)} className="p-1.5 text-gray-500 hover:text-red-600 rounded" aria-label={`Delete ${tpl.name}`}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SessionGuard>
  );
}
