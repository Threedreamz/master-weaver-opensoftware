"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  EmptyState,
  type Column,
} from "@opensoftware/ui";
import { FolderOpen, Upload, X } from "lucide-react";
import {
  getDocuments,
  uploadDocument,
  updateDocumentStatus,
  type DocumentRow,
} from "./actions";

const EUR = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

function formatBytes(bytes: number | null): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    filename: "",
    fileSize: 0,
    fileType: "",
    supplier: "",
    invoiceNumber: "",
    amount: "",
    date: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getDocuments();
    setDocuments(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({
        ...formData,
        filename: file.name,
        fileSize: file.size,
        fileType: file.type || file.name.split(".").pop() || "",
      });
      setShowForm(true);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const result = await uploadDocument({
      filename: formData.filename,
      fileSize: formData.fileSize,
      fileType: formData.fileType,
      supplier: formData.supplier || undefined,
      invoiceNumber: formData.invoiceNumber || undefined,
      amount: formData.amount ? parseFloat(formData.amount) : undefined,
      date: formData.date || undefined,
    });

    setSaving(false);
    if (result.success) {
      setShowForm(false);
      setFormData({
        filename: "",
        fileSize: 0,
        fileType: "",
        supplier: "",
        invoiceNumber: "",
        amount: "",
        date: "",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      load();
    } else {
      setError(result.error || "Failed to upload document");
    }
  };

  const handleStatusChange = async (
    id: number,
    status: "uploaded" | "processing" | "processed" | "error"
  ) => {
    await updateDocumentStatus(id, status);
    load();
  };

  const columns: Column<DocumentRow>[] = [
    {
      key: "filename",
      header: "Filename",
      render: (row) => (
        <div>
          <span className="font-medium text-gray-900 dark:text-white text-sm">
            {row.filename}
          </span>
          <span className="block text-xs text-gray-400">
            {formatBytes(row.fileSize)}
          </span>
        </div>
      ),
    },
    {
      key: "supplier",
      header: "Supplier",
      render: (row) => row.supplier || "-",
    },
    {
      key: "invoiceNumber",
      header: "Invoice No.",
      render: (row) =>
        row.invoiceNumber ? (
          <span className="font-mono text-xs">{row.invoiceNumber}</span>
        ) : (
          "-"
        ),
      className: "w-28",
    },
    {
      key: "amount",
      header: "Amount",
      render: (row) =>
        row.amount != null ? (
          <span className="tabular-nums">{EUR.format(row.amount)}</span>
        ) : row.grossAmount != null ? (
          <span className="tabular-nums">{EUR.format(row.grossAmount)}</span>
        ) : (
          "-"
        ),
      className: "w-28 text-right",
    },
    {
      key: "ocrConfidence",
      header: "OCR Confidence",
      render: (row) => {
        if (row.ocrConfidence == null) return "-";
        const pct = Math.round(row.ocrConfidence * 100);
        const color =
          pct >= 80
            ? "bg-green-500"
            : pct >= 50
              ? "bg-yellow-500"
              : "bg-red-500";
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${color}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-gray-500">{pct}%</span>
          </div>
        );
      },
      className: "w-36",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={row.status || "uploaded"} />
          <select
            value={row.status || "uploaded"}
            onChange={(e) =>
              handleStatusChange(
                row.id,
                e.target.value as
                  | "uploaded"
                  | "processing"
                  | "processed"
                  | "error"
              )
            }
            onClick={(e) => e.stopPropagation()}
            className="bg-transparent border-none text-xs cursor-pointer focus:outline-none text-gray-400"
            aria-label={`Change status for document ${row.filename}`}
          >
            <option value="uploaded">Uploaded</option>
            <option value="processing">Processing</option>
            <option value="processed">Processed</option>
            <option value="error">Error</option>
          </select>
        </div>
      ),
      className: "w-40",
    },
    {
      key: "uploadedAt",
      header: "Uploaded",
      render: (row) => (
        <span className="text-xs text-gray-500">
          {row.uploadedAt
            ? new Date(row.uploadedAt).toLocaleDateString("de-DE")
            : "-"}
        </span>
      ),
      className: "w-24",
    },
  ];

  return (
    <>
      <PageHeader
        title="Documents"
        description="Upload and manage receipts, invoices, and financial documents"
        actions={
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.tiff,.xml"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Upload document file"
            />
            {showForm ? (
              <button
                onClick={() => {
                  setShowForm(false);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-900 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload Document
              </button>
            )}
          </div>
        }
      />

      {/* Upload metadata form */}
      {showForm && formData.filename && (
        <form
          onSubmit={handleCreate}
          className="mb-6 p-6 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Upload: {formData.filename}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {formatBytes(formData.fileSize)} &middot; {formData.fileType}
          </p>
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label
                htmlFor="doc-supplier"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Supplier
              </label>
              <input
                id="doc-supplier"
                type="text"
                value={formData.supplier}
                onChange={(e) =>
                  setFormData({ ...formData, supplier: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label
                htmlFor="doc-invnum"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Invoice Number
              </label>
              <input
                id="doc-invnum"
                type="text"
                value={formData.invoiceNumber}
                onChange={(e) =>
                  setFormData({ ...formData, invoiceNumber: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label
                htmlFor="doc-amount"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Amount (EUR)
              </label>
              <input
                id="doc-amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label
                htmlFor="doc-date"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Document Date
              </label>
              <input
                id="doc-date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Uploading..." : "Save Document"}
            </button>
          </div>
        </form>
      )}

      {/* Table or empty state */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="w-12 h-12" />}
          title="No documents yet"
          description="Upload receipts and invoices to attach them to bookings and transactions."
          action={
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
            >
              Upload Document
            </button>
          }
        />
      ) : (
        <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
          <DataTable
            columns={columns}
            data={documents}
            keyExtractor={(row) => row.id}
          />
        </div>
      )}
    </>
  );
}
