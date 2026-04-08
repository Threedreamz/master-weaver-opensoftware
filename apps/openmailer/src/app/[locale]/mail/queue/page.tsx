"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, DataTable, StatusBadge, type Column } from "@opensoftware/ui";
import { SessionGuard } from "@/components/auth/SessionGuard";
import {
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Ban,
  Eye,
  RotateCcw,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type QueueStatus = "queued" | "sending" | "sent" | "failed" | "bounced";

interface QueueItem {
  id: string;
  recipient: string;
  subject: string;
  status: QueueStatus;
  scheduledAt: string;
  sentAt: string | null;
  retryCount: number;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_QUEUE: QueueItem[] = [
  { id: "q-1", recipient: "anna@example.com", subject: "Welcome to our platform!", status: "sent", scheduledAt: "2026-03-14 09:00", sentAt: "2026-03-14 09:00", retryCount: 0, error: null },
  { id: "q-2", recipient: "bob@example.com", subject: "Your invoice #1042", status: "sent", scheduledAt: "2026-03-14 09:05", sentAt: "2026-03-14 09:05", retryCount: 0, error: null },
  { id: "q-3", recipient: "charlie@example.com", subject: "Password reset request", status: "sending", scheduledAt: "2026-03-14 10:00", sentAt: null, retryCount: 0, error: null },
  { id: "q-4", recipient: "diana@example.com", subject: "Monthly newsletter - March", status: "queued", scheduledAt: "2026-03-14 12:00", sentAt: null, retryCount: 0, error: null },
  { id: "q-5", recipient: "invalid@bad-domain.xyz", subject: "Welcome email", status: "failed", scheduledAt: "2026-03-14 08:30", sentAt: null, retryCount: 3, error: "DNS lookup failed for bad-domain.xyz" },
  { id: "q-6", recipient: "full-mailbox@example.com", subject: "Weekly digest", status: "bounced", scheduledAt: "2026-03-14 07:00", sentAt: null, retryCount: 2, error: "Mailbox full (552)" },
  { id: "q-7", recipient: "eve@example.com", subject: "Your order confirmation", status: "queued", scheduledAt: "2026-03-14 13:00", sentAt: null, retryCount: 0, error: null },
  { id: "q-8", recipient: "frank@example.com", subject: "Promotional offer", status: "failed", scheduledAt: "2026-03-13 16:00", sentAt: null, retryCount: 3, error: "Connection timeout" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_ICONS: Record<QueueStatus, typeof Mail> = {
  queued: Clock,
  sending: RefreshCw,
  sent: CheckCircle2,
  failed: XCircle,
  bounced: AlertTriangle,
};

function getStatusCount(items: QueueItem[], status: QueueStatus) {
  return items.filter((i) => i.status === status).length;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QueuePage() {
  const [items, setItems] = useState(MOCK_QUEUE);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [filterStatus, setFilterStatus] = useState<QueueStatus | "all">("all");
  const [selectedDetail, setSelectedDetail] = useState<QueueItem | null>(null);

  // Simulated auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      // In production this would fetch from an API
      setItems((prev) => [...prev]);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const filtered = filterStatus === "all" ? items : items.filter((i) => i.status === filterStatus);

  const handleRetry = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "queued" as QueueStatus, retryCount: i.retryCount + 1, error: null } : i))
    );
  }, []);

  const handleCancel = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const stats: { label: string; status: QueueStatus; color: string }[] = [
    { label: "Queued", status: "queued", color: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300" },
    { label: "Sending", status: "sending", color: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" },
    { label: "Sent", status: "sent", color: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300" },
    { label: "Failed", status: "failed", color: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300" },
    { label: "Bounced", status: "bounced", color: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300" },
  ];

  const columns: Column<QueueItem>[] = [
    {
      key: "recipient",
      header: "Recipient",
      render: (row) => <span className="font-medium text-gray-900 dark:text-white">{row.recipient}</span>,
    },
    {
      key: "subject",
      header: "Subject",
      render: (row) => <span className="text-gray-600 dark:text-gray-300 truncate max-w-[200px] block">{row.subject}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "scheduledAt",
      header: "Scheduled",
      render: (row) => <span className="text-gray-500 dark:text-gray-400 text-xs">{row.scheduledAt}</span>,
    },
    {
      key: "retryCount",
      header: "Retries",
      render: (row) => (
        <span className={`text-xs ${row.retryCount > 0 ? "text-orange-600 dark:text-orange-400 font-medium" : "text-gray-400 dark:text-gray-500"}`}>
          {row.retryCount}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedDetail(row); }}
            className="p-1.5 text-gray-500 hover:text-blue-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label={`View details for ${row.recipient}`}
          >
            <Eye className="w-4 h-4" />
          </button>
          {row.status === "failed" && (
            <button
              onClick={(e) => { e.stopPropagation(); handleRetry(row.id); }}
              className="p-1.5 text-gray-500 hover:text-green-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label={`Retry sending to ${row.recipient}`}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          {row.status === "queued" && (
            <button
              onClick={(e) => { e.stopPropagation(); handleCancel(row.id); }}
              className="p-1.5 text-gray-500 hover:text-red-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label={`Cancel email to ${row.recipient}`}
            >
              <Ban className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <SessionGuard requiredRole="viewer">
      <PageHeader
        title="Email Queue"
        description="Monitor outgoing email delivery status"
        actions={
          <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Auto-refresh
          </label>
        }
      />

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {stats.map((s) => {
          const Icon = STATUS_ICONS[s.status];
          const count = getStatusCount(items, s.status);
          return (
            <button
              key={s.status}
              onClick={() => setFilterStatus(filterStatus === s.status ? "all" : s.status)}
              className={`flex items-center gap-3 p-4 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                filterStatus === s.status
                  ? "border-blue-500 ring-1 ring-blue-500"
                  : "border-gray-200 dark:border-gray-700"
              } ${s.color}`}
              aria-pressed={filterStatus === s.status}
            >
              <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <div className="text-left">
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs opacity-75">{s.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Queue table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(row) => row.id}
          emptyMessage="No emails in queue matching the current filter."
        />
      </div>

      {/* Detail panel */}
      {selectedDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setSelectedDetail(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Email details"
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Email Details</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Recipient</dt>
                <dd className="text-gray-900 dark:text-white font-medium">{selectedDetail.recipient}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Subject</dt>
                <dd className="text-gray-900 dark:text-white">{selectedDetail.subject}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Status</dt>
                <dd><StatusBadge status={selectedDetail.status} /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Scheduled</dt>
                <dd className="text-gray-900 dark:text-white">{selectedDetail.scheduledAt}</dd>
              </div>
              {selectedDetail.sentAt && (
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Sent</dt>
                  <dd className="text-gray-900 dark:text-white">{selectedDetail.sentAt}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Retry Count</dt>
                <dd className="text-gray-900 dark:text-white">{selectedDetail.retryCount}</dd>
              </div>
              {selectedDetail.error && (
                <div>
                  <dt className="text-gray-500 dark:text-gray-400 mb-1">Error</dt>
                  <dd className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-3 py-2 text-xs font-mono">
                    {selectedDetail.error}
                  </dd>
                </div>
              )}
            </dl>
            <button
              onClick={() => setSelectedDetail(null)}
              className="mt-6 w-full py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </SessionGuard>
  );
}
