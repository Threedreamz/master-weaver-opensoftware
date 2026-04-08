"use client";

import { useState, useEffect } from "react";
import { PageHeader, DataTable, StatusBadge, type Column } from "@opensoftware/ui";
import { ListChecks, Loader2 } from "lucide-react";
import { getOposData, type OposData, type OpenItem } from "./actions";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

const BUCKET_COLORS: Record<string, string> = {
  "0-30": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  "31-60": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "61-90": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "90+": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function OposPage() {
  const [data, setData] = useState<OposData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOposData().then((result) => {
      setData(result);
      setLoading(false);
    });
  }, []);

  const columns: Column<OpenItem>[] = [
    { key: "invoiceNumber", header: "Invoice", className: "w-32" },
    {
      key: "customerName",
      header: "Customer",
      render: (row) => (
        <span className="text-gray-900 dark:text-white">
          {row.customerName || "-"}
        </span>
      ),
    },
    {
      key: "grossAmount",
      header: "Amount",
      render: (row) => (
        <span className="font-mono font-medium text-gray-900 dark:text-white">
          {formatCurrency(row.grossAmount)}
        </span>
      ),
      className: "w-32",
    },
    { key: "issueDate", header: "Issued", className: "w-28" },
    { key: "dueDate", header: "Due", className: "w-28" },
    {
      key: "daysOverdue",
      header: "Days Overdue",
      render: (row) => (
        <span
          className={`font-mono ${
            row.daysOverdue > 60
              ? "text-red-600 dark:text-red-400 font-semibold"
              : row.daysOverdue > 30
                ? "text-orange-600 dark:text-orange-400"
                : "text-gray-600 dark:text-gray-400"
          }`}
        >
          {row.daysOverdue}
        </span>
      ),
      className: "w-32",
    },
    {
      key: "ageBucket",
      header: "Age Bucket",
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            BUCKET_COLORS[row.ageBucket]
          }`}
        >
          {row.ageBucket} days
        </span>
      ),
      className: "w-28",
    },
  ];

  return (
    <>
      <PageHeader
        title="OPOS"
        description="Offene Posten - Open items and aging analysis"
      />

      <div className="p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : data ? (
          <>
            {/* Aging Buckets Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(["0-30", "31-60", "61-90", "90+"] as const).map((bucket) => (
                <div
                  key={bucket}
                  className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${BUCKET_COLORS[bucket]}`}
                    >
                      {bucket} days
                    </span>
                    <span className="text-sm text-gray-500">
                      {data.buckets[bucket].count} items
                    </span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(data.buckets[bucket].total)}
                  </p>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Outstanding
              </span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(data.totalOutstanding)}
              </span>
            </div>

            {/* Detail Table */}
            <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
              <DataTable
                columns={columns}
                data={data.items}
                keyExtractor={(row) => row.id}
                emptyMessage="No open items. All invoices are paid."
              />
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
