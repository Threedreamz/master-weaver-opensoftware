"use client";

import { PageHeader, DataTable, StatusBadge, type Column } from "@opensoftware/ui";
import { Factory } from "lucide-react";
import { useEffect, useState } from "react";
import { getProductionOrders, createProductionOrder, updateProductionStep } from "./actions";

interface ProductionRow {
  id: number;
  number: string;
  customerName: string | null;
  customerCompany: string | null;
  currentStep: string | null;
  status: string | null;
  scanningStatus: string | null;
  cadStatus: string | null;
  qsCadStatus: string | null;
  druckenStatus: string | null;
  qsDruckenStatus: string | null;
  createdAt: string | null;
}

const STEPS = [
  { key: "scanning", label: "Scanning", statusKey: "scanningStatus" },
  { key: "cad", label: "CAD", statusKey: "cadStatus" },
  { key: "qs_cad", label: "QS CAD", statusKey: "qsCadStatus" },
  { key: "drucken", label: "Drucken", statusKey: "druckenStatus" },
  { key: "qs_drucken", label: "QS Drucken", statusKey: "qsDruckenStatus" },
] as const;

const STEP_STATUS_COLORS: Record<string, string> = {
  offen: "bg-gray-200 dark:bg-gray-700",
  in_bearbeitung: "bg-amber-400",
  abgeschlossen: "bg-green-500",
  abgelehnt: "bg-red-500",
};

function PipelineSteps({ row }: { row: ProductionRow }) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, idx) => {
        const status = (row as Record<string, unknown>)[step.statusKey] as string || "offen";
        const isCurrent = row.currentStep === step.key;
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center" title={`${step.label}: ${status}`}>
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                  STEP_STATUS_COLORS[status] || STEP_STATUS_COLORS.offen
                } ${status === "abgeschlossen" || status === "abgelehnt" ? "text-white" : "text-gray-700 dark:text-gray-200"} ${
                  isCurrent ? "ring-2 ring-amber-500 ring-offset-1 dark:ring-offset-gray-900" : ""
                }`}
              >
                {idx + 1}
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 whitespace-nowrap">
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className="w-3 h-0.5 bg-gray-300 dark:bg-gray-600 mx-0.5 mt-[-12px]" />
            )}
          </div>
        );
      })}
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  neu: "Neu",
  in_bearbeitung: "In Bearbeitung",
  abgeschlossen: "Abgeschlossen",
  storniert: "Storniert",
};

export default function ProductionPage() {
  const [orders, setOrders] = useState<ProductionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function loadData() {
    const data = await getProductionOrders();
    setOrders(data as ProductionRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const result = await createProductionOrder({
      number: form.get("number") as string,
      customerName: (form.get("customerName") as string) || undefined,
      customerCompany: (form.get("customerCompany") as string) || undefined,
    });
    if (result.success) {
      setShowForm(false);
      await loadData();
    }
  }

  const columns: Column<ProductionRow>[] = [
    { key: "number", header: "Nummer" },
    {
      key: "customerName",
      header: "Kunde",
      render: (row) => (
        <div>
          {row.customerName && (
            <div className="text-gray-900 dark:text-white">{row.customerName}</div>
          )}
          {row.customerCompany && (
            <div className="text-xs text-gray-500">{row.customerCompany}</div>
          )}
          {!row.customerName && !row.customerCompany && "-"}
        </div>
      ),
    },
    {
      key: "pipeline",
      header: "Fortschritt",
      render: (row) => <PipelineSteps row={row} />,
    },
    {
      key: "currentStep",
      header: "Aktueller Schritt",
      render: (row) => {
        const step = STEPS.find((s) => s.key === row.currentStep);
        return (
          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
            {step?.label || row.currentStep || "-"}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <StatusBadge status={STATUS_LABELS[row.status || "neu"] || row.status || "Neu"} />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Produktion"
        description="Produktionsauftraege und Fertigungspipeline"
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700"
          >
            Neuer Auftrag
          </button>
        }
      />

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Neuer Produktionsauftrag</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="number" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Auftragsnummer *
              </label>
              <input
                id="number"
                name="number"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                placeholder="PA-001"
              />
            </div>
            <div>
              <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Kundenname
              </label>
              <input
                id="customerName"
                name="customerName"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                placeholder="Kundenname"
              />
            </div>
            <div>
              <label htmlFor="customerCompany" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Firma
              </label>
              <input
                id="customerCompany"
                name="customerCompany"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                placeholder="Firmenname"
              />
            </div>
            <div className="sm:col-span-3 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700"
              >
                Erstellen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pipeline legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="font-medium">Legende:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700" />
          <span>Offen</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <span>In Bearbeitung</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Abgeschlossen</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Abgelehnt</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Laden...</div>
      ) : (
        <DataTable
          columns={columns}
          data={orders}
          keyExtractor={(row) => row.id}
          emptyMessage="Noch keine Produktionsauftraege vorhanden."
        />
      )}
    </>
  );
}
