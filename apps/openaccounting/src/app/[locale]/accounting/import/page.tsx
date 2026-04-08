"use client";

import { useState, useCallback, useRef } from "react";
import { PageHeader, DataTable, StatusBadge, type Column } from "@opensoftware/ui";
import {
  Upload,
  FileUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
} from "lucide-react";
import { SessionGuard } from "@/components/auth/SessionGuard";
import type { BankTransaction } from "@/lib/parsers/types";
import {
  parseUploadedFile,
  importTransactions,
  detectDuplicates,
} from "./actions";
import type { ImportStats } from "./actions";

type ImportPhase = "upload" | "preview" | "importing" | "done";

export default function ImportPage() {
  const [phase, setPhase] = useState<ImportPhase>("upload");
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [duplicateIds, setDuplicateIds] = useState<Set<string>>(new Set());
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setPhase("preview");
    setParseErrors([]);
    setTransactions([]);
    setDuplicateIds(new Set());
    setImportStats(null);

    const formData = new FormData();
    formData.append("file", file);

    const result = await parseUploadedFile(formData);

    setTransactions(result.transactions);
    setParseErrors(result.errors);

    if (result.transactions.length > 0) {
      const dupCheck = await detectDuplicates(result.transactions);
      setDuplicateIds(new Set(dupCheck.duplicateIds));
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleImport = useCallback(async () => {
    const toImport = transactions.filter((tx) => !duplicateIds.has(tx.id));
    if (toImport.length === 0) return;

    setPhase("importing");
    const stats = await importTransactions(toImport);
    setImportStats(stats);
    setPhase("done");
  }, [transactions, duplicateIds]);

  const handleReset = useCallback(() => {
    setPhase("upload");
    setTransactions([]);
    setDuplicateIds(new Set());
    setParseErrors([]);
    setImportStats(null);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const newCount = transactions.filter((tx) => !duplicateIds.has(tx.id)).length;

  const columns: Column<BankTransaction>[] = [
    {
      key: "status",
      header: "Status",
      render: (row) =>
        duplicateIds.has(row.id) ? (
          <StatusBadge status="warning">Duplicate</StatusBadge>
        ) : (
          <StatusBadge status="success">New</StatusBadge>
        ),
      className: "w-24",
    },
    { key: "date", header: "Date", className: "w-28" },
    {
      key: "amount",
      header: "Amount",
      render: (row) => (
        <span
          className={
            row.amount >= 0
              ? "text-emerald-600 font-medium"
              : "text-red-600 font-medium"
          }
        >
          {new Intl.NumberFormat("de-DE", {
            style: "currency",
            currency: row.currency || "EUR",
          }).format(row.amount)}
        </span>
      ),
      className: "w-32 text-right",
    },
    {
      key: "counterparty",
      header: "Counterparty",
      render: (row) => row.creditorName || row.debtorName || "-",
    },
    {
      key: "reference",
      header: "Reference / Purpose",
      render: (row) => (
        <span className="text-gray-600 dark:text-gray-400 text-xs line-clamp-2">
          {row.reference || row.purpose || "-"}
        </span>
      ),
    },
    {
      key: "iban",
      header: "IBAN",
      render: (row) =>
        row.iban ? (
          <span className="font-mono text-xs">{row.iban}</span>
        ) : (
          "-"
        ),
      className: "w-48",
    },
  ];

  return (
    <SessionGuard requiredRole="editor">
      <PageHeader
        title="Bank Import"
        description="Import bank statements (CAMT.053 XML, CSV, MT940)"
        actions={
          phase === "preview" && newCount > 0 ? (
            <button
              onClick={handleImport}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Import {newCount} Transaction{newCount !== 1 ? "s" : ""}
            </button>
          ) : phase === "done" ? (
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700"
            >
              Import Another File
            </button>
          ) : undefined
        }
      />

      {/* Upload Phase */}
      {phase === "upload" && (
        <div className="p-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-xl p-16 text-center cursor-pointer
              transition-colors duration-200
              ${
                isDragOver
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
                  : "border-gray-300 dark:border-gray-700 hover:border-emerald-400 hover:bg-gray-50 dark:hover:bg-gray-900"
              }
            `}
          >
            <Upload
              className={`w-16 h-16 mx-auto mb-4 ${
                isDragOver
                  ? "text-emerald-500"
                  : "text-gray-400"
              }`}
            />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Drop your bank statement here
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              or click to browse files
            </p>
            <div className="flex justify-center gap-3">
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-400">
                .xml (CAMT.053)
              </span>
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-400">
                .csv
              </span>
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-400">
                .mt940
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,.csv,.txt,.mt940,.sta"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* Preview Phase */}
      {phase === "preview" && (
        <div className="p-6 space-y-6">
          {/* File info bar */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-3">
              <FileUp className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {fileName}
                </p>
                <p className="text-sm text-gray-500">
                  {transactions.length} transaction
                  {transactions.length !== 1 ? "s" : ""} found
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Choose different file
            </button>
          </div>

          {/* Parse errors */}
          {parseErrors.length > 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-amber-800 dark:text-amber-200">
                  {parseErrors.length} warning{parseErrors.length !== 1 ? "s" : ""}
                </span>
              </div>
              <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                {parseErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Import summary stats */}
          {transactions.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950 rounded-lg text-center">
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {newCount}
                </p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  New transactions
                </p>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg text-center">
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {duplicateIds.size}
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Duplicates (skipped)
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                  {transactions.length}
                </p>
                <p className="text-sm text-gray-500">Total in file</p>
              </div>
            </div>
          )}

          {/* Transaction preview table */}
          {transactions.length > 0 && (
            <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
              <DataTable
                columns={columns}
                data={transactions}
                keyExtractor={(row) => row.id}
              />
            </div>
          )}
        </div>
      )}

      {/* Importing Phase */}
      {phase === "importing" && (
        <div className="p-6 flex flex-col items-center justify-center min-h-[40vh]">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Importing transactions...
          </p>
        </div>
      )}

      {/* Done Phase */}
      {phase === "done" && importStats && (
        <div className="p-6 space-y-6">
          <div className="p-8 bg-emerald-50 dark:bg-emerald-950 rounded-xl text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-emerald-800 dark:text-emerald-200 mb-2">
              Import Complete
            </h3>
            <p className="text-emerald-600 dark:text-emerald-400">
              Successfully imported from {fileName}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {importStats.total}
              </p>
              <p className="text-sm text-gray-500">Total processed</p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-950 rounded-lg border border-emerald-200 dark:border-emerald-800 text-center">
              <p className="text-2xl font-bold text-emerald-600">
                {importStats.imported}
              </p>
              <p className="text-sm text-gray-500">Imported</p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-950 rounded-lg border border-amber-200 dark:border-amber-800 text-center">
              <p className="text-2xl font-bold text-amber-600">
                {importStats.duplicates}
              </p>
              <p className="text-sm text-gray-500">Duplicates</p>
            </div>
            {importStats.errors > 0 && (
              <div className="p-4 bg-white dark:bg-gray-950 rounded-lg border border-red-200 dark:border-red-800 text-center">
                <p className="text-2xl font-bold text-red-600">
                  {importStats.errors}
                </p>
                <p className="text-sm text-gray-500">Errors</p>
              </div>
            )}
          </div>
        </div>
      )}
    </SessionGuard>
  );
}
