"use client";

import { useState, useEffect } from "react";
import { PageHeader, DataTable, EmptyState, type Column } from "@opensoftware/ui";
import { AlertTriangle } from "lucide-react";
import { getReminders, createReminder, getOverdueInvoices } from "./actions";

type Reminder = {
  id: number;
  invoiceId: number;
  level: number;
  fee: number | null;
  interestRate: number | null;
  interestAmount: number | null;
  totalDue: number;
  dueDate: string;
  notes: string | null;
  status: string | null;
  sentAt: string | null;
  createdAt: string | null;
  invoiceNumber: string | null;
  invoiceGrossAmount: number | null;
};

type OverdueInvoice = {
  id: number;
  invoiceNumber: string;
  customerName: string | null;
  grossAmount: number;
  dueDate: string;
  status: string | null;
};

const LEVEL_COLORS: Record<number, string> = {
  1: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  2: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  3: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const LEVEL_LABELS: Record<number, string> = {
  1: "1. Mahnung",
  2: "2. Mahnung",
  3: "3. Mahnung",
};

const STATUS_LABELS: Record<string, string> = {
  entwurf: "Entwurf",
  gesendet: "Gesendet",
  bezahlt: "Bezahlt",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [overdueInvoices, setOverdueInvoices] = useState<OverdueInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    invoiceId: 0,
    level: 1,
    fee: 5,
    interestRate: 0,
    interestAmount: 0,
    dueDate: "",
    notes: "",
  });

  useEffect(() => {
    loadReminders();
  }, []);

  async function loadReminders() {
    setLoading(true);
    const data = await getReminders();
    setReminders(data as Reminder[]);
    setLoading(false);
  }

  async function openForm() {
    const invoices = await getOverdueInvoices();
    setOverdueInvoices(invoices as OverdueInvoice[]);
    // Default due date: 14 days from now
    const due = new Date();
    due.setDate(due.getDate() + 14);
    setFormData({ ...formData, dueDate: due.toISOString().split("T")[0] });
    setShowForm(true);
  }

  function handleInvoiceSelect(invoiceId: number) {
    const inv = overdueInvoices.find((i) => i.id === invoiceId);
    const grossAmount = inv?.grossAmount || 0;
    const fee = formData.level === 1 ? 5 : formData.level === 2 ? 10 : 15;
    const interestAmount = Math.round(grossAmount * (formData.interestRate / 100) * 100) / 100;
    setFormData({
      ...formData,
      invoiceId,
      fee,
      interestAmount,
    });
  }

  async function handleCreate() {
    if (formData.invoiceId === 0 || !formData.dueDate) return;

    const inv = overdueInvoices.find((i) => i.id === formData.invoiceId);
    const grossAmount = inv?.grossAmount || 0;
    const totalDue = grossAmount + (formData.fee || 0) + (formData.interestAmount || 0);

    const result = await createReminder({
      invoiceId: formData.invoiceId,
      level: formData.level,
      fee: formData.fee,
      interestRate: formData.interestRate,
      interestAmount: formData.interestAmount,
      totalDue,
      dueDate: formData.dueDate,
      notes: formData.notes || undefined,
    });

    if (result.success) {
      setShowForm(false);
      setFormData({ invoiceId: 0, level: 1, fee: 5, interestRate: 0, interestAmount: 0, dueDate: "", notes: "" });
      loadReminders();
    }
  }

  const columns: Column<Reminder>[] = [
    {
      key: "invoiceNumber",
      header: "Invoice",
      render: (row) => row.invoiceNumber || `#${row.invoiceId}`,
    },
    {
      key: "level",
      header: "Level",
      render: (row) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${LEVEL_COLORS[row.level] || LEVEL_COLORS[1]}`}>
          {LEVEL_LABELS[row.level] || `Level ${row.level}`}
        </span>
      ),
    },
    {
      key: "totalDue",
      header: "Total Due",
      render: (row) => formatCurrency(row.totalDue),
      className: "text-right font-medium",
    },
    {
      key: "fee",
      header: "Fee",
      render: (row) => formatCurrency(row.fee || 0),
      className: "text-right",
    },
    {
      key: "interestAmount",
      header: "Interest",
      render: (row) => formatCurrency(row.interestAmount || 0),
      className: "text-right",
    },
    {
      key: "dueDate",
      header: "Due Date",
      render: (row) => new Date(row.dueDate).toLocaleDateString("de-DE"),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const status = row.status || "entwurf";
        const colorClasses: Record<string, string> = {
          entwurf: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
          gesendet: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
          bezahlt: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        };
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses[status] || colorClasses.entwurf}`}>
            {STATUS_LABELS[status] || status}
          </span>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Reminders / Mahnungen"
        description="Manage payment reminders for overdue invoices"
        actions={
          <button
            onClick={openForm}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            Create Reminder
          </button>
        }
      />

      {showForm && (
        <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
          <h3 className="text-sm font-medium mb-3 text-gray-900 dark:text-white">New Reminder</h3>

          {overdueInvoices.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No overdue invoices found. Only invoices past their due date with status &quot;gesendet&quot; are shown.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="rem-invoice" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Overdue Invoice *</label>
                <select
                  id="rem-invoice"
                  value={formData.invoiceId}
                  onChange={(e) => handleInvoiceSelect(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value={0}>-- Select Invoice --</option>
                  {overdueInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} - {inv.customerName || "Unknown"} ({formatCurrency(inv.grossAmount)}) - due {new Date(inv.dueDate).toLocaleDateString("de-DE")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="rem-level" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Level</label>
                <select
                  id="rem-level"
                  value={formData.level}
                  onChange={(e) => {
                    const level = parseInt(e.target.value, 10);
                    const fee = level === 1 ? 5 : level === 2 ? 10 : 15;
                    setFormData({ ...formData, level, fee });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value={1}>1. Mahnung</option>
                  <option value={2}>2. Mahnung</option>
                  <option value={3}>3. Mahnung</option>
                </select>
              </div>
              <div>
                <label htmlFor="rem-fee" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Fee</label>
                <input
                  id="rem-fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.fee}
                  onChange={(e) => setFormData({ ...formData, fee: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="rem-due" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Due Date *</label>
                <input
                  id="rem-due"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="rem-notes" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</label>
                <input
                  id="rem-notes"
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={formData.invoiceId === 0 || !formData.dueDate}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create Reminder
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : reminders.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="w-12 h-12" />}
          title="No reminders yet"
          description="Create reminders for overdue invoices to notify customers."
        />
      ) : (
        <DataTable
          columns={columns}
          data={reminders}
          keyExtractor={(row) => row.id}
        />
      )}
    </>
  );
}
