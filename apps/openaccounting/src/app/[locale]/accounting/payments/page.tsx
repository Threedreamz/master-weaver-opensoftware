"use client";

import { useState, useEffect } from "react";
import { PageHeader, DataTable, EmptyState, type Column } from "@opensoftware/ui";
import { Banknote } from "lucide-react";
import { getPayments, recordPayment, assignPaymentToInvoice } from "./actions";

type Payment = {
  id: number;
  invoiceId: number | null;
  orderId: number | null;
  method: string | null;
  amount: number;
  currency: string | null;
  reference: string | null;
  payerName: string | null;
  payerEmail: string | null;
  payerIban: string | null;
  notes: string | null;
  status: string | null;
  type: string | null;
  originalPaymentId: number | null;
  creditNoteId: number | null;
  paidAt: string | null;
  createdAt: string | null;
};

const STATUS_MAP: Record<string, string> = {
  offen: "gray",
  eingegangen: "green",
  zugeordnet: "blue",
  erstattet: "red",
};

const STATUS_LABELS: Record<string, string> = {
  offen: "Offen",
  eingegangen: "Eingegangen",
  zugeordnet: "Zugeordnet",
  erstattet: "Erstattet",
};

const TYPE_LABELS: Record<string, string> = {
  eingang: "Eingang",
  ausgang: "Ausgang",
  erstattung: "Erstattung",
};

const METHOD_LABELS: Record<string, string> = {
  ueberweisung: "Uberweisung",
  sepa: "SEPA",
  karte: "Karte",
  paypal: "PayPal",
  klarna: "Klarna",
  bar: "Bar",
};

function formatCurrency(value: number, currency = "EUR"): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(value);
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    method: "ueberweisung" as "ueberweisung" | "sepa" | "karte" | "paypal" | "klarna" | "bar",
    amount: 0,
    payerName: "",
    payerEmail: "",
    payerIban: "",
    reference: "",
    type: "eingang" as "eingang" | "ausgang" | "erstattung",
    notes: "",
    paidAt: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    setLoading(true);
    const data = await getPayments();
    setPayments(data as Payment[]);
    setLoading(false);
  }

  async function handleCreate() {
    if (formData.amount <= 0) return;

    const result = await recordPayment({
      method: formData.method,
      amount: formData.amount,
      payerName: formData.payerName || undefined,
      payerEmail: formData.payerEmail || undefined,
      payerIban: formData.payerIban || undefined,
      reference: formData.reference || undefined,
      type: formData.type,
      notes: formData.notes || undefined,
      paidAt: formData.paidAt || undefined,
    });

    if (result.success) {
      setShowForm(false);
      setFormData({
        method: "ueberweisung",
        amount: 0,
        payerName: "",
        payerEmail: "",
        payerIban: "",
        reference: "",
        type: "eingang",
        notes: "",
        paidAt: new Date().toISOString().split("T")[0],
      });
      loadPayments();
    }
  }

  const columns: Column<Payment>[] = [
    {
      key: "reference",
      header: "Invoice / Order",
      render: (row) => {
        const parts: string[] = [];
        if (row.invoiceId) parts.push(`Inv #${row.invoiceId}`);
        if (row.orderId) parts.push(`Ord #${row.orderId}`);
        if (row.reference) parts.push(row.reference);
        return parts.length > 0 ? parts.join(", ") : "-";
      },
    },
    {
      key: "method",
      header: "Method",
      render: (row) => METHOD_LABELS[row.method || ""] || row.method || "-",
    },
    {
      key: "amount",
      header: "Amount",
      render: (row) => formatCurrency(row.amount, row.currency || "EUR"),
      className: "text-right font-medium",
    },
    {
      key: "payerName",
      header: "Payer",
      render: (row) => row.payerName || "-",
    },
    {
      key: "type",
      header: "Type",
      render: (row) => {
        const type = row.type || "eingang";
        const typeColors: Record<string, string> = {
          eingang: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300",
          ausgang: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300",
          erstattung: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300",
        };
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeColors[type] || typeColors.eingang}`}>
            {TYPE_LABELS[type] || type}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const status = row.status || "offen";
        const colorClasses: Record<string, string> = {
          offen: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
          eingegangen: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
          zugeordnet: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
          erstattet: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        };
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses[status] || colorClasses.offen}`}>
            {STATUS_LABELS[status] || status}
          </span>
        );
      },
    },
    {
      key: "paidAt",
      header: "Date",
      render: (row) => {
        const date = row.paidAt || row.createdAt;
        return date ? new Date(date).toLocaleDateString("de-DE") : "-";
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Payments"
        description="Record and track incoming and outgoing payments"
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors"
          >
            <Banknote className="w-4 h-4" />
            Record Payment
          </button>
        }
      />

      {showForm && (
        <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
          <h3 className="text-sm font-medium mb-3 text-gray-900 dark:text-white">Record Payment</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label htmlFor="pay-amount" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Amount *</label>
              <input
                id="pay-amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="pay-method" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Method</label>
              <select
                id="pay-method"
                value={formData.method}
                onChange={(e) => setFormData({ ...formData, method: e.target.value as "ueberweisung" | "sepa" | "karte" | "paypal" | "klarna" | "bar" })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {Object.entries(METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pay-type" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Type</label>
              <select
                id="pay-type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as "eingang" | "ausgang" | "erstattung" })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pay-payer" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Payer Name</label>
              <input
                id="pay-payer"
                type="text"
                value={formData.payerName}
                onChange={(e) => setFormData({ ...formData, payerName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="pay-email" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Payer Email</label>
              <input
                id="pay-email"
                type="email"
                value={formData.payerEmail}
                onChange={(e) => setFormData({ ...formData, payerEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="pay-iban" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">IBAN</label>
              <input
                id="pay-iban"
                type="text"
                value={formData.payerIban}
                onChange={(e) => setFormData({ ...formData, payerIban: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="pay-ref" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Reference</label>
              <input
                id="pay-ref"
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="pay-date" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Payment Date</label>
              <input
                id="pay-date"
                type="date"
                value={formData.paidAt}
                onChange={(e) => setFormData({ ...formData, paidAt: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="pay-notes" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</label>
              <input
                id="pay-notes"
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
              Record Payment
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : payments.length === 0 ? (
        <EmptyState
          icon={<Banknote className="w-12 h-12" />}
          title="No payments recorded"
          description="Record your first payment to start tracking cash flow."
        />
      ) : (
        <DataTable
          columns={columns}
          data={payments}
          keyExtractor={(row) => row.id}
        />
      )}
    </>
  );
}
