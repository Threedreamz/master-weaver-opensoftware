"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, DataTable, StatusBadge, type Column } from "@opensoftware/ui";
import { Shield, Plus } from "lucide-react";
import {
  getAuditLogs,
  getVerfahrensDoku,
  getAufbewahrungsfristen,
  type AuditLogRow,
  type VerfahrensDokuRow,
  type AufbewahrungsfristRow,
} from "./actions";

type Tab = "audit-trail" | "process-docs" | "retention";

const TABS: { id: Tab; label: string }[] = [
  { id: "audit-trail", label: "Audit Trail" },
  { id: "process-docs", label: "Process Documentation" },
  { id: "retention", label: "Retention Periods" },
];

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState<Tab>("audit-trail");
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [verfahrensDoku, setVerfahrensDoku] = useState<VerfahrensDokuRow[]>([]);
  const [fristen, setFristen] = useState<AufbewahrungsfristRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [logs, docs, ret] = await Promise.all([
      getAuditLogs(),
      getVerfahrensDoku(),
      getAufbewahrungsfristen(),
    ]);
    setAuditLogs(logs);
    setVerfahrensDoku(docs);
    setFristen(ret);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const auditColumns: Column<AuditLogRow>[] = [
    {
      key: "entityType",
      header: "Entity",
      render: (row) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {row.entityType}
          <span className="text-gray-500 ml-1">#{row.entityId}</span>
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (row) => <StatusBadge status={row.action ?? "unknown"} />,
      className: "w-28",
    },
    {
      key: "userName",
      header: "User",
      render: (row) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {row.userName ?? row.userId ?? "-"}
        </span>
      ),
      className: "w-36",
    },
    {
      key: "changes",
      header: "Changes",
      render: (row) => {
        if (!row.changes) return <span className="text-gray-400">-</span>;
        const str = typeof row.changes === "string" ? row.changes : JSON.stringify(row.changes);
        return (
          <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 font-mono max-w-[300px] block">
            {str}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      header: "Date",
      render: (row) => (
        <span className="text-sm text-gray-500">
          {row.createdAt
            ? new Date(row.createdAt).toLocaleString("de-DE")
            : "-"}
        </span>
      ),
      className: "w-40",
    },
    {
      key: "hash",
      header: "Hash",
      render: (row) => (
        <span className="font-mono text-xs text-gray-400 truncate max-w-[80px] block" title={row.hash ?? ""}>
          {row.hash ? row.hash.slice(0, 8) + "..." : "-"}
        </span>
      ),
      className: "w-24",
    },
  ];

  const dokuColumns: Column<VerfahrensDokuRow>[] = [
    {
      key: "titel",
      header: "Titel",
      render: (row) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">{row.titel}</span>
      ),
    },
    {
      key: "bereich",
      header: "Bereich",
      render: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{row.bereich ?? "-"}</span>
      ),
      className: "w-36",
    },
    {
      key: "version",
      header: "Version",
      render: (row) => (
        <span className="text-sm text-gray-500">v{row.version ?? 1}</span>
      ),
      className: "w-20",
    },
    {
      key: "erstelltVon",
      header: "Erstellt von",
      render: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{row.erstelltVon ?? "-"}</span>
      ),
      className: "w-32",
    },
    {
      key: "createdAt",
      header: "Created",
      render: (row) => (
        <span className="text-sm text-gray-500">
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString("de-DE") : "-"}
        </span>
      ),
      className: "w-28",
    },
  ];

  const fristenColumns: Column<AufbewahrungsfristRow>[] = [
    {
      key: "entityType",
      header: "Entity Type",
      render: (row) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">{row.entityType}</span>
      ),
    },
    {
      key: "entityId",
      header: "Entity ID",
      render: (row) => (
        <span className="font-mono text-sm text-gray-600 dark:text-gray-400">{row.entityId}</span>
      ),
      className: "w-28",
    },
    {
      key: "fristJahre",
      header: "Frist (Jahre)",
      render: (row) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">{row.fristJahre} Jahre</span>
      ),
      className: "w-28",
    },
    {
      key: "aufbewahrungBis",
      header: "Aufbewahrung bis",
      render: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.aufbewahrungBis).toLocaleDateString("de-DE")}
        </span>
      ),
      className: "w-36",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status ?? "aktiv"} />,
      className: "w-28",
    },
  ];

  return (
    <>
      <PageHeader
        title="Compliance / GoBD"
        description="Audit trail, process documentation, and retention periods"
        actions={
          activeTab === "process-docs" ? (
            <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Document
            </button>
          ) : undefined
        }
      />

      {/* Tab Bar */}
      <div className="px-6 mb-6">
        <nav className="flex gap-1 border-b border-gray-200 dark:border-gray-700" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="p-6 text-center text-gray-500">Loading compliance data...</div>
      ) : (
        <div className="px-6">
          {/* Audit Trail Tab */}
          {activeTab === "audit-trail" && (
            <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
              <DataTable
                columns={auditColumns}
                data={auditLogs}
                keyExtractor={(row) => row.id}
                emptyMessage="No audit log entries found. Actions will be logged automatically."
              />
            </div>
          )}

          {/* Process Documentation Tab */}
          {activeTab === "process-docs" && (
            <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
              <DataTable
                columns={dokuColumns}
                data={verfahrensDoku}
                keyExtractor={(row) => row.id}
                emptyMessage="No process documentation yet. Create your first Verfahrensdokumentation."
              />
            </div>
          )}

          {/* Retention Periods Tab */}
          {activeTab === "retention" && (
            <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
              <DataTable
                columns={fristenColumns}
                data={fristen}
                keyExtractor={(row) => row.id}
                emptyMessage="No retention periods configured yet."
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
