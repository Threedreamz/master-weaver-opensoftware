"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PageHeader,
  StatusBadge,
  EmptyState,
} from "@opensoftware/ui";
import { Link2, CheckCircle2, XCircle, Filter } from "lucide-react";
import {
  getMatches,
  getPendingMatches,
  confirmMatch,
  rejectMatch,
  type MatchWithDetails,
} from "./actions";

const EUR = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

type ViewMode = "pending" | "all";

export default function MatchingPage() {
  const [matches, setMatches] = useState<MatchWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("pending");
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data =
      viewMode === "pending" ? await getPendingMatches() : await getMatches();
    setMatches(data);
    setLoading(false);
  }, [viewMode]);

  useEffect(() => {
    load();
  }, [load]);

  const handleConfirm = async (id: number) => {
    setActionInProgress(id);
    await confirmMatch(id);
    setActionInProgress(null);
    load();
  };

  const handleReject = async (id: number) => {
    setActionInProgress(id);
    await rejectMatch(id);
    setActionInProgress(null);
    load();
  };

  const pendingCount = matches.filter((m) => m.status === "pending").length;

  return (
    <>
      <PageHeader
        title="Matching"
        description="Match bank transactions to invoices and documents"
        actions={
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setViewMode("pending")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === "pending"
                  ? "bg-emerald-600 text-white"
                  : "bg-white dark:bg-gray-950 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setViewMode("all")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === "all"
                  ? "bg-emerald-600 text-white"
                  : "bg-white dark:bg-gray-950 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"
              }`}
            >
              All Matches
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : matches.length === 0 ? (
        <EmptyState
          icon={<Link2 className="w-12 h-12" />}
          title={
            viewMode === "pending"
              ? "No pending matches"
              : "No matches found"
          }
          description="Import transactions and documents to start matching them automatically."
        />
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <div
              key={match.id}
              className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-5"
            >
              {/* Header row: match score + status + actions */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <StatusBadge status={match.status || "pending"} />
                  <span className="text-sm text-gray-500">
                    Match #{match.id}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {/* Score bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Score</span>
                    <div className="w-24 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          match.score >= 0.8
                            ? "bg-green-500"
                            : match.score >= 0.5
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${Math.round(match.score * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium tabular-nums">
                      {Math.round(match.score * 100)}%
                    </span>
                  </div>

                  {match.status === "pending" && (
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleConfirm(match.id)}
                        disabled={actionInProgress === match.id}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 flex items-center gap-1 disabled:opacity-50"
                        aria-label={`Confirm match #${match.id}`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirm
                      </button>
                      <button
                        onClick={() => handleReject(match.id)}
                        disabled={actionInProgress === match.id}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 flex items-center gap-1 disabled:opacity-50"
                        aria-label={`Reject match #${match.id}`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Two-column details: Transaction vs Document/Invoice */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Transaction side */}
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
                    Transaction
                  </h4>
                  {match.transactionId ? (
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date</span>
                        <span className="font-medium">
                          {match.transactionDate || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Amount</span>
                        <span
                          className={`font-medium tabular-nums ${
                            (match.transactionAmount ?? 0) >= 0
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {match.transactionAmount != null
                            ? EUR.format(match.transactionAmount)
                            : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Counterparty</span>
                        <span className="font-medium">
                          {match.transactionCounterparty || "-"}
                        </span>
                      </div>
                      {match.transactionReference && (
                        <div className="mt-1 text-xs text-gray-400 line-clamp-2">
                          {match.transactionReference}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">
                      No transaction linked
                    </p>
                  )}
                </div>

                {/* Document / Invoice side */}
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                  <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
                    {match.invoiceId ? "Invoice" : "Document"}
                  </h4>
                  {match.invoiceId ? (
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Invoice No.</span>
                        <span className="font-mono font-medium text-xs">
                          {match.invoiceNumber || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Gross Amount</span>
                        <span className="font-medium tabular-nums">
                          {match.invoiceGrossAmount != null
                            ? EUR.format(match.invoiceGrossAmount)
                            : "-"}
                        </span>
                      </div>
                    </div>
                  ) : match.documentId ? (
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Filename</span>
                        <span className="font-medium">
                          {match.documentFilename || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Supplier</span>
                        <span className="font-medium">
                          {match.documentSupplier || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Amount</span>
                        <span className="font-medium tabular-nums">
                          {match.documentAmount != null
                            ? EUR.format(match.documentAmount)
                            : "-"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">
                      No document or invoice linked
                    </p>
                  )}
                </div>
              </div>

              {/* Match reasons */}
              {match.reasons && Array.isArray(match.reasons) && (match.reasons as string[]).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {(match.reasons as string[]).map((reason, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              )}

              {/* Confirmed info */}
              {match.confirmedAt && (
                <div className="mt-2 text-xs text-gray-400">
                  {match.status === "confirmed" ? "Confirmed" : "Rejected"} on{" "}
                  {new Date(match.confirmedAt).toLocaleDateString("de-DE")}{" "}
                  {match.confirmedBy ? `by ${match.confirmedBy}` : ""}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
