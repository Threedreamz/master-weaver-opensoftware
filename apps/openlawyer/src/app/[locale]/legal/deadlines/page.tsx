"use client";

import { useState, useMemo } from "react";
import { PageHeader, StatusBadge, DataTable, type Column } from "@opensoftware/ui";
import { SessionGuard } from "@/components/auth/SessionGuard";
import {
  Calendar,
  List,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DeadlineType = "renewal" | "termination" | "compliance" | "payment";
type DeadlineStatus = "upcoming" | "overdue" | "completed" | "dismissed";

interface Deadline {
  id: string;
  title: string;
  type: DeadlineType;
  status: DeadlineStatus;
  dueDate: string;
  documentId: string;
  documentName: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_DEADLINES: Deadline[] = [
  { id: "d-1", title: "NDA Renewal - Acme Corp", type: "renewal", status: "overdue", dueDate: "2026-03-10", documentId: "doc-1", documentName: "Acme NDA v2", notes: "Annual renewal required" },
  { id: "d-2", title: "GDPR Compliance Review", type: "compliance", status: "upcoming", dueDate: "2026-03-18", documentId: "doc-3", documentName: "GDPR Policy v5", notes: "Quarterly review per Article 32" },
  { id: "d-3", title: "License Termination Notice", type: "termination", status: "upcoming", dueDate: "2026-03-25", documentId: "doc-4", documentName: "Software License Agreement", notes: "30-day notice required before expiry" },
  { id: "d-4", title: "Invoice Payment Due", type: "payment", status: "overdue", dueDate: "2026-03-05", documentId: "doc-5", documentName: "Service Agreement #1042", notes: "Net 30 terms exceeded" },
  { id: "d-5", title: "Contract Annual Review", type: "compliance", status: "upcoming", dueDate: "2026-04-15", documentId: "doc-6", documentName: "Master Services Agreement", notes: "Review all SLAs" },
  { id: "d-6", title: "Partnership Renewal", type: "renewal", status: "completed", dueDate: "2026-03-01", documentId: "doc-7", documentName: "Partnership Agreement", notes: "Renewed for 2 years" },
  { id: "d-7", title: "Data Retention Review", type: "compliance", status: "dismissed", dueDate: "2026-02-28", documentId: "doc-8", documentName: "Data Retention Policy", notes: "Deferred to Q3" },
  { id: "d-8", title: "Supplier Payment Q1", type: "payment", status: "upcoming", dueDate: "2026-03-31", documentId: "doc-9", documentName: "Supplier Contract #88", notes: "Quarterly payment" },
];

const TYPE_LABELS: Record<DeadlineType, string> = {
  renewal: "Renewal",
  termination: "Termination Notice",
  compliance: "Compliance Review",
  payment: "Payment Due",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyColor(status: DeadlineStatus, dueDate: string): string {
  if (status === "completed") return "text-green-600 dark:text-green-400";
  if (status === "dismissed") return "text-gray-400 dark:text-gray-500";
  const days = daysUntil(dueDate);
  if (days < 0) return "text-red-600 dark:text-red-400";
  if (days <= 7) return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
}

function urgencyDot(status: DeadlineStatus, dueDate: string): string {
  if (status === "completed" || status === "dismissed") return "bg-gray-300 dark:bg-gray-600";
  const days = daysUntil(dueDate);
  if (days < 0) return "bg-red-500";
  if (days <= 7) return "bg-yellow-500";
  return "bg-green-500";
}

// ---------------------------------------------------------------------------
// Calendar helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = firstDay === 0 ? 6 : firstDay - 1; // Monday start
  const days: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DeadlinesPage() {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [filterType, setFilterType] = useState<DeadlineType | "all">("all");
  const [calendarDate, setCalendarDate] = useState(() => new Date(2026, 2, 1)); // March 2026

  const filtered =
    filterType === "all"
      ? MOCK_DEADLINES
      : MOCK_DEADLINES.filter((d) => d.type === filterType);

  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const calDays = getCalendarDays(calYear, calMonth);

  const deadlinesByDay = useMemo(() => {
    const map = new Map<number, Deadline[]>();
    for (const d of MOCK_DEADLINES) {
      const date = new Date(d.dueDate);
      if (date.getFullYear() === calYear && date.getMonth() === calMonth) {
        const day = date.getDate();
        map.set(day, [...(map.get(day) ?? []), d]);
      }
    }
    return map;
  }, [calYear, calMonth]);

  const columns: Column<Deadline>[] = [
    {
      key: "urgency",
      header: "",
      className: "w-8",
      render: (row) => (
        <div className={`w-2.5 h-2.5 rounded-full ${urgencyDot(row.status, row.dueDate)}`} aria-hidden="true" />
      ),
    },
    {
      key: "title",
      header: "Deadline",
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{row.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.notes}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (row) => <span className="text-sm text-gray-600 dark:text-gray-300">{TYPE_LABELS[row.type]}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "dueDate",
      header: "Due Date",
      render: (row) => {
        const days = daysUntil(row.dueDate);
        return (
          <div>
            <p className="text-sm text-gray-900 dark:text-white">{row.dueDate}</p>
            {row.status !== "completed" && row.status !== "dismissed" && (
              <p className={`text-xs ${urgencyColor(row.status, row.dueDate)}`}>
                {days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? "Due today" : `${days} days left`}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "document",
      header: "Document",
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
          <FileText className="w-3 h-3" />
          {row.documentName}
        </span>
      ),
    },
  ];

  return (
    <SessionGuard requiredRole="viewer">
      <PageHeader
        title="Deadline Tracker"
        description="Track contract deadlines, renewals, and obligations"
        actions={
          <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden" role="group" aria-label="View mode">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 ${viewMode === "list" ? "bg-gray-100 dark:bg-gray-700" : "bg-white dark:bg-gray-800"} hover:bg-gray-50 dark:hover:bg-gray-700`}
              aria-pressed={viewMode === "list"}
              aria-label="List view"
            >
              <List className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`p-2 ${viewMode === "calendar" ? "bg-gray-100 dark:bg-gray-700" : "bg-white dark:bg-gray-800"} hover:bg-gray-50 dark:hover:bg-gray-700`}
              aria-pressed={viewMode === "calendar"}
              aria-label="Calendar view"
            >
              <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Overdue", count: MOCK_DEADLINES.filter((d) => d.status === "overdue").length, icon: AlertCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50" },
          { label: "Due < 7 days", count: MOCK_DEADLINES.filter((d) => d.status === "upcoming" && daysUntil(d.dueDate) <= 7).length, icon: Clock, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-900/50" },
          { label: "Upcoming", count: MOCK_DEADLINES.filter((d) => d.status === "upcoming" && daysUntil(d.dueDate) > 7).length, icon: Calendar, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/50" },
          { label: "Completed", count: MOCK_DEADLINES.filter((d) => d.status === "completed").length, icon: CheckCircle2, color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`flex items-center gap-3 p-4 rounded-lg border ${stat.bg}`}>
              <Icon className={`w-5 h-5 ${stat.color}`} aria-hidden="true" />
              <div>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {viewMode === "list" && (
        <>
          {/* Type filter */}
          <div className="flex items-center gap-2 mb-4">
            <label htmlFor="deadline-type" className="sr-only">Filter by type</label>
            <select
              id="deadline-type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as DeadlineType | "all")}
              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {(Object.entries(TYPE_LABELS) as [DeadlineType, string][]).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <DataTable
              columns={columns}
              data={filtered}
              keyExtractor={(row) => row.id}
              emptyMessage="No deadlines matching the current filter."
            />
          </div>
        </>
      )}

      {viewMode === "calendar" && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCalendarDate(new Date(calYear, calMonth - 1, 1))}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {MONTH_NAMES[calMonth]} {calYear}
            </h3>
            <button
              onClick={() => setCalendarDate(new Date(calYear, calMonth + 1, 1))}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Next month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px mb-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            {calDays.map((day, i) => {
              const deadlinesForDay = day ? deadlinesByDay.get(day) ?? [] : [];
              return (
                <div
                  key={i}
                  className={`min-h-[80px] p-1.5 bg-white dark:bg-gray-900 ${day ? "" : "bg-gray-50 dark:bg-gray-800/50"}`}
                >
                  {day && (
                    <>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{day}</span>
                      <div className="mt-1 space-y-0.5">
                        {deadlinesForDay.map((dl) => (
                          <div
                            key={dl.id}
                            className={`text-xs px-1 py-0.5 rounded truncate ${
                              dl.status === "overdue"
                                ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                                : dl.status === "completed"
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                            }`}
                            title={dl.title}
                          >
                            {dl.title}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </SessionGuard>
  );
}
