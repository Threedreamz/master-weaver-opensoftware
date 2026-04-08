"use client";

import { useState, useCallback, useMemo } from "react";
import { PageHeader, DataTable, StatusBadge, type Column } from "@opensoftware/ui";
import { SessionGuard } from "@/components/auth/SessionGuard";
import {
  ArrowRight,
  Plus,
  Trash2,
  Download,
  Upload,
  Search,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RedirectType = 301 | 302;

interface Redirect {
  id: string;
  source: string;
  target: string;
  type: RedirectType;
  hits: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_REDIRECTS: Redirect[] = [
  { id: "rd-1", source: "/old-about", target: "/about", type: 301, hits: 1247, createdAt: "2026-01-15" },
  { id: "rd-2", source: "/blog/old-post", target: "/blog/new-post", type: 301, hits: 892, createdAt: "2026-02-01" },
  { id: "rd-3", source: "/temp-promo", target: "/products/sale", type: 302, hits: 456, createdAt: "2026-03-01" },
  { id: "rd-4", source: "/services", target: "/products", type: 301, hits: 2103, createdAt: "2025-11-20" },
  { id: "rd-5", source: "/old-contact", target: "/contact", type: 301, hits: 334, createdAt: "2026-01-30" },
  { id: "rd-6", source: "/seasonal-landing", target: "/products/spring-collection", type: 302, hits: 78, createdAt: "2026-03-10" },
  { id: "rd-7", source: "/legacy/docs", target: "/documentation", type: 301, hits: 567, createdAt: "2025-09-15" },
  { id: "rd-8", source: "/pricing-old", target: "/pricing", type: 301, hits: 1890, createdAt: "2025-12-01" },
];

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

interface ValidationError {
  field: string;
  message: string;
}

function validateRedirect(
  source: string,
  target: string,
  existing: Redirect[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!source.startsWith("/")) {
    errors.push({ field: "source", message: "Source must start with /" });
  }
  if (!target.startsWith("/") && !target.startsWith("http")) {
    errors.push({ field: "target", message: "Target must start with / or http" });
  }
  if (source === target) {
    errors.push({ field: "target", message: "Source and target cannot be the same (redirect loop)" });
  }

  // Chain detection
  const existingAsSource = existing.find((r) => r.source === target);
  if (existingAsSource) {
    errors.push({
      field: "target",
      message: `Creates redirect chain: ${target} already redirects to ${existingAsSource.target}`,
    });
  }

  // Duplicate source
  if (existing.some((r) => r.source === source)) {
    errors.push({ field: "source", message: "A redirect for this source URL already exists" });
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RedirectsPage() {
  const [redirects, setRedirects] = useState(MOCK_REDIRECTS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [search, setSearch] = useState("");

  // Form state
  const [newSource, setNewSource] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newType, setNewType] = useState<RedirectType>(301);
  const [formErrors, setFormErrors] = useState<ValidationError[]>([]);

  // Test redirect state
  const [testUrl, setTestUrl] = useState("");
  const [testResult, setTestResult] = useState<{ found: boolean; redirect?: Redirect } | null>(null);

  const filtered = useMemo(() => {
    if (!search) return redirects;
    const q = search.toLowerCase();
    return redirects.filter(
      (r) => r.source.toLowerCase().includes(q) || r.target.toLowerCase().includes(q)
    );
  }, [redirects, search]);

  const totalHits = redirects.reduce((sum, r) => sum + r.hits, 0);
  const permanent = redirects.filter((r) => r.type === 301).length;
  const temporary = redirects.filter((r) => r.type === 302).length;

  const handleAdd = useCallback(() => {
    const source = newSource.trim();
    const target = newTarget.trim();
    const errors = validateRedirect(source, target, redirects);

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    const redirect: Redirect = {
      id: `rd-${Date.now()}`,
      source: source.startsWith("/") ? source : `/${source}`,
      target,
      type: newType,
      hits: 0,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setRedirects((prev) => [redirect, ...prev]);
    setNewSource("");
    setNewTarget("");
    setNewType(301);
    setFormErrors([]);
    setShowAddForm(false);
  }, [newSource, newTarget, newType, redirects]);

  const handleDelete = useCallback((id: string) => {
    setRedirects((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleTestRedirect = useCallback(() => {
    const url = testUrl.trim();
    if (!url) return;
    const match = redirects.find((r) => r.source === url);
    setTestResult(match ? { found: true, redirect: match } : { found: false });
  }, [testUrl, redirects]);

  const handleExportCsv = useCallback(() => {
    const header = "source,target,type,hits,created_at";
    const rows = redirects.map((r) => `${r.source},${r.target},${r.type},${r.hits},${r.createdAt}`);
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "redirects.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [redirects]);

  const getFieldError = (field: string) => formErrors.find((e) => e.field === field)?.message;

  const columns: Column<Redirect>[] = [
    {
      key: "source",
      header: "Source",
      render: (row) => (
        <span className="font-mono text-sm text-gray-900 dark:text-white">{row.source}</span>
      ),
    },
    {
      key: "arrow",
      header: "",
      className: "w-8",
      render: () => <ArrowRight className="w-4 h-4 text-gray-400" aria-hidden="true" />,
    },
    {
      key: "target",
      header: "Target",
      render: (row) => (
        <span className="font-mono text-sm text-blue-600 dark:text-blue-400">{row.target}</span>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (row) => (
        <StatusBadge status={row.type === 301 ? "active" : "pending"}>
          {row.type}
        </StatusBadge>
      ),
    },
    {
      key: "hits",
      header: "Hits",
      render: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
          {row.hits.toLocaleString()}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (row) => <span className="text-xs text-gray-500 dark:text-gray-400">{row.createdAt}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <button
          onClick={() => handleDelete(row.id)}
          className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label={`Delete redirect from ${row.source}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <SessionGuard requiredRole="editor">
      <PageHeader
        title="Redirect Manager"
        description="Manage URL redirects for your site"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Export CSV
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add Redirect
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
        <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <ArrowRight className="w-5 h-5 text-blue-500" aria-hidden="true" />
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{redirects.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Redirects</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-lg border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/20">
          <div className="w-3 h-3 rounded-full bg-green-500" aria-hidden="true" />
          <div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{permanent}</p>
            <p className="text-xs text-green-600 dark:text-green-400">Permanent (301)</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-lg border border-yellow-200 dark:border-yellow-900/50 bg-yellow-50 dark:bg-yellow-900/20">
          <div className="w-3 h-3 rounded-full bg-yellow-500" aria-hidden="true" />
          <div>
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{temporary}</p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">Temporary (302)</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <ExternalLink className="w-5 h-5 text-gray-500" aria-hidden="true" />
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalHits.toLocaleString()}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Hits</p>
          </div>
        </div>
      </div>

      {/* Add redirect form */}
      {showAddForm && (
        <div className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">New Redirect</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label htmlFor="redirect-source" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Source URL
              </label>
              <input
                id="redirect-source"
                type="text"
                value={newSource}
                onChange={(e) => { setNewSource(e.target.value); setFormErrors([]); }}
                placeholder="/old-path"
                className={`w-full rounded-md border ${getFieldError("source") ? "border-red-500" : "border-gray-300 dark:border-gray-600"} bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {getFieldError("source") && (
                <p className="text-xs text-red-500 mt-1">{getFieldError("source")}</p>
              )}
            </div>
            <div>
              <label htmlFor="redirect-target" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Target URL
              </label>
              <input
                id="redirect-target"
                type="text"
                value={newTarget}
                onChange={(e) => { setNewTarget(e.target.value); setFormErrors([]); }}
                placeholder="/new-path"
                className={`w-full rounded-md border ${getFieldError("target") ? "border-red-500" : "border-gray-300 dark:border-gray-600"} bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {getFieldError("target") && (
                <p className="text-xs text-red-500 mt-1">{getFieldError("target")}</p>
              )}
            </div>
            <div>
              <label htmlFor="redirect-type" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Type
              </label>
              <select
                id="redirect-type"
                value={newType}
                onChange={(e) => setNewType(parseInt(e.target.value) as RedirectType)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={301}>301 (Permanent)</option>
                <option value={302}>302 (Temporary)</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test redirect */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Test Redirect</h3>
        <div className="flex items-center gap-2">
          <label htmlFor="test-redirect-url" className="sr-only">URL to test</label>
          <input
            id="test-redirect-url"
            type="text"
            value={testUrl}
            onChange={(e) => { setTestUrl(e.target.value); setTestResult(null); }}
            onKeyDown={(e) => e.key === "Enter" && handleTestRedirect()}
            placeholder="Enter a URL to test, e.g. /old-about"
            className="flex-1 max-w-md rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleTestRedirect}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Search className="w-4 h-4" aria-hidden="true" />
            Test
          </button>
        </div>
        {testResult && (
          <div className={`mt-3 flex items-center gap-2 text-sm ${testResult.found ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
            {testResult.found ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Redirects to{" "}
                  <span className="font-mono font-medium">{testResult.redirect!.target}</span>
                  {" "}({testResult.redirect!.type})
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" />
                <span>No redirect found for this URL.</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Search and table */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
          <label htmlFor="redirect-search" className="sr-only">Search redirects</label>
          <input
            id="redirect-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by source or target URL..."
            className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(row) => row.id}
          emptyMessage="No redirects found. Add your first redirect."
        />
      </div>
    </SessionGuard>
  );
}
