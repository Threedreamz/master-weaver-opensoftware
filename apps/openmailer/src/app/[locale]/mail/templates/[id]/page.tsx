"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@opensoftware/ui";
import { SessionGuard } from "@/components/auth/SessionGuard";
import { TemplateEditor } from "@/components/mail/TemplateEditor";
import { ArrowLeft, Save, Send, Monitor, Smartphone } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TemplateData {
  id: string;
  name: string;
  subject: string;
  category: "transactional" | "marketing" | "system";
  html: string;
  status: "draft" | "published";
}

// ---------------------------------------------------------------------------
// Mock template lookup
// ---------------------------------------------------------------------------

const MOCK_TEMPLATES: Record<string, TemplateData> = {
  "tpl-1": {
    id: "tpl-1",
    name: "Welcome Email",
    subject: "Welcome to {{company}}!",
    category: "transactional",
    status: "published",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Welcome</title></head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px;">
    <h1 style="color: #1f2937; margin-bottom: 16px;">Welcome, {{name}}!</h1>
    <p style="color: #4b5563; line-height: 1.6;">
      Thank you for joining <strong>{{company}}</strong>. We are excited to have you on board.
    </p>
    <p style="color: #4b5563; line-height: 1.6;">
      Click the button below to get started:
    </p>
    <a href="{{action_url}}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
      Get Started
    </a>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
    <p style="font-size: 12px; color: #9ca3af;">
      <a href="{{unsubscribe_url}}" style="color: #9ca3af;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>`,
  },
  new: {
    id: "new",
    name: "",
    subject: "",
    category: "transactional",
    status: "draft",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Email Template</title></head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px;">
    <h1 style="color: #1f2937;">Your heading here</h1>
    <p style="color: #4b5563; line-height: 1.6;">
      Write your email content here. Use variables like {{name}} and {{company}}.
    </p>
  </div>
</body>
</html>`,
  },
};

// ---------------------------------------------------------------------------
// Available variables
// ---------------------------------------------------------------------------

const TEMPLATE_VARIABLES = [
  { token: "{{name}}", description: "Recipient name" },
  { token: "{{email}}", description: "Recipient email" },
  { token: "{{company}}", description: "Company name" },
  { token: "{{action_url}}", description: "Call-to-action URL" },
  { token: "{{unsubscribe_url}}", description: "Unsubscribe link" },
  { token: "{{date}}", description: "Current date" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TemplateEditorPage() {
  const { locale, id } = useParams<{ locale: string; id: string }>();
  const router = useRouter();

  const initial = MOCK_TEMPLATES[id] ?? MOCK_TEMPLATES["new"];

  const [name, setName] = useState(initial.name);
  const [subject, setSubject] = useState(initial.subject);
  const [category, setCategory] = useState(initial.category);
  const [html, setHtml] = useState(initial.html);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(() => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  const handlePublish = useCallback(() => {
    handleSave();
  }, [handleSave]);

  const isNew = id === "new";

  return (
    <SessionGuard requiredRole="editor">
      <PageHeader
        title={isNew ? "New Template" : `Edit: ${initial.name || "Template"}`}
        description="Design your email template with live preview"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/${locale}/mail/templates`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Back
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-gray-700 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              {saved ? "Saved!" : "Save Draft"}
            </button>
            <button
              onClick={handlePublish}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              Publish
            </button>
          </div>
        }
      />

      {/* Template metadata */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label htmlFor="tpl-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Template Name
          </label>
          <input
            id="tpl-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Welcome Email"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="tpl-subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Subject Line
          </label>
          <input
            id="tpl-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Welcome to {{company}}!"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="tpl-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Category
          </label>
          <select
            id="tpl-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as TemplateData["category"])}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="transactional">Transactional</option>
            <option value="marketing">Marketing</option>
            <option value="system">System</option>
          </select>
        </div>
      </div>

      {/* Variable helpers */}
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          Available variables (click to copy):
        </p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_VARIABLES.map((v) => (
            <button
              key={v.token}
              onClick={() => navigator.clipboard.writeText(v.token)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              title={v.description}
            >
              {v.token}
            </button>
          ))}
        </div>
      </div>

      {/* Preview mode toggle */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-600 dark:text-gray-400">Preview:</span>
        <button
          onClick={() => setPreviewMode("desktop")}
          className={`p-1.5 rounded ${previewMode === "desktop" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
          aria-pressed={previewMode === "desktop"}
          aria-label="Desktop preview"
        >
          <Monitor className="w-4 h-4" />
        </button>
        <button
          onClick={() => setPreviewMode("mobile")}
          className={`p-1.5 rounded ${previewMode === "mobile" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
          aria-pressed={previewMode === "mobile"}
          aria-label="Mobile preview"
        >
          <Smartphone className="w-4 h-4" />
        </button>
      </div>

      {/* Editor + Preview split */}
      <TemplateEditor
        html={html}
        onChange={setHtml}
        previewMode={previewMode}
      />
    </SessionGuard>
  );
}
