"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, DataTable, StatusBadge, type Column } from "@opensoftware/ui";
import {
  CalendarCheck,
  CheckCircle2,
  Circle,
  Loader2,
  Play,
  XCircle,
} from "lucide-react";
import {
  getYearEndChecklist,
  getJahresabschluesse,
  createJahresabschluss,
  type YearEndTask,
  type JahresabschlussRow,
} from "./actions";

const TASK_STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Circle className="w-4 h-4 text-gray-400" />,
  running: <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />,
  done: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  error: <XCircle className="w-4 h-4 text-red-500" />,
};

export default function YearEndPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear - 1);
  const [checklist, setChecklist] = useState<YearEndTask[]>([]);
  const [closings, setClosings] = useState<JahresabschlussRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [tasks, rows] = await Promise.all([
      getYearEndChecklist(selectedYear),
      getJahresabschluesse(),
    ]);
    setChecklist(tasks);
    setClosings(rows);
    setLoading(false);
  }, [selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRunTask = useCallback(
    async (taskId: string) => {
      setChecklist((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: "running" as const } : t))
      );

      // Simulate task execution
      await new Promise((r) => setTimeout(r, 1500));

      setChecklist((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: "done" as const } : t))
      );
    },
    []
  );

  const handleCreateClosing = useCallback(async () => {
    const result = await createJahresabschluss(selectedYear, "komplett");
    if (result.success) {
      await loadData();
    }
  }, [selectedYear, loadData]);

  const closingColumns: Column<JahresabschlussRow>[] = [
    {
      key: "geschaeftsjahr",
      header: "Geschaeftsjahr",
      render: (row) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {row.geschaeftsjahr}
        </span>
      ),
      className: "w-32",
    },
    {
      key: "typ",
      header: "Typ",
      render: (row) => (
        <span className="text-sm capitalize text-gray-700 dark:text-gray-300">
          {row.typ ?? "komplett"}
        </span>
      ),
      className: "w-28",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status ?? "entwurf"} />,
      className: "w-32",
    },
    {
      key: "erstelltAm",
      header: "Created",
      render: (row) => (
        <span className="text-sm text-gray-500">
          {row.erstelltAm
            ? new Date(row.erstelltAm).toLocaleDateString("de-DE")
            : row.createdAt
              ? new Date(row.createdAt).toLocaleDateString("de-DE")
              : "-"}
        </span>
      ),
    },
  ];

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 - i);

  return (
    <>
      <PageHeader
        title="Year-End Closing"
        description="Manage annual financial closing (Jahresabschluss)"
        actions={
          <button
            onClick={handleCreateClosing}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-2"
          >
            <CalendarCheck className="w-4 h-4" />
            Create Closing for {selectedYear}
          </button>
        }
      />

      {/* Year Selector */}
      <div className="px-6 pb-4">
        <label
          htmlFor="year-select"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Fiscal Year
        </label>
        <select
          id="year-select"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="p-6 text-center text-gray-500">Loading...</div>
      ) : (
        <div className="px-6 space-y-8">
          {/* Checklist */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Year-End Checklist for {selectedYear}
            </h2>
            <div className="space-y-3">
              {checklist.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800"
                >
                  <div className="flex items-center gap-3">
                    {TASK_STATUS_ICON[task.status]}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {task.label}
                      </p>
                      <p className="text-xs text-gray-500">{task.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={task.status} />
                    {task.runnable && task.status === "pending" && (
                      <button
                        onClick={() => handleRunTask(task.id)}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-md text-xs hover:bg-emerald-700 flex items-center gap-1.5"
                      >
                        <Play className="w-3 h-3" />
                        Run
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Past Closings Table */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Past Year-End Closings
            </h2>
            <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
              <DataTable
                columns={closingColumns}
                data={closings}
                keyExtractor={(row) => row.id}
                emptyMessage="No year-end closings recorded yet."
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
