"use client";

import { PageHeader, DataTable, StatusBadge, type Column } from "@opensoftware/ui";
import { ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { getOrders } from "./actions";

interface OrderRow {
  id: number;
  bestellnummer: string;
  lieferantName: string | null;
  nettoBetrag: number;
  status: string | null;
  bestelltAm: string | null;
  createdAt: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  entwurf: "Entwurf",
  angefordert: "Angefordert",
  genehmigt: "Genehmigt",
  bestellt: "Bestellt",
  teilgeliefert: "Teilgeliefert",
  geliefert: "Geliefert",
  storniert: "Storniert",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrders()
      .then((data) => setOrders(data as OrderRow[]))
      .finally(() => setLoading(false));
  }, []);

  const columns: Column<OrderRow>[] = [
    { key: "bestellnummer", header: "Bestellnummer" },
    {
      key: "lieferantName",
      header: "Lieferant",
      render: (row) => row.lieferantName || "-",
    },
    {
      key: "nettoBetrag",
      header: "Netto",
      render: (row) => (
        <span>
          {row.nettoBetrag.toLocaleString("de-DE", {
            style: "currency",
            currency: "EUR",
          })}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <StatusBadge status={STATUS_LABELS[row.status || "entwurf"] || row.status || "Entwurf"} />
      ),
    },
    {
      key: "bestelltAm",
      header: "Bestellt am",
      render: (row) =>
        row.bestelltAm
          ? new Date(row.bestelltAm).toLocaleDateString("de-DE")
          : "-",
    },
  ];

  return (
    <>
      <PageHeader
        title="Bestellungen"
        description="Einkaufsbestellungen verwalten"
        actions={
          <button className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700">
            Neue Bestellung
          </button>
        }
      />

      {loading ? (
        <div className="text-center py-12 text-gray-500">Laden...</div>
      ) : (
        <DataTable
          columns={columns}
          data={orders}
          keyExtractor={(row) => row.id}
          emptyMessage="Noch keine Bestellungen vorhanden."
        />
      )}
    </>
  );
}
