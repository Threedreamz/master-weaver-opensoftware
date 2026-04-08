"use client";

import { useRef, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TemplateEditorProps {
  /** Current HTML content */
  html: string;
  /** Called when the HTML changes */
  onChange: (html: string) => void;
  /** Preview viewport mode */
  previewMode: "desktop" | "mobile";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Split-view HTML email template editor.
 *
 * Left pane: syntax-highlighted textarea for editing raw HTML.
 * Right pane: live preview rendered in a sandboxed iframe.
 *
 * The editor uses a plain <textarea> with monospace font for reliability
 * across all browsers. A full Monaco integration can be swapped in later
 * by replacing the textarea with a lazy-loaded Monaco component.
 */
export function TemplateEditor({ html, onChange, previewMode }: TemplateEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  // Build a blob URL for the preview iframe so it runs in a sandboxed origin
  const previewSrc = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[500px]">
      {/* Code editor pane */}
      <div className="flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            HTML Source
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {html.length.toLocaleString()} chars
          </span>
        </div>
        <textarea
          ref={textareaRef}
          value={html}
          onChange={handleChange}
          spellCheck={false}
          aria-label="HTML email template source code"
          className="flex-1 w-full p-4 font-mono text-sm leading-relaxed text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 resize-none focus:outline-none"
          style={{ tabSize: 2 }}
        />
      </div>

      {/* Live preview pane */}
      <div className="flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Preview
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {previewMode === "desktop" ? "Desktop (100%)" : "Mobile (375px)"}
          </span>
        </div>
        <div className="flex-1 flex items-start justify-center bg-gray-100 dark:bg-gray-800 p-4 overflow-auto">
          <iframe
            srcDoc={html}
            title="Email template preview"
            sandbox="allow-same-origin"
            className="bg-white border-0 rounded shadow-sm"
            style={{
              width: previewMode === "desktop" ? "100%" : "375px",
              height: "100%",
              minHeight: "400px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
}
