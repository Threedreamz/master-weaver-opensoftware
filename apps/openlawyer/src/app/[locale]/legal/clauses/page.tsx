"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader, DataTable, StatusBadge, type Column } from "@opensoftware/ui";
import { SessionGuard } from "@/components/auth/SessionGuard";
import {
  FileStack,
  Plus,
  Search,
  Copy,
  Tag,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ClauseCategory =
  | "nda"
  | "terms"
  | "liability"
  | "ip"
  | "data-protection"
  | "payment-terms";

interface LegalClause {
  id: string;
  title: string;
  body: string;
  category: ClauseCategory;
  jurisdiction: string;
  tags: string[];
  updatedAt: string;
  version: number;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<ClauseCategory, string> = {
  nda: "NDA",
  terms: "Terms",
  liability: "Liability",
  ip: "Intellectual Property",
  "data-protection": "Data Protection",
  "payment-terms": "Payment Terms",
};

const MOCK_CLAUSES: LegalClause[] = [
  {
    id: "cl-1",
    title: "Standard Non-Disclosure Agreement",
    body: "The receiving party agrees to keep confidential all information disclosed by the disclosing party during the term of this agreement and for a period of two (2) years thereafter.",
    category: "nda",
    jurisdiction: "Germany (DE)",
    tags: ["confidentiality", "standard", "bilateral"],
    updatedAt: "2026-03-10",
    version: 3,
  },
  {
    id: "cl-2",
    title: "Limitation of Liability",
    body: "In no event shall either party be liable for any indirect, incidental, special, consequential, or punitive damages, regardless of the cause of action or the theory of liability.",
    category: "liability",
    jurisdiction: "EU",
    tags: ["limitation", "standard"],
    updatedAt: "2026-03-08",
    version: 2,
  },
  {
    id: "cl-3",
    title: "GDPR Data Processing Clause",
    body: "The processor shall process personal data only on documented instructions from the controller, including with regard to transfers of personal data to a third country or an international organisation.",
    category: "data-protection",
    jurisdiction: "EU (GDPR)",
    tags: ["gdpr", "data-processing", "controller-processor"],
    updatedAt: "2026-03-12",
    version: 5,
  },
  {
    id: "cl-4",
    title: "IP Assignment Clause",
    body: "All intellectual property created by the contractor in the performance of services under this agreement shall be the sole and exclusive property of the client.",
    category: "ip",
    jurisdiction: "Germany (DE)",
    tags: ["assignment", "work-for-hire"],
    updatedAt: "2026-02-28",
    version: 1,
  },
  {
    id: "cl-5",
    title: "Net 30 Payment Terms",
    body: "Payment shall be due within thirty (30) days of the invoice date. Late payments shall accrue interest at a rate of 1.5% per month or the maximum rate permitted by applicable law, whichever is less.",
    category: "payment-terms",
    jurisdiction: "International",
    tags: ["net-30", "interest", "standard"],
    updatedAt: "2026-03-01",
    version: 2,
  },
  {
    id: "cl-6",
    title: "Terms of Service - Acceptance",
    body: "By accessing or using the Service, you agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use the Service.",
    category: "terms",
    jurisdiction: "International",
    tags: ["tos", "acceptance", "standard"],
    updatedAt: "2026-03-05",
    version: 4,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ClausesPage() {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<ClauseCategory | "all">("all");

  const filtered = MOCK_CLAUSES.filter((c) => {
    const matchesSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.body.toLowerCase().includes(search.toLowerCase()) ||
      c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = filterCategory === "all" || c.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCopyClause = (clause: LegalClause) => {
    navigator.clipboard.writeText(clause.body);
  };

  const columns: Column<LegalClause>[] = [
    {
      key: "title",
      header: "Clause",
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{row.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 max-w-md">
            {row.body}
          </p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (row) => (
        <StatusBadge status={row.category === "nda" ? "info" : row.category === "liability" ? "warning" : "active"}>
          {CATEGORY_LABELS[row.category]}
        </StatusBadge>
      ),
    },
    {
      key: "jurisdiction",
      header: "Jurisdiction",
      render: (row) => <span className="text-sm text-gray-600 dark:text-gray-300">{row.jurisdiction}</span>,
    },
    {
      key: "tags",
      header: "Tags",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            >
              {tag}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "version",
      header: "Ver.",
      render: (row) => <span className="text-xs text-gray-500 dark:text-gray-400">v{row.version}</span>,
    },
    {
      key: "updatedAt",
      header: "Updated",
      render: (row) => <span className="text-xs text-gray-500 dark:text-gray-400">{row.updatedAt}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <button
          onClick={() => handleCopyClause(row)}
          className="p-1.5 text-gray-500 hover:text-blue-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label={`Copy clause: ${row.title}`}
          title="Copy clause text"
        >
          <Copy className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <SessionGuard requiredRole="viewer">
      <PageHeader
        title="Clause Library"
        description="Reusable legal clauses for your documents"
        actions={
          <button
            onClick={() => router.push(`/${locale}/legal/clauses/new`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            New Clause
          </button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
          <label htmlFor="clause-search" className="sr-only">Search clauses</label>
          <input
            id="clause-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clauses by title, text, or tags..."
            className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <label htmlFor="clause-category" className="sr-only">Filter by category</label>
        <select
          id="clause-category"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as ClauseCategory | "all")}
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          {(Object.entries(CATEGORY_LABELS) as [ClauseCategory, string][]).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileStack className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No clauses found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Try adjusting your search or category filter.
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <DataTable
            columns={columns}
            data={filtered}
            keyExtractor={(row) => row.id}
          />
        </div>
      )}
    </SessionGuard>
  );
}
