"use client";

import { useState, useEffect } from "react";
import { PageHeader, DataTable, EmptyState, type Column } from "@opensoftware/ui";
import { ReceiptText } from "lucide-react";
import { getCreditNotes, createCreditNote, updateCreditNoteStatus, getInvoicesForCreditNote } from "./actions";

type CreditNote = {
  id: number;
  number: string;
  invoiceId: number | null;
  customerName: string | null;
  items: Array<{ beschreibung: string; menge: number; einheit: string; einzelpreis: number; gesamtpreis: number }> | null;
  netAmount: number;
  taxRate: number | null;
  taxAmount: number;
  grossAmount: number;
  reason: string | null;
  status: string | null;
  createdAt: string | null;
};

type InvoiceRef = {
  id: number;
  invoiceNumber: string;
  customerName: string | null;
  grossAmount: number;
  status: string | null;
};

const STATUS_MAP: Record<string, string> = {
  entwurf: "gray",
  gesendet: "blue",
  verbucht: "green",
};

const STATUS_LABELS: Record<string, string> = {
  entwurf: "Entwurf",
  gesendet: "Gesendet",
  verbucht: "Verbucht",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
}

export default function CreditNotesPage() {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    invoiceId: 0,
    customerName: "",
    reason: "",
    amount: 0,
    notes: "",
  });

  useEffect(() => {
    loadCreditNotes();
  }, []);

  async function loadCreditNotes() {
    setLoading(true);
    const data = await getCreditNotes();
    setCreditNotes(data as CreditNote[]);
    setLoading(false);
  }

  async function openForm() {
    const inv = await getInvoicesForCreditNote();
    setInvoices(inv as InvoiceRef[]);
    setShowForm(true);
  }

  function handleInvoiceSelect(invoiceId: number) {
    const inv = invoices.find((i) => i.id === invoiceId);
    setFormData({
      ...formData,
      invoiceId,
      customerName: inv?.customerName || "",
      amount: inv?.grossAmount || 0,
    });
  }

  async function handleCreate() {
    if (formData.amount <= 0) return;

    const netAmount = Math.round((formData.amount / 1.19) * 100) / 100;
    const taxAmount = Math.round((formData.amount - netAmount) * 100) / 100;

    const result = await createCreditNote({
      invoiceId: formData.invoiceId || undefined,
      customerName: formData.customerName || undefined,
      items: [{ beschreibung: formData.reason || "Gutschrift", menge: 1, einheit: "Stk", einzelpreis: netAmount, gesamtpreis: netAmount }],
      netAmount,
      taxAmount,
      grossAmount: formData.amount,
      reason: formData.reason || undefined,
      notes: formData.notes || undefined,
    });

    if (result.success) {
      setShowForm(false);
      setFormData({ invoiceId: 0, customerName: "", reason: "", amount: 0, notes: "" });
      loadCreditNotes();
    }
  }

  async function handleStatusChange(id: number, status: "entwurf" | "gesendet" | "verbucht") {
    const result = await updateCreditNoteStatus(id, status);
    if (result.success) loadCreditNotes();
  }

  const columns: Column<CreditNote>[] = [
    { key: "number", header: "Number" },
    {
      key: "invoiceId",
      header: "Invoice",
      render: (row) => row.invoiceId ? `#${row.invoiceId}` : "-",
    },
    {
      key: "customerName",
      header: "Customer",
      render: (row) => row.customerName || "-",
    },
    {
      key: "grossAmount",
      header: "Gross Amount",
      render: (row) => formatCurrency(row.grossAmount),
      className: "text-right font-medium",
    },
    {
      key: "reason",
      header: "Reason",
      render: (row) => row.reason || "-",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <select
          value={row.status || "entwurf"}
          onChange={(e) => handleStatusChange(row.id, e.target.value as "entwurf" | "gesendet" | "verbucht")}
          className="bg-transparent border-0 text-sm cursor-pointer focus:ring-0 p-0"
          aria-label={`Change status for credit note ${row.number}`}
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Credit Notes"
        description="Issue and manage credit notes for invoices"
        actions={
          <button
            onClick={openForm}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors"
          >
            <ReceiptText className="w-4 h-4" />
            Create Credit Note
          </button>
        }
      />

      {showForm && (
        <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
          <h3 className="text-sm font-medium mb-3 text-gray-900 dark:text-white">New Credit Note</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="cn-invoice" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Invoice</label>
              <select
                id="cn-invoice"
                value={formData.invoiceId}
                onChange={(e) => handleInvoiceSelect(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value={0}>-- Select Invoice --</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} - {inv.customerName || "Unknown"} ({formatCurrency(inv.grossAmount)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cn-customer" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Customer Name</label>
              <input
                id="cn-customer"
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="cn-amount" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Gross Amount *</label>
              <input
                id="cn-amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="cn-reason" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Reason</label>
              <input
                id="cn-reason"
                type="text"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="e.g. Defective product, partial refund"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={formData.amount <= 0}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create Credit Note
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : creditNotes.length === 0 ? (
        <EmptyState
          icon={<ReceiptText className="w-12 h-12" />}
          title="No credit notes yet"
          description="Issue credit notes against existing invoices."
        />
      ) : (
        <DataTable
          columns={columns}
          data={creditNotes}
          keyExtractor={(row) => row.id}
        />
      )}
    </>
  );
}
