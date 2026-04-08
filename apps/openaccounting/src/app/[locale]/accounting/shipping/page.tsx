"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, DataTable, StatusBadge, type Column } from "@opensoftware/ui";
import { Package, AlertTriangle, Plus } from "lucide-react";
import { getShipments } from "./actions";

type AcctShipment = Awaited<ReturnType<typeof getShipments>>[number];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  neu: { label: "Neu", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
  label_erstellt: { label: "Label erstellt", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  abgeholt: { label: "Abgeholt", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" },
  in_zustellung: { label: "In Zustellung", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  zugestellt: { label: "Zugestellt", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  problem: { label: "Problem", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  retour: { label: "Retour", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
};

function ShipmentStatusBadge({ status }: { status: string }) {
  const mapped = STATUS_MAP[status] ?? { label: status, color: "bg-gray-100 text-gray-800" };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${mapped.color}`}
    >
      {mapped.label}
    </span>
  );
}

export default function ShippingPage() {
  const [shipments, setShipments] = useState<AcctShipment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await getShipments();
    setShipments(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns: Column<AcctShipment>[] = [
    {
      key: "number",
      header: "Number",
      render: (row) => (
        <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
          {row.number}
        </span>
      ),
      className: "w-36",
    },
    {
      key: "orderId",
      header: "Order",
      render: (row) => (
        <span className="text-gray-600 dark:text-gray-400">
          {row.orderId ? `#${row.orderId}` : "-"}
        </span>
      ),
      className: "w-20",
    },
    {
      key: "trackingNumber",
      header: "Tracking Number",
      render: (row) => (
        <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
          {row.trackingNumber ?? "-"}
        </span>
      ),
    },
    {
      key: "carrier",
      header: "Carrier",
      render: (row) => (
        <span className="uppercase text-xs font-medium text-gray-700 dark:text-gray-300">
          {row.carrier ?? "-"}
        </span>
      ),
      className: "w-24",
    },
    {
      key: "recipient",
      header: "Recipient",
      render: (row) => (
        <div>
          <p className="text-sm text-gray-900 dark:text-white">{row.recipientName ?? "-"}</p>
          {row.recipientCompany && (
            <p className="text-xs text-gray-500">{row.recipientCompany}</p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <div className="flex items-center gap-2">
          <ShipmentStatusBadge status={row.status ?? "neu"} />
          {row.isProblem && (
            <AlertTriangle className="w-4 h-4 text-red-500" aria-label="Problem reported" />
          )}
        </div>
      ),
      className: "w-40",
    },
    {
      key: "shippedAt",
      header: "Shipped At",
      render: (row) => (
        <span className="text-sm text-gray-500">
          {row.shippedAt
            ? new Date(row.shippedAt).toLocaleDateString("de-DE")
            : "-"}
        </span>
      ),
      className: "w-28",
    },
  ];

  return (
    <>
      <PageHeader
        title="Shipping"
        description="Manage shipments and track deliveries"
        actions={
          <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Shipment
          </button>
        }
      />

      {loading ? (
        <div className="p-6 text-center text-gray-500">Loading shipments...</div>
      ) : shipments.length === 0 ? (
        <div className="p-6">
          <div className="text-center py-16">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No shipments yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Create your first shipment to start tracking deliveries.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
          <DataTable
            columns={columns}
            data={shipments}
            keyExtractor={(row) => row.id}
          />
        </div>
      )}
    </>
  );
}
