"use client";

import { PageHeader, DataTable, StatusBadge, type Column } from "@opensoftware/ui";
import { Warehouse } from "lucide-react";
import { useEffect, useState } from "react";
import { getStockMovements } from "./actions";

interface MovementRow {
  id: number;
  artikelBezeichnung: string | null;
  artikelnummer: string | null;
  typ: string;
  menge: number;
  bestandVorher: number;
  bestandNachher: number;
  notizen: string | null;
  createdAt: string | null;
}

const TYP_LABELS: Record<string, string> = {
  zugang: "Zugang",
  abgang: "Abgang",
  korrektur: "Korrektur",
  inventur: "Inventur",
};

const TYP_COLORS: Record<string, string> = {
  zugang: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  abgang: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  korrektur: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  inventur: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
};

export default function WarehousePage() {
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTyp, setFilterTyp] = useState<string>("");

  useEffect(() => {
    const filters = filterTyp ? { typ: filterTyp } : undefined;
    getStockMovements(filters)
      .then((data) => setMovements(data as MovementRow[]))
      .finally(() => setLoading(false));
  }, [filterTyp]);

  const columns: Column<MovementRow>[] = [
    {
      key: "artikelnummer",
      header: "Artikel",
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {row.artikelBezeichnung || "-"}
          </div>
          <div className="text-xs text-gray-500">{row.artikelnummer}</div>
        </div>
      ),
    },
    {
      key: "typ",
      header: "Typ",
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            TYP_COLORS[row.typ] || TYP_COLORS.korrektur
          }`}
        >
          {TYP_LABELS[row.typ] || row.typ}
        </span>
      ),
    },
    {
      key: "menge",
      header: "Menge",
      render: (row) => (
        <span className={row.typ === "abgang" ? "text-red-600" : "text-green-600"}>
          {row.typ === "abgang" ? "-" : "+"}{row.menge}
        </span>
      ),
    },
    {
      key: "bestandVorher",
      header: "Bestand vorher",
      render: (row) => <span>{row.bestandVorher}</span>,
    },
    {
      key: "bestandNachher",
      header: "Bestand nachher",
      render: (row) => <span className="font-medium">{row.bestandNachher}</span>,
    },
    {
      key: "createdAt",
      header: "Datum",
      render: (row) =>
        row.createdAt
          ? new Date(row.createdAt).toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "-",
    },
  ];

  return (
    <>
      <PageHeader
        title="Lager"
        description="Lagerbewegungen und Bestandsverlauf"
      />

      {/* Filter bar */}
      <div className="flex items-center gap-4 mb-6">
        <label htmlFor="filterTyp" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Typ:
        </label>
        <select
          id="filterTyp"
          value={filterTyp}
          onChange={(e) => {
            setLoading(true);
            setFilterTyp(e.target.value);
          }}
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
        >
          <option value="">Alle</option>
          <option value="zugang">Zugang</option>
          <option value="abgang">Abgang</option>
          <option value="korrektur">Korrektur</option>
          <option value="inventur">Inventur</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Laden...</div>
      ) : (
        <DataTable
          columns={columns}
          data={movements}
          keyExtractor={(row) => row.id}
          emptyMessage="Noch keine Lagerbewegungen erfasst."
        />
      )}
    </>
  );
}
