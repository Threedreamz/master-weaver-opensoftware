"use client";

import { useState, useCallback } from "react";
import { PageHeader, DataTable, StatusBadge, type Column } from "@opensoftware/ui";
import { SessionGuard } from "@/components/auth/SessionGuard";
import {
  AlertTriangle,
  ShieldBan,
  RotateCcw,
  Plus,
  Trash2,
  Download,
  Upload,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BounceType = "hard" | "soft" | "complaint";

interface BounceRecord {
  id: string;
  email: string;
  type: BounceType;
  reason: string;
  timestamp: string;
  originalSubject: string;
  suppressed: boolean;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_BOUNCES: BounceRecord[] = [
  { id: "b-1", email: "invalid@nonexistent.xyz", type: "hard", reason: "Domain does not exist (550 5.1.1)", timestamp: "2026-03-14 08:12", originalSubject: "Welcome email", suppressed: true },
  { id: "b-2", email: "full@example.com", type: "soft", reason: "Mailbox full (452 4.2.2)", timestamp: "2026-03-14 07:45", originalSubject: "Weekly digest", suppressed: false },
  { id: "b-3", email: "old-account@legacy.com", type: "hard", reason: "User unknown (550 5.1.1)", timestamp: "2026-03-13 16:30", originalSubject: "Monthly newsletter", suppressed: true },
  { id: "b-4", email: "spam-reporter@example.com", type: "complaint", reason: "Marked as spam by recipient", timestamp: "2026-03-13 14:22", originalSubject: "Promotional offer", suppressed: true },
  { id: "b-5", email: "temp-down@example.com", type: "soft", reason: "Server temporarily unavailable (451)", timestamp: "2026-03-13 11:05", originalSubject: "Order confirmation", suppressed: false },
  { id: "b-6", email: "blocked@corporate.net", type: "hard", reason: "Recipient rejected (550 5.7.1)", timestamp: "2026-03-12 09:18", originalSubject: "Invoice #2048", suppressed: true },
  { id: "b-7", email: "overquota@example.com", type: "soft", reason: "Quota exceeded (452 4.2.2)", timestamp: "2026-03-12 08:00", originalSubject: "Password reset", suppressed: false },
];

const BOUNCE_TYPE_LABELS: Record<BounceType, string> = {
  hard: "Hard Bounce",
  soft: "Soft Bounce",
  complaint: "Complaint",
};

const BOUNCE_TYPE_STATUS: Record<BounceType, string> = {
  hard: "error",
  soft: "warning",
  complaint: "critical",
};

// ---------------------------------------------------------------------------
// Suppression list
// ---------------------------------------------------------------------------

const INITIAL_SUPPRESSION = MOCK_BOUNCES.filter((b) => b.suppressed).map((b) => b.email);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BouncesPage() {
  const [bounces, setBounces] = useState(MOCK_BOUNCES);
  const [suppressionList, setSuppressionList] = useState<string[]>(INITIAL_SUPPRESSION);
  const [filterType, setFilterType] = useState<BounceType | "all">("all");
  const [activeTab, setActiveTab] = useState<"bounces" | "suppression">("bounces");
  const [newSuppressEmail, setNewSuppressEmail] = useState("");

  const filtered = filterType === "all" ? bounces : bounces.filter((b) => b.type === filterType);

  const handleAddToSuppression = useCallback((email: string) => {
    setSuppressionList((prev) => (prev.includes(email) ? prev : [...prev, email]));
    setBounces((prev) => prev.map((b) => (b.email === email ? { ...b, suppressed: true } : b)));
  }, []);

  const handleRemoveFromSuppression = useCallback((email: string) => {
    setSuppressionList((prev) => prev.filter((e) => e !== email));
    setBounces((prev) => prev.map((b) => (b.email === email ? { ...b, suppressed: false } : b)));
  }, []);

  const handleRetrySoft = useCallback(() => {
    setBounces((prev) => prev.filter((b) => b.type !== "soft" || b.suppressed));
  }, []);

  const handleAddManualSuppression = useCallback(() => {
    const email = newSuppressEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) return;
    handleAddToSuppression(email);
    setNewSuppressEmail("");
  }, [newSuppressEmail, handleAddToSuppression]);

  const hardCount = bounces.filter((b) => b.type === "hard").length;
  const softCount = bounces.filter((b) => b.type === "soft").length;
  const complaintCount = bounces.filter((b) => b.type === "complaint").length;

  const bounceColumns: Column<BounceRecord>[] = [
    {
      key: "email",
      header: "Email",
      render: (row) => (
        <div>
          <span className="font-medium text-gray-900 dark:text-white">{row.email}</span>
          {row.suppressed && (
            <span className="ml-2 text-xs text-red-500 dark:text-red-400">(suppressed)</span>
          )}
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (row) => <StatusBadge status={BOUNCE_TYPE_STATUS[row.type]} className="capitalize">{BOUNCE_TYPE_LABELS[row.type]}</StatusBadge>,
    },
    {
      key: "reason",
      header: "Reason",
      render: (row) => (
        <span className="text-gray-600 dark:text-gray-300 text-xs truncate max-w-[250px] block">
          {row.reason}
        </span>
      ),
    },
    {
      key: "timestamp",
      header: "Time",
      render: (row) => <span className="text-gray-500 dark:text-gray-400 text-xs">{row.timestamp}</span>,
    },
    {
      key: "originalSubject",
      header: "Original Message",
      render: (row) => <span className="text-gray-500 dark:text-gray-400 text-xs">{row.originalSubject}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {!row.suppressed && (
            <button
              onClick={() => handleAddToSuppression(row.email)}
              className="p-1.5 text-gray-500 hover:text-red-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-xs"
              aria-label={`Suppress ${row.email}`}
              title="Add to suppression list"
            >
              <ShieldBan className="w-4 h-4" />
            </button>
          )}
          {row.type === "soft" && (
            <button
              onClick={() => setBounces((prev) => prev.filter((b) => b.id !== row.id))}
              className="p-1.5 text-gray-500 hover:text-green-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label={`Retry ${row.email}`}
              title="Retry delivery"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <SessionGuard requiredRole="viewer">
      <PageHeader
        title="Bounce Management"
        description="Track bounced emails and manage your suppression list"
        actions={
          <button
            onClick={handleRetrySoft}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Retry All Soft Bounces
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
        <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <AlertTriangle className="w-5 h-5 text-gray-500" aria-hidden="true" />
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{bounces.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Bounces</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20">
          <div className="w-3 h-3 rounded-full bg-red-500" aria-hidden="true" />
          <div>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">{hardCount}</p>
            <p className="text-xs text-red-600 dark:text-red-400">Hard Bounces</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-lg border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-900/20">
          <div className="w-3 h-3 rounded-full bg-orange-500" aria-hidden="true" />
          <div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{softCount}</p>
            <p className="text-xs text-orange-600 dark:text-orange-400">Soft Bounces</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-lg border border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-900/20">
          <div className="w-3 h-3 rounded-full bg-purple-500" aria-hidden="true" />
          <div>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{complaintCount}</p>
            <p className="text-xs text-purple-600 dark:text-purple-400">Complaints</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === "bounces"}
          onClick={() => setActiveTab("bounces")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "bounces"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Bounces ({bounces.length})
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "suppression"}
          onClick={() => setActiveTab("suppression")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "suppression"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Suppression List ({suppressionList.length})
        </button>
      </div>

      {activeTab === "bounces" && (
        <>
          {/* Filter */}
          <div className="flex items-center gap-2 mb-4">
            <label htmlFor="bounce-type-filter" className="sr-only">Filter by bounce type</label>
            <select
              id="bounce-type-filter"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as BounceType | "all")}
              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-1.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="hard">Hard Bounces</option>
              <option value="soft">Soft Bounces</option>
              <option value="complaint">Complaints</option>
            </select>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <DataTable
              columns={bounceColumns}
              data={filtered}
              keyExtractor={(row) => row.id}
              emptyMessage="No bounces matching the current filter."
            />
          </div>
        </>
      )}

      {activeTab === "suppression" && (
        <div>
          {/* Add email to suppression */}
          <div className="flex items-center gap-2 mb-4">
            <label htmlFor="suppress-email" className="sr-only">Email to suppress</label>
            <input
              id="suppress-email"
              type="email"
              value={newSuppressEmail}
              onChange={(e) => setNewSuppressEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddManualSuppression()}
              placeholder="Enter email to suppress..."
              className="flex-1 max-w-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddManualSuppression}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add
            </button>
          </div>

          {/* Suppression list */}
          {suppressionList.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No emails in the suppression list.
            </div>
          ) : (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-800">
              {suppressionList.map((email) => (
                <div key={email} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-900 dark:text-white font-mono">{email}</span>
                  <button
                    onClick={() => handleRemoveFromSuppression(email)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-label={`Remove ${email} from suppression list`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </SessionGuard>
  );
}
