"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, DataTable, EmptyState, type Column } from "@opensoftware/ui";
import { FileText, Plus, Trash2 } from "lucide-react";
import { getAngebote, createAngebot, updateAngebotStatus, convertToOrder } from "./actions";

type LineItem = {
  beschreibung: string;
  menge: number;
  einheit: string;
  einzelpreis: number;
  gesamtpreis: number;
};

type Angebot = {
  id: number;
  number: string;
  customerId: number | null;
  customerName: string | null;
  customerEmail: string | null;
  customerCompany: string | null;
  inquiryId: number | null;
  items: LineItem[] | null;
  netAmount: number;
  taxRate: number | null;
  taxAmount: number;
  grossAmount: number;
  validUntil: string | null;
  notes: string | null;
  status: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const STATUS_MAP: Record<string, string> = {
  entwurf: "gray",
  gesendet: "blue",
  angenommen: "green",
  abgelehnt: "red",
  in_auftrag: "purple",
};

const STATUS_LABELS: Record<string, string> = {
  entwurf: "Entwurf",
  gesendet: "Gesendet",
  angenommen: "Angenommen",
  abgelehnt: "Abgelehnt",
  in_auftrag: "In Auftrag",
};

function AngebotStatusBadge({ status }: { status: string }) {
  const color = STATUS_MAP[status] || "gray";
  const colorClasses: Record<string, string> = {
    gray: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    green: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses[color]}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

const EMPTY_ITEM: LineItem = { beschreibung: "", menge: 1, einheit: "Stk", einzelpreis: 0, gesamtpreis: 0 };

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
}

export default function QuotesPage() {
  const [angebote, setAngebote] = useState<Angebot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState<LineItem[]>([{ ...EMPTY_ITEM }]);
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerCompany: "",
    validUntil: "",
    notes: "",
  });

  useEffect(() => {
    loadAngebote();
  }, []);

  async function loadAngebote() {
    setLoading(true);
    const data = await getAngebote();
    setAngebote(data as Angebot[]);
    setLoading(false);
  }

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Auto-calc gesamtpreis
      if (field === "menge" || field === "einzelpreis") {
        const menge = field === "menge" ? Number(value) : updated[index].menge;
        const einzelpreis = field === "einzelpreis" ? Number(value) : updated[index].einzelpreis;
        updated[index].gesamtpreis = Math.round(menge * einzelpreis * 100) / 100;
      }
      return updated;
    });
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const netAmount = items.reduce((sum, item) => sum + item.gesamtpreis, 0);
  const taxAmount = Math.round(netAmount * 0.19 * 100) / 100;
  const grossAmount = Math.round((netAmount + taxAmount) * 100) / 100;

  async function handleCreate() {
    if (items.every((item) => !item.beschreibung.trim())) return;

    const validItems = items.filter((item) => item.beschreibung.trim());
    const result = await createAngebot({
      ...formData,
      items: validItems,
      netAmount,
      taxAmount,
      grossAmount,
    });

    if (result.success) {
      setShowForm(false);
      setFormData({ customerName: "", customerEmail: "", customerCompany: "", validUntil: "", notes: "" });
      setItems([{ ...EMPTY_ITEM }]);
      loadAngebote();
    }
  }

  async function handleStatusChange(id: number, status: "entwurf" | "gesendet" | "angenommen" | "abgelehnt" | "in_auftrag") {
    const result = await updateAngebotStatus(id, status);
    if (result.success) loadAngebote();
  }

  async function handleConvert(id: number) {
    const result = await convertToOrder(id);
    if (result.success) loadAngebote();
  }

  const columns: Column<Angebot>[] = [
    { key: "number", header: "Number" },
    {
      key: "customer",
      header: "Customer",
      render: (row) => row.customerName || row.customerCompany || "-",
    },
    {
      key: "netAmount",
      header: "Net Amount",
      render: (row) => formatCurrency(row.netAmount),
      className: "text-right",
    },
    {
      key: "grossAmount",
      header: "Gross Amount",
      render: (row) => formatCurrency(row.grossAmount),
      className: "text-right font-medium",
    },
    {
      key: "validUntil",
      header: "Valid Until",
      render: (row) => row.validUntil ? new Date(row.validUntil).toLocaleDateString("de-DE") : "-",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <div className="flex items-center gap-2">
          <select
            value={row.status || "entwurf"}
            onChange={(e) => handleStatusChange(row.id, e.target.value as "entwurf" | "gesendet" | "angenommen" | "abgelehnt" | "in_auftrag")}
            className="bg-transparent border-0 text-sm cursor-pointer focus:ring-0 p-0"
            aria-label={`Change status for quote ${row.number}`}
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {row.status === "angenommen" && (
            <button
              onClick={() => handleConvert(row.id)}
              className="text-xs text-emerald-600 hover:text-emerald-700 whitespace-nowrap"
              title="Convert to order"
            >
              &rarr; Order
            </button>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString("de-DE") : "-",
    },
  ];

  return (
    <>
      <PageHeader
        title="Quotes / Angebote"
        description="Create and manage customer quotes"
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Create Quote
          </button>
        }
      />

      {showForm && (
        <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
          <h3 className="text-sm font-medium mb-3 text-gray-900 dark:text-white">New Quote</h3>

          {/* Customer info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label htmlFor="q-name" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Customer Name</label>
              <input
                id="q-name"
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="q-email" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Email</label>
              <input
                id="q-email"
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="q-company" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Company</label>
              <input
                id="q-company"
                type="text"
                value={formData.customerCompany}
                onChange={(e) => setFormData({ ...formData, customerCompany: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Line items editor */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Line Items</h4>
              <button
                onClick={addItem}
                className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"
                type="button"
              >
                <Plus className="w-3 h-3" /> Add Row
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-[40%]">Description</th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-[12%]">Qty</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-[12%]">Unit</th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-[15%]">Unit Price</th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-[15%]">Total</th>
                    <th className="w-[6%]"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          value={item.beschreibung}
                          onChange={(e) => updateItem(idx, "beschreibung", e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          placeholder="Item description"
                          aria-label={`Item ${idx + 1} description`}
                        />
                      </td>
                      <td className="py-1 px-1">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.menge}
                          onChange={(e) => updateItem(idx, "menge", parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm text-right bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          aria-label={`Item ${idx + 1} quantity`}
                        />
                      </td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          value={item.einheit}
                          onChange={(e) => updateItem(idx, "einheit", e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          aria-label={`Item ${idx + 1} unit`}
                        />
                      </td>
                      <td className="py-1 px-1">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.einzelpreis}
                          onChange={(e) => updateItem(idx, "einzelpreis", parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm text-right bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          aria-label={`Item ${idx + 1} unit price`}
                        />
                      </td>
                      <td className="py-1 px-2 text-right text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(item.gesamtpreis)}
                      </td>
                      <td className="py-1 px-1 text-center">
                        <button
                          onClick={() => removeItem(idx)}
                          disabled={items.length <= 1}
                          className="text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label={`Remove item ${idx + 1}`}
                          type="button"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-3 flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Net:</span>
                  <span>{formatCurrency(netAmount)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Tax (19%):</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-1">
                  <span>Gross:</span>
                  <span>{formatCurrency(grossAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label htmlFor="q-valid" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Valid Until</label>
              <input
                id="q-valid"
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="q-notes" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</label>
              <input
                id="q-notes"
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={items.every((item) => !item.beschreibung.trim())}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create Quote
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : angebote.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="No quotes yet"
          description="Create your first quote to send to customers."
        />
      ) : (
        <DataTable
          columns={columns}
          data={angebote}
          keyExtractor={(row) => row.id}
        />
      )}
    </>
  );
}
