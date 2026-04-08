"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, DataTable, type Column } from "@opensoftware/ui";
import { Building2, Plus } from "lucide-react";
import { getAnlagegueter } from "./actions";

type AcctAnlagegut = Awaited<ReturnType<typeof getAnlagegueter>>[number];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  aktiv: { label: "Aktiv", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  vollstaendig_abgeschrieben: { label: "Voll abgeschrieben", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
  ausgeschieden: { label: "Ausgeschieden", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
};

function AssetStatusBadge({ status }: { status: string }) {
  const mapped = STATUS_MAP[status] ?? { label: status, color: "bg-gray-100 text-gray-800" };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${mapped.color}`}
    >
      {mapped.label}
    </span>
  );
}

function DepreciationProgress({ asset }: { asset: AcctAnlagegut }) {
  const total = asset.anschaffungskosten;
  const depreciated = asset.kumulierteAfa ?? 0;
  const pct = total > 0 ? Math.min(100, (depreciated / total) * 100) : 0;

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Depreciation ${pct.toFixed(0)}%`}
        />
      </div>
      <span className="text-xs text-gray-500 w-10 text-right">{pct.toFixed(0)}%</span>
    </div>
  );
}

const eurFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

export default function FixedAssetsPage() {
  const [assets, setAssets] = useState<AcctAnlagegut[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await getAnlagegueter();
    setAssets(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns: Column<AcctAnlagegut>[] = [
    {
      key: "inventarnummer",
      header: "Inventarnr.",
      render: (row) => (
        <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
          {row.inventarnummer}
        </span>
      ),
      className: "w-28",
    },
    {
      key: "bezeichnung",
      header: "Bezeichnung",
      render: (row) => (
        <span className="text-sm text-gray-900 dark:text-white">{row.bezeichnung}</span>
      ),
    },
    {
      key: "anschaffungsdatum",
      header: "Anschaffungsdatum",
      render: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.anschaffungsdatum).toLocaleDateString("de-DE")}
        </span>
      ),
      className: "w-36",
    },
    {
      key: "anschaffungskosten",
      header: "Anschaffungskosten",
      render: (row) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white text-right block">
          {eurFormatter.format(row.anschaffungskosten)}
        </span>
      ),
      className: "w-36 text-right",
    },
    {
      key: "nutzungsdauerJahre",
      header: "Nutzungsdauer",
      render: (row) => (
        <span className="text-sm text-gray-500">{row.nutzungsdauerJahre} Jahre</span>
      ),
      className: "w-28",
    },
    {
      key: "afaMethode",
      header: "AfA Methode",
      render: (row) => (
        <span className="text-xs uppercase font-medium text-gray-600 dark:text-gray-400">
          {row.afaMethode ?? "linear"}
        </span>
      ),
      className: "w-24",
    },
    {
      key: "kumulierteAfa",
      header: "Kumulierte AfA",
      render: (row) => <DepreciationProgress asset={row} />,
      className: "w-40",
    },
    {
      key: "restwert",
      header: "Restwert",
      render: (row) => (
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400 text-right block">
          {eurFormatter.format(row.restwert ?? 0)}
        </span>
      ),
      className: "w-28 text-right",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <AssetStatusBadge status={row.status ?? "aktiv"} />,
      className: "w-36",
    },
  ];

  return (
    <>
      <PageHeader
        title="Fixed Assets"
        description="Manage fixed assets and depreciation (Anlagenbuchhaltung)"
        actions={
          <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Asset
          </button>
        }
      />

      {loading ? (
        <div className="p-6 text-center text-gray-500">Loading assets...</div>
      ) : assets.length === 0 ? (
        <div className="p-6">
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No fixed assets yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Add your first fixed asset to start tracking depreciation.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
          <DataTable
            columns={columns}
            data={assets}
            keyExtractor={(row) => row.id}
          />
        </div>
      )}
    </>
  );
}
