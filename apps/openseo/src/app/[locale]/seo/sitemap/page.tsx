"use client";

import { useState, useCallback } from "react";
import { PageHeader, DataTable, type Column } from "@opensoftware/ui";
import { SessionGuard } from "@/components/auth/SessionGuard";
import {
  Globe,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Download,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChangeFreq = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";

interface SitemapEntry {
  id: string;
  url: string;
  priority: number;
  changefreq: ChangeFreq;
  lastmod: string;
  valid: boolean;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_ENTRIES: SitemapEntry[] = [
  { id: "s-1", url: "/", priority: 1.0, changefreq: "daily", lastmod: "2026-03-14", valid: true },
  { id: "s-2", url: "/about", priority: 0.8, changefreq: "monthly", lastmod: "2026-03-01", valid: true },
  { id: "s-3", url: "/products", priority: 0.9, changefreq: "weekly", lastmod: "2026-03-12", valid: true },
  { id: "s-4", url: "/products/category-1", priority: 0.7, changefreq: "weekly", lastmod: "2026-03-10", valid: true },
  { id: "s-5", url: "/blog", priority: 0.8, changefreq: "daily", lastmod: "2026-03-14", valid: true },
  { id: "s-6", url: "/blog/post-1", priority: 0.6, changefreq: "monthly", lastmod: "2026-02-28", valid: true },
  { id: "s-7", url: "/contact", priority: 0.5, changefreq: "yearly", lastmod: "2026-01-15", valid: true },
  { id: "s-8", url: "/old-page", priority: 0.3, changefreq: "never", lastmod: "2025-06-01", valid: false },
  { id: "s-9", url: "/pricing", priority: 0.8, changefreq: "monthly", lastmod: "2026-03-05", valid: true },
  { id: "s-10", url: "/legal/terms", priority: 0.4, changefreq: "yearly", lastmod: "2026-01-01", valid: true },
];

const CHANGEFREQ_OPTIONS: ChangeFreq[] = [
  "always", "hourly", "daily", "weekly", "monthly", "yearly", "never",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SitemapPage() {
  const [entries, setEntries] = useState(MOCK_ENTRIES);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newPriority, setNewPriority] = useState("0.5");
  const [newChangefreq, setNewChangefreq] = useState<ChangeFreq>("weekly");
  const [regenerating, setRegenerating] = useState(false);

  const validCount = entries.filter((e) => e.valid).length;
  const invalidCount = entries.filter((e) => !e.valid).length;

  const handleAddEntry = useCallback(() => {
    const url = newUrl.trim();
    if (!url) return;
    const entry: SitemapEntry = {
      id: `s-${Date.now()}`,
      url: url.startsWith("/") ? url : `/${url}`,
      priority: parseFloat(newPriority) || 0.5,
      changefreq: newChangefreq,
      lastmod: new Date().toISOString().slice(0, 10),
      valid: true,
    };
    setEntries((prev) => [...prev, entry]);
    setNewUrl("");
    setNewPriority("0.5");
    setNewChangefreq("weekly");
    setShowAddForm(false);
  }, [newUrl, newPriority, newChangefreq]);

  const handleRemove = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleRegenerate = useCallback(() => {
    setRegenerating(true);
    setTimeout(() => setRegenerating(false), 1500);
  }, []);

  const handleUpdatePriority = useCallback((id: string, priority: number) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, priority: Math.max(0, Math.min(1, priority)) } : e))
    );
  }, []);

  const handleUpdateChangefreq = useCallback((id: string, changefreq: ChangeFreq) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, changefreq } : e))
    );
  }, []);

  const columns: Column<SitemapEntry>[] = [
    {
      key: "valid",
      header: "",
      className: "w-8",
      render: (row) =>
        row.valid ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" aria-label="Valid URL" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-orange-500" aria-label="Invalid URL" />
        ),
    },
    {
      key: "url",
      header: "URL",
      render: (row) => (
        <span className="font-mono text-sm text-gray-900 dark:text-white">{row.url}</span>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      render: (row) => (
        <input
          type="number"
          min="0"
          max="1"
          step="0.1"
          value={row.priority}
          onChange={(e) => handleUpdatePriority(row.id, parseFloat(e.target.value))}
          className="w-16 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-2 py-1 text-center text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label={`Priority for ${row.url}`}
        />
      ),
    },
    {
      key: "changefreq",
      header: "Change Freq",
      render: (row) => (
        <select
          value={row.changefreq}
          onChange={(e) => handleUpdateChangefreq(row.id, e.target.value as ChangeFreq)}
          className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs px-2 py-1 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label={`Change frequency for ${row.url}`}
        >
          {CHANGEFREQ_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ),
    },
    {
      key: "lastmod",
      header: "Last Modified",
      render: (row) => <span className="text-xs text-gray-500 dark:text-gray-400">{row.lastmod}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <button
          onClick={() => handleRemove(row.id)}
          className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label={`Remove ${row.url} from sitemap`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <SessionGuard requiredRole="editor">
      <PageHeader
        title="Sitemap Manager"
        description="Manage URLs in your sitemap.xml"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <RefreshCw className={`w-4 h-4 ${regenerating ? "animate-spin" : ""}`} aria-hidden="true" />
              {regenerating ? "Regenerating..." : "Regenerate"}
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add URL
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <Globe className="w-5 h-5 text-blue-500" aria-hidden="true" />
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{entries.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total URLs</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-lg border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/20">
          <CheckCircle2 className="w-5 h-5 text-green-500" aria-hidden="true" />
          <div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{validCount}</p>
            <p className="text-xs text-green-600 dark:text-green-400">Valid</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-lg border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-900/20">
          <AlertTriangle className="w-5 h-5 text-orange-500" aria-hidden="true" />
          <div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{invalidCount}</p>
            <p className="text-xs text-orange-600 dark:text-orange-400">Invalid / Stale</p>
          </div>
        </div>
      </div>

      {/* Add URL form */}
      {showAddForm && (
        <div className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Add New URL</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="sitemap-url" className="sr-only">URL path</label>
              <input
                id="sitemap-url"
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="/your-page-path"
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="sitemap-priority" className="sr-only">Priority</label>
              <input
                id="sitemap-priority"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                placeholder="Priority (0-1)"
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="sitemap-changefreq" className="sr-only">Change frequency</label>
              <select
                id="sitemap-changefreq"
                value={newChangefreq}
                onChange={(e) => setNewChangefreq(e.target.value as ChangeFreq)}
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CHANGEFREQ_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <button
                onClick={handleAddEntry}
                className="px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <DataTable
          columns={columns}
          data={entries}
          keyExtractor={(row) => row.id}
          emptyMessage="No URLs in sitemap. Add your first URL."
        />
      </div>
    </SessionGuard>
  );
}
