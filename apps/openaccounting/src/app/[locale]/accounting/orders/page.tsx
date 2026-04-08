"use client";

import { useState, useEffect } from "react";
import { PageHeader, DataTable, EmptyState, type Column } from "@opensoftware/ui";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import { getOrders, createOrder, updateOrderStatus, getOrderDetail } from "./actions";

type LineItem = {
  beschreibung: string;
  menge: number;
  einheit: string;
  einzelpreis: number;
  gesamtpreis: number;
};

type Order = {
  id: number;
  number: string;
  customerId: number | null;
  customerName: string | null;
  customerEmail: string | null;
  customerCompany: string | null;
  customerType: string | null;
  inquiryId: number | null;
  angebotId: number | null;
  items: LineItem[] | null;
  netAmount: number;
  taxRate: number | null;
  taxAmount: number;
  grossAmount: number;
  notes: string | null;
  status: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const STATUS_MAP: Record<string, string> = {
  neu: "blue",
  in_bearbeitung: "yellow",
  in_produktion: "purple",
  versendet: "indigo",
  abgeschlossen: "green",
  storniert: "red",
};

const STATUS_LABELS: Record<string, string> = {
  neu: "Neu",
  in_bearbeitung: "In Bearbeitung",
  in_produktion: "In Produktion",
  versendet: "Versendet",
  abgeschlossen: "Abgeschlossen",
  storniert: "Storniert",
};

function OrderStatusBadge({ status }: { status: string }) {
  const color = STATUS_MAP[status] || "gray";
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    indigo: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    green: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    gray: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses[color]}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailData, setDetailData] = useState<{ inquiry: unknown; angebot: unknown } | null>(null);
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerCompany: "",
    customerType: "B2C" as "B2B" | "B2C",
    notes: "",
  });

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    const data = await getOrders();
    setOrders(data as Order[]);
    setLoading(false);
  }

  async function handleCreate() {
    if (!formData.customerName.trim()) return;
    const result = await createOrder({
      ...formData,
      items: [{ beschreibung: "Position 1", menge: 1, einheit: "Stk", einzelpreis: 0, gesamtpreis: 0 }],
      netAmount: 0,
      taxAmount: 0,
      grossAmount: 0,
    });
    if (result.success) {
      setShowForm(false);
      setFormData({ customerName: "", customerEmail: "", customerCompany: "", customerType: "B2C", notes: "" });
      loadOrders();
    }
  }

  async function handleStatusChange(id: number, status: "neu" | "in_bearbeitung" | "in_produktion" | "versendet" | "abgeschlossen" | "storniert") {
    const result = await updateOrderStatus(id, status);
    if (result.success) loadOrders();
  }

  async function handleViewDetail(order: Order) {
    setSelectedOrder(order);
    const result = await getOrderDetail(order.id);
    if (result.success) {
      setDetailData({ inquiry: result.inquiry, angebot: result.angebot });
    }
  }

  const columns: Column<Order>[] = [
    { key: "number", header: "Number" },
    {
      key: "customer",
      header: "Customer",
      render: (row) => row.customerName || row.customerCompany || "-",
    },
    {
      key: "customerType",
      header: "Type",
      render: (row) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
          row.customerType === "B2B"
            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
            : "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
        }`}>
          {row.customerType || "B2C"}
        </span>
      ),
    },
    {
      key: "netAmount",
      header: "Net Amount",
      render: (row) => formatCurrency(row.netAmount),
      className: "text-right",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <select
          value={row.status || "neu"}
          onChange={(e) => handleStatusChange(row.id, e.target.value as "neu" | "in_bearbeitung" | "in_produktion" | "versendet" | "abgeschlossen" | "storniert")}
          className="bg-transparent border-0 text-sm cursor-pointer focus:ring-0 p-0"
          aria-label={`Change status for order ${row.number}`}
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString("de-DE") : "-",
    },
  ];

  // Detail view
  if (selectedOrder) {
    const items = selectedOrder.items || [];
    return (
      <>
        <div className="mb-4">
          <button
            onClick={() => { setSelectedOrder(null); setDetailData(null); }}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Orders
          </button>
        </div>
        <PageHeader
          title={`Order ${selectedOrder.number}`}
          description={`${selectedOrder.customerName || "Unknown customer"} - ${STATUS_LABELS[selectedOrder.status || "neu"]}`}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Customer</h3>
            <p className="text-sm text-gray-900 dark:text-white">{selectedOrder.customerName || "-"}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{selectedOrder.customerCompany || ""}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{selectedOrder.customerEmail || ""}</p>
            <p className="mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                selectedOrder.customerType === "B2B"
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                  : "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              }`}>
                {selectedOrder.customerType || "B2C"}
              </span>
            </p>
          </div>
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Linked Documents</h3>
            <p className="text-sm text-gray-900 dark:text-white">
              Inquiry: {selectedOrder.inquiryId ? `#${selectedOrder.inquiryId}` : "None"}
            </p>
            <p className="text-sm text-gray-900 dark:text-white">
              Quote: {selectedOrder.angebotId ? `#${selectedOrder.angebotId}` : "None"}
            </p>
          </div>
        </div>

        {items.length > 0 && (
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 mb-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Items</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 dark:text-gray-400">Description</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 dark:text-gray-400">Qty</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 dark:text-gray-400">Unit</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 dark:text-gray-400">Unit Price</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 px-2">{item.beschreibung}</td>
                    <td className="py-2 px-2 text-right">{item.menge}</td>
                    <td className="py-2 px-2">{item.einheit}</td>
                    <td className="py-2 px-2 text-right">{formatCurrency(item.einzelpreis)}</td>
                    <td className="py-2 px-2 text-right font-medium">{formatCurrency(item.gesamtpreis)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Net:</span>
                  <span>{formatCurrency(selectedOrder.netAmount)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Tax ({selectedOrder.taxRate || 19}%):</span>
                  <span>{formatCurrency(selectedOrder.taxAmount)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-1">
                  <span>Gross:</span>
                  <span>{formatCurrency(selectedOrder.grossAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Orders"
        description="Track and manage customer orders"
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            Create Order
          </button>
        }
      />

      {showForm && (
        <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
          <h3 className="text-sm font-medium mb-3 text-gray-900 dark:text-white">New Order</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="ord-name" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Customer Name *</label>
              <input
                id="ord-name"
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="ord-email" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Email</label>
              <input
                id="ord-email"
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="ord-company" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Company</label>
              <input
                id="ord-company"
                type="text"
                value={formData.customerCompany}
                onChange={(e) => setFormData({ ...formData, customerCompany: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="ord-type" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Customer Type</label>
              <select
                id="ord-type"
                value={formData.customerType}
                onChange={(e) => setFormData({ ...formData, customerType: e.target.value as "B2B" | "B2C" })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="B2C">B2C</option>
                <option value="B2B">B2B</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="ord-notes" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</label>
              <textarea
                id="ord-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
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
              disabled={!formData.customerName.trim()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create Order
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="w-12 h-12" />}
          title="No orders yet"
          description="Orders are created from accepted quotes or manually."
        />
      ) : (
        <DataTable
          columns={columns}
          data={orders}
          keyExtractor={(row) => row.id}
          onRowClick={handleViewDetail}
        />
      )}
    </>
  );
}
