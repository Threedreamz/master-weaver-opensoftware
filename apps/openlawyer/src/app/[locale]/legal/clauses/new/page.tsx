"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@opensoftware/ui";
import { SessionGuard } from "@/components/auth/SessionGuard";
import { ArrowLeft, Save, Plus, X } from "lucide-react";

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

const CATEGORY_LABELS: Record<ClauseCategory, string> = {
  nda: "NDA",
  terms: "Terms",
  liability: "Liability",
  ip: "Intellectual Property",
  "data-protection": "Data Protection",
  "payment-terms": "Payment Terms",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewClausePage() {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<ClauseCategory>("nda");
  const [jurisdiction, setJurisdiction] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saved, setSaved] = useState(false);

  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag]);
    }
    setTagInput("");
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleSave = useCallback(() => {
    if (!title.trim() || !body.trim()) return;
    setSaved(true);
    setTimeout(() => {
      router.push(`/${locale}/legal/clauses`);
    }, 1000);
  }, [title, body, locale, router]);

  return (
    <SessionGuard requiredRole="editor">
      <PageHeader
        title="New Clause"
        description="Add a reusable clause to your library"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/${locale}/legal/clauses`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Back
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim() || !body.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              {saved ? "Saved!" : "Save Clause"}
            </button>
          </div>
        }
      />

      <div className="max-w-2xl space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="clause-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="clause-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Standard Non-Disclosure Agreement"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Body */}
        <div>
          <label htmlFor="clause-body" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Clause Text <span className="text-red-500">*</span>
          </label>
          <textarea
            id="clause-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            placeholder="Enter the full legal clause text..."
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>

        {/* Category and Jurisdiction */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="clause-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              id="clause-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ClauseCategory)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {(Object.entries(CATEGORY_LABELS) as [ClauseCategory, string][]).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="clause-jurisdiction" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Jurisdiction
            </label>
            <input
              id="clause-jurisdiction"
              type="text"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              placeholder="e.g. Germany (DE), EU, International"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="clause-tag-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tags
          </label>
          <div className="flex items-center gap-2 mb-2">
            <input
              id="clause-tag-input"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
              placeholder="Add a tag..."
              className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddTag}
              type="button"
              className="inline-flex items-center gap-1 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-gray-400 hover:text-red-500 focus:outline-none"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Version info */}
        <p className="text-xs text-gray-400 dark:text-gray-500">
          This will be saved as version 1. Subsequent edits will auto-increment the version number.
        </p>
      </div>
    </SessionGuard>
  );
}
