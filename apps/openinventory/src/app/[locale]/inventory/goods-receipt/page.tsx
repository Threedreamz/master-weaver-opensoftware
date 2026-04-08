"use client";

import { PageHeader, DataTable, StatusBadge, type Column } from "@opensoftware/ui";
import { PackageCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { getGoodsReceipts, updateGoodsReceiptStatus } from "./actions";

interface ReceiptRow {
  id: number;
  bestellnummer: string | null;
  lieferantName: string | null;
  positionen: unknown;
  status: string | null;
  geprueftVon: string | null;
  createdAt: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  offen: "Offen",
  geprueft: "Geprueft",
  eingelagert: "Eingelagert",
};

export default function GoodsReceiptPage() {
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    const data = await getGoodsReceipts();
    setReceipts(data as ReceiptRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleStatusChange(id: number, newStatus: "offen" | "geprueft" | "eingelagert") {
    const result = await updateGoodsReceiptStatus(id, newStatus);
    if (result.success) {
      await loadData();
    }
  }

  const columns: Column<ReceiptRow>[] = [
    {
      key: "bestellnummer",
      header: "Bestellung",
      render: (row) => row.bestellnummer || "-",
    },
    {
      key: "lieferantName",
      header: "Lieferant",
      render: (row) => row.lieferantName || "-",
    },
    {
      key: "positionen",
      header: "Positionen",
      render: (row) => {
        const pos = row.positionen as Array<unknown> | null;
        return <span>{pos?.length ?? 0}</span>;
      },
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <StatusBadge status={STATUS_LABELS[row.status || "offen"] || row.status || "Offen"} />
      ),
    },
    {
      key: "actions",
      header: "Aktion",
      render: (row) => {
        if (row.status === "eingelagert") return <span className="text-xs text-gray-400">Abgeschlossen</span>;
        const nextStatus = row.status === "offen" ? "geprueft" : "eingelagert";
        const nextLabel = row.status === "offen" ? "Pruefen" : "Einlagern";
        return (
          <button
            onClick={() => handleStatusChange(row.id, nextStatus as "geprueft" | "eingelagert")}
            className="px-3 py-1 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-full hover:bg-amber-200 dark:hover:bg-amber-900/50"
          >
            {nextLabel}
          </button>
        );
      },
    },
    {
      key: "createdAt",
      header: "Erstellt",
      render: (row) =>
        row.createdAt
          ? new Date(row.createdAt).toLocaleDateString("de-DE")
          : "-",
    },
  ];

  return (
    <>
      <PageHeader
        title="Wareneingang"
        description="Wareneingaenge und Qualitaetspruefung"
      />

      {loading ? (
        <div className="text-center py-12 text-gray-500">Laden...</div>
      ) : (
        <DataTable
          columns={columns}
          data={receipts}
          keyExtractor={(row) => row.id}
          emptyMessage="Noch keine Wareneingaenge erfasst."
        />
      )}
    </>
  );
}
