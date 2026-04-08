"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  EmptyState,
  type Column,
} from "@opensoftware/ui";
import { FileText, Plus, X } from "lucide-react";
import {
  getInvoices,
  createInvoice,
  updateInvoiceStatus,
  type InvoiceRow,
} from "./actions";

const EUR = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    taxRate: 19,
    dueInDays: 14,
    notes: "",
    items: [{ beschreibung: "", menge: 1, einheit: "Stueck", einzelpreis: 0 }],
  });

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getInvoices();
    setInvoices(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { beschreibung: "", menge: 1, einheit: "Stueck", einzelpreis: 0 },
      ],
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const items = [...formData.items];
    items[index] = { ...items[index]!, [field]: value };
    setFormData({ ...formData, items });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const items = formData.items.map((item) => ({
      beschreibung: item.beschreibung,
      menge: item.menge,
      einheit: item.einheit,
      einzelpreis: item.einzelpreis,
      gesamtpreis: item.menge * item.einzelpreis,
    }));

    const result = await createInvoice({
      customerName: formData.customerName,
      customerEmail: formData.customerEmail || undefined,
      items,
      taxRate: formData.taxRate,
      dueInDays: formData.dueInDays,
      notes: formData.notes || undefined,
    });

    setSaving(false);
    if (result.success) {
      setShowForm(false);
      setFormData({
        customerName: "",
        customerEmail: "",
        taxRate: 19,
        dueInDays: 14,
        notes: "",
        items: [
          { beschreibung: "", menge: 1, einheit: "Stueck", einzelpreis: 0 },
        ],
      });
      load();
    } else {
      setError(result.error || "Failed to create invoice");
    }
  };

  const handleStatusChange = async (
    id: number,
    status: "entwurf" | "gesendet" | "bezahlt" | "storniert" | "ueberfaellig"
  ) => {
    await updateInvoiceStatus(id, status);
    load();
  };

  const columns: Column<InvoiceRow>[] = [
    {
      key: "invoiceNumber",
      header: "Invoice No.",
      render: (row) => (
        <span className="font-mono text-xs font-medium">
          {row.invoiceNumber}
        </span>
      ),
      className: "w-36",
    },
    {
      key: "customerName",
      header: "Customer",
      render: (row) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {row.customerName || "-"}
        </span>
      ),
    },
    {
      key: "netAmount",
      header: "Net",
      render: (row) => (
        <span className="tabular-nums">{EUR.format(row.netAmount)}</span>
      ),
      className: "w-28 text-right",
    },
    {
      key: "grossAmount",
      header: "Gross",
      render: (row) => (
        <span className="font-medium tabular-nums">
          {EUR.format(row.grossAmount)}
        </span>
      ),
      className: "w-28 text-right",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <select
          value={row.status || "entwurf"}
          onChange={(e) =>
            handleStatusChange(
              row.id,
              e.target.value as
                | "entwurf"
                | "gesendet"
                | "bezahlt"
                | "storniert"
                | "ueberfaellig"
            )
          }
          onClick={(e) => e.stopPropagation()}
          className="bg-transparent border-none text-xs font-medium cursor-pointer focus:outline-none"
          aria-label={`Change status for invoice ${row.invoiceNumber}`}
        >
          <option value="entwurf">Entwurf</option>
          <option value="gesendet">Gesendet</option>
          <option value="bezahlt">Bezahlt</option>
          <option value="storniert">Storniert</option>
          <option value="ueberfaellig">Ueberfaellig</option>
        </select>
      ),
      className: "w-32",
    },
    {
      key: "statusBadge",
      header: "",
      render: (row) => <StatusBadge status={row.status || "entwurf"} />,
      className: "w-28",
    },
    {
      key: "issueDate",
      header: "Issued",
      render: (row) => (
        <span className="text-xs text-gray-500">{row.issueDate}</span>
      ),
      className: "w-24",
    },
    {
      key: "dueDate",
      header: "Due",
      render: (row) => {
        const isOverdue =
          row.status !== "bezahlt" &&
          row.status !== "storniert" &&
          new Date(row.dueDate) < new Date();
        return (
          <span
            className={`text-xs ${isOverdue ? "text-red-600 font-medium" : "text-gray-500"}`}
          >
            {row.dueDate}
          </span>
        );
      },
      className: "w-24",
    },
  ];

  const netTotal = invoices.reduce((sum, inv) => sum + inv.netAmount, 0);
  const grossTotal = invoices.reduce((sum, inv) => sum + inv.grossAmount, 0);

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Create and manage invoices"
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-2"
          >
            {showForm ? (
              <>
                <X className="w-4 h-4" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                New Invoice
              </>
            )}
          </button>
        }
      />

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 p-6 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            New Invoice
          </h3>
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label
                htmlFor="inv-customer"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Customer Name *
              </label>
              <input
                id="inv-customer"
                type="text"
                required
                value={formData.customerName}
                onChange={(e) =>
                  setFormData({ ...formData, customerName: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label
                htmlFor="inv-email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Email
              </label>
              <input
                id="inv-email"
                type="email"
                value={formData.customerEmail}
                onChange={(e) =>
                  setFormData({ ...formData, customerEmail: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label
                htmlFor="inv-tax"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Tax Rate %
              </label>
              <input
                id="inv-tax"
                type="number"
                step="0.01"
                value={formData.taxRate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    taxRate: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label
                htmlFor="inv-due"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Due in (days)
              </label>
              <input
                id="inv-due"
                type="number"
                value={formData.dueInDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dueInDays: parseInt(e.target.value) || 14,
                  })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Line items */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Line Items
              </h4>
              <button
                type="button"
                onClick={addItem}
                className="text-xs text-emerald-600 hover:text-emerald-700"
              >
                + Add line
              </button>
            </div>
            <div className="space-y-2">
              {formData.items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-end"
                >
                  <div className="col-span-5">
                    {idx === 0 && (
                      <label className="block text-xs text-gray-500 mb-1">
                        Description
                      </label>
                    )}
                    <input
                      type="text"
                      required
                      value={item.beschreibung}
                      onChange={(e) =>
                        updateItem(idx, "beschreibung", e.target.value)
                      }
                      placeholder="Description"
                      className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && (
                      <label className="block text-xs text-gray-500 mb-1">
                        Qty
                      </label>
                    )}
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={item.menge}
                      onChange={(e) =>
                        updateItem(idx, "menge", parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && (
                      <label className="block text-xs text-gray-500 mb-1">
                        Unit Price
                      </label>
                    )}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={item.einzelpreis}
                      onChange={(e) =>
                        updateItem(
                          idx,
                          "einzelpreis",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
                    />
                  </div>
                  <div className="col-span-2 text-right text-sm font-medium tabular-nums py-1.5">
                    {EUR.format(item.menge * item.einzelpreis)}
                  </div>
                  <div className="col-span-1 text-right">
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="p-1 text-gray-400 hover:text-red-500"
                        aria-label="Remove line item"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Creating..." : "Create Invoice"}
            </button>
          </div>
        </form>
      )}

      {/* Summary bar */}
      {invoices.length > 0 && (
        <div className="mb-4 flex gap-4">
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm">
            <span className="text-gray-500">Invoices: </span>
            <span className="font-medium">{invoices.length}</span>
          </div>
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm">
            <span className="text-gray-500">Net total: </span>
            <span className="font-medium tabular-nums">
              {EUR.format(netTotal)}
            </span>
          </div>
          <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950 rounded-lg text-sm">
            <span className="text-emerald-600 dark:text-emerald-400">
              Gross total:{" "}
            </span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">
              {EUR.format(grossTotal)}
            </span>
          </div>
        </div>
      )}

      {/* Table or empty state */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="No invoices yet"
          description="Create your first invoice to start tracking revenue."
          action={
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
            >
              New Invoice
            </button>
          }
        />
      ) : (
        <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
          <DataTable
            columns={columns}
            data={invoices}
            keyExtractor={(row) => row.id}
          />
        </div>
      )}
    </>
  );
}
