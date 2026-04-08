"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@opensoftware/ui";
import { SessionGuard } from "@/components/auth/SessionGuard";
import {
  Bot,
  Plus,
  Trash2,
  Save,
  Eye,
  Code2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RobotsRule {
  id: string;
  userAgent: string;
  directive: "allow" | "disallow";
  path: string;
}

// ---------------------------------------------------------------------------
// Default content
// ---------------------------------------------------------------------------

const DEFAULT_ROBOTS_TXT = `# robots.txt for opensem
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /login

User-agent: Googlebot
Allow: /
Disallow: /api/

Sitemap: https://example.com/sitemap.xml`;

const DEFAULT_RULES: RobotsRule[] = [
  { id: "r-1", userAgent: "*", directive: "allow", path: "/" },
  { id: "r-2", userAgent: "*", directive: "disallow", path: "/api/" },
  { id: "r-3", userAgent: "*", directive: "disallow", path: "/admin/" },
  { id: "r-4", userAgent: "*", directive: "disallow", path: "/login" },
  { id: "r-5", userAgent: "Googlebot", directive: "allow", path: "/" },
  { id: "r-6", userAgent: "Googlebot", directive: "disallow", path: "/api/" },
];

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

function validateRobotsTxt(content: string): ValidationResult {
  const lines = content.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
  const errors: string[] = [];
  const warnings: string[] = [];

  let hasUserAgent = false;
  for (const line of lines) {
    const lower = line.toLowerCase().trim();
    if (lower.startsWith("user-agent:")) {
      hasUserAgent = true;
    } else if (lower.startsWith("allow:") || lower.startsWith("disallow:")) {
      if (!hasUserAgent) {
        errors.push("Allow/Disallow found before any User-agent directive.");
      }
    } else if (lower.startsWith("sitemap:")) {
      // OK
    } else if (lower.startsWith("crawl-delay:")) {
      warnings.push("Crawl-delay is not universally supported.");
    } else {
      warnings.push(`Unknown directive: "${line.trim()}"`);
    }
  }

  if (!hasUserAgent) {
    errors.push("No User-agent directive found.");
  }

  if (!content.toLowerCase().includes("sitemap:")) {
    warnings.push("No Sitemap directive found. Consider adding one.");
  }

  return { valid: errors.length === 0, warnings, errors };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RobotsPage() {
  const [mode, setMode] = useState<"visual" | "code">("visual");
  const [content, setContent] = useState(DEFAULT_ROBOTS_TXT);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [saved, setSaved] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  // New rule form state
  const [newUserAgent, setNewUserAgent] = useState("*");
  const [newDirective, setNewDirective] = useState<"allow" | "disallow">("disallow");
  const [newPath, setNewPath] = useState("");

  const validation = validateRobotsTxt(content);

  const handleAddRule = useCallback(() => {
    const path = newPath.trim();
    if (!path) return;
    const rule: RobotsRule = {
      id: `r-${Date.now()}`,
      userAgent: newUserAgent.trim() || "*",
      directive: newDirective,
      path: path.startsWith("/") ? path : `/${path}`,
    };
    setRules((prev) => [...prev, rule]);
    setNewPath("");

    // Sync to text content
    rebuildContent([...rules, rule]);
  }, [newUserAgent, newDirective, newPath, rules]);

  const handleRemoveRule = useCallback((id: string) => {
    const updated = rules.filter((r) => r.id !== id);
    setRules(updated);
    rebuildContent(updated);
  }, [rules]);

  const rebuildContent = useCallback((rulesList: RobotsRule[]) => {
    const grouped = new Map<string, RobotsRule[]>();
    for (const rule of rulesList) {
      const existing = grouped.get(rule.userAgent) ?? [];
      existing.push(rule);
      grouped.set(rule.userAgent, existing);
    }

    let text = "# robots.txt\n";
    for (const [agent, agentRules] of grouped) {
      text += `\nUser-agent: ${agent}\n`;
      for (const r of agentRules) {
        text += `${r.directive === "allow" ? "Allow" : "Disallow"}: ${r.path}\n`;
      }
    }
    text += "\nSitemap: https://example.com/sitemap.xml\n";
    setContent(text);
  }, []);

  const handleSave = useCallback(() => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  // Group rules by user-agent for display
  const groupedRules = new Map<string, RobotsRule[]>();
  for (const rule of rules) {
    const existing = groupedRules.get(rule.userAgent) ?? [];
    existing.push(rule);
    groupedRules.set(rule.userAgent, existing);
  }

  return (
    <SessionGuard requiredRole="editor">
      <PageHeader
        title="Robots.txt Editor"
        description="Configure crawling rules for search engine bots"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowValidation(!showValidation)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Eye className="w-4 h-4" aria-hidden="true" />
              Validate
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              {saved ? "Saved!" : "Save & Deploy"}
            </button>
          </div>
        }
      />

      {/* Validation panel */}
      {showValidation && (
        <div className={`rounded-lg p-4 mb-6 border ${validation.valid ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"}`}>
          <div className="flex items-center gap-2 mb-2">
            {validation.valid ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            )}
            <span className={`text-sm font-medium ${validation.valid ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
              {validation.valid ? "Valid robots.txt" : "Issues found"}
            </span>
          </div>
          {validation.errors.length > 0 && (
            <ul className="space-y-1 mb-2">
              {validation.errors.map((err, i) => (
                <li key={i} className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1">
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  {err}
                </li>
              ))}
            </ul>
          )}
          {validation.warnings.length > 0 && (
            <ul className="space-y-1">
              {validation.warnings.map((warn, i) => (
                <li key={i} className="text-xs text-yellow-600 dark:text-yellow-400 flex items-start gap-1">
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
                  {warn}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden" role="group" aria-label="Editor mode">
          <button
            onClick={() => setMode("visual")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm ${mode === "visual" ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400"} hover:bg-gray-50 dark:hover:bg-gray-700`}
            aria-pressed={mode === "visual"}
          >
            <Bot className="w-4 h-4" />
            Visual Builder
          </button>
          <button
            onClick={() => setMode("code")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm ${mode === "code" ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400"} hover:bg-gray-50 dark:hover:bg-gray-700`}
            aria-pressed={mode === "code"}
          >
            <Code2 className="w-4 h-4" />
            Code Editor
          </button>
        </div>
      </div>

      {mode === "code" ? (
        /* Code editor */
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              robots.txt
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
            rows={18}
            aria-label="robots.txt content"
            className="w-full p-4 font-mono text-sm leading-relaxed text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 resize-y focus:outline-none"
            style={{ tabSize: 2 }}
          />
        </div>
      ) : (
        /* Visual builder */
        <div className="space-y-6">
          {/* Add rule */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Add Rule</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label htmlFor="robot-user-agent" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  User-Agent
                </label>
                <input
                  id="robot-user-agent"
                  type="text"
                  value={newUserAgent}
                  onChange={(e) => setNewUserAgent(e.target.value)}
                  placeholder="*"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="robot-directive" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Directive
                </label>
                <select
                  id="robot-directive"
                  value={newDirective}
                  onChange={(e) => setNewDirective(e.target.value as "allow" | "disallow")}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="allow">Allow</option>
                  <option value="disallow">Disallow</option>
                </select>
              </div>
              <div>
                <label htmlFor="robot-path" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Path
                </label>
                <input
                  id="robot-path"
                  type="text"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddRule()}
                  placeholder="/path-to-block"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAddRule}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Grouped rules */}
          {Array.from(groupedRules.entries()).map(([agent, agentRules]) => (
            <div key={agent} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <Bot className="w-4 h-4 text-gray-500" aria-hidden="true" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  User-agent: {agent}
                </span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {agentRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          rule.directive === "allow"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                        }`}
                      >
                        {rule.directive === "allow" ? "Allow" : "Disallow"}
                      </span>
                      <span className="font-mono text-sm text-gray-900 dark:text-white">{rule.path}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveRule(rule.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                      aria-label={`Remove ${rule.directive} rule for ${rule.path}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </SessionGuard>
  );
}
