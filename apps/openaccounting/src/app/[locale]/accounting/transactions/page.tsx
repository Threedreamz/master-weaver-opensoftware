"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, DataTable, StatusBadge, type Column } from "@opensoftware/ui";
import { ArrowLeftRight, Filter, EyeOff, Loader2 } from "lucide-react";
import { getTransactions, bulkIgnoreTransactions } from "./actions";

interface Transaction {
  id: number;
  date: string;
  amount: number;
  currency: string | null;
  counterpartyName: string | null;
  counterpartyIban: string | null;
  reference: string | null;
  category: string | null;
  status: string | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

const STATUS_MAP: Record<string, string> = {
  unmatched: "pending",
  matched: "active",
  ignored: "archived",
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    const data = await getTransactions({
      status: statusFilter !== "all" ? statusFilter : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
    setTransactions(data as Transaction[]);
    setSelectedIds(new Set());
    setLoading(false);
  }, [statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    }
  };

  const handleBulkIgnore = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    await bulkIgnoreTransactions(Array.from(selectedIds));
    await loadTransactions();
    setBulkLoading(false);
  };

  const columns: Column<Transaction>[] = [
    {
      key: "select",
      header: "",
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={() => toggleSelect(row.id)}
          className="w-4 h-4 accent-emerald-600 rounded"
          aria-label={`Select transaction ${row.id}`}
        />
      ),
      className: "w-10",
    },
    {
      key: "date",
      header: "Date",
      className: "w-28",
    },
    {
      key: "amount",
      header: "Amount",
      render: (row) => (
        <span
          className={`font-mono font-medium ${
            row.amount >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {formatCurrency(row.amount)}
        </span>
      ),
      className: "w-32",
    },
    {
      key: "counterpartyName",
      header: "Counterparty",
      render: (row) => (
        <span className="text-gray-900 dark:text-white">
          {row.counterpartyName || "-"}
        </span>
      ),
    },
    {
      key: "counterpartyIban",
      header: "IBAN",
      render: (row) => (
        <span className="text-xs font-mono text-gray-500">
          {row.counterpartyIban || "-"}
        </span>
      ),
    },
    {
      key: "reference",
      header: "Reference",
      render: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs block">
          {row.reference || "-"}
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (row) => (
        <span className="text-sm">{row.category || "-"}</span>
      ),
      className: "w-28",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const displayStatus = row.status ?? "unmatched";
        return (
          <StatusBadge status={STATUS_MAP[displayStatus] ?? displayStatus} />
        );
      },
      className: "w-28",
    },
  ];

  return (
    <>
      <PageHeader
        title="Transactions"
        description="View and manage bank transactions"
        actions={
          selectedIds.size > 0 ? (
            <button
              onClick={handleBulkIgnore}
              disabled={bulkLoading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
            >
              {bulkLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
              Ignore Selected ({selectedIds.size})
            </button>
          ) : undefined
        }
      />

      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
              >
                <option value="all">All</option>
                <option value="unmatched">Unmatched</option>
                <option value="matched">Matched</option>
                <option value="ignored">Ignored</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
              />
            </div>
            {(statusFilter !== "all" || dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setDateFrom("");
                  setDateTo("");
                }}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Select All */}
        {transactions.length > 0 && (
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedIds.size === transactions.length && transactions.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 accent-emerald-600 rounded"
              aria-label="Select all transactions"
            />
            <span className="text-sm text-gray-500">
              {selectedIds.size > 0
                ? `${selectedIds.size} of ${transactions.length} selected`
                : `${transactions.length} transactions`}
            </span>
          </div>
        )}

        {/* Data Table */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
            <DataTable
              columns={columns}
              data={transactions}
              keyExtractor={(row) => row.id}
              emptyMessage="No transactions found. Import bank statements to get started."
            />
          </div>
        )}
      </div>
    </>
  );
}
