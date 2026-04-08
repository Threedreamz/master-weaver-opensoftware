"use client";

import { PageHeader, DataTable, StatusBadge, type Column } from "@opensoftware/ui";
import { Truck, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { getSuppliers, createSupplier } from "./actions";

interface SupplierRow {
  id: number;
  nummer: string;
  name: string;
  kontakt: string | null;
  email: string | null;
  telefon: string | null;
  bewertung: number | null;
  status: string | null;
}

function StarRating({ rating }: { rating: number | null }) {
  const stars = rating ?? 0;
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`${stars} von 5 Sternen`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i <= stars
              ? "fill-amber-400 text-amber-400"
              : "text-gray-300 dark:text-gray-600"
          }`}
        />
      ))}
    </div>
  );
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    getSuppliers()
      .then((data) => setSuppliers(data as SupplierRow[]))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const result = await createSupplier({
      nummer: form.get("nummer") as string,
      name: form.get("name") as string,
      kontakt: (form.get("kontakt") as string) || undefined,
      email: (form.get("email") as string) || undefined,
      bewertung: Number(form.get("bewertung")) || undefined,
    });
    if (result.success) {
      setShowForm(false);
      const refreshed = await getSuppliers();
      setSuppliers(refreshed as SupplierRow[]);
    }
  }

  const columns: Column<SupplierRow>[] = [
    { key: "nummer", header: "Nummer" },
    { key: "name", header: "Name" },
    { key: "kontakt", header: "Kontakt", render: (row) => row.kontakt || "-" },
    { key: "email", header: "Email", render: (row) => row.email || "-" },
    {
      key: "bewertung",
      header: "Bewertung",
      render: (row) => <StarRating rating={row.bewertung} />,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status || "aktiv"} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Lieferanten"
        description="Lieferantenstammdaten verwalten"
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700"
          >
            Lieferant hinzufuegen
          </button>
        }
      />

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Neuer Lieferant</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="nummer" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nummer *
              </label>
              <input
                id="nummer"
                name="nummer"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                placeholder="LIF-001"
              />
            </div>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name *
              </label>
              <input
                id="name"
                name="name"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                placeholder="Firmenname"
              />
            </div>
            <div>
              <label htmlFor="kontakt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Kontakt
              </label>
              <input
                id="kontakt"
                name="kontakt"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                placeholder="Ansprechpartner"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                placeholder="lieferant@example.com"
              />
            </div>
            <div>
              <label htmlFor="bewertung" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Bewertung (1-5)
              </label>
              <input
                id="bewertung"
                name="bewertung"
                type="number"
                min="1"
                max="5"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                placeholder="3"
              />
            </div>
            <div className="flex items-end gap-2">
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
                Speichern
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Laden...</div>
      ) : (
        <DataTable
          columns={columns}
          data={suppliers}
          keyExtractor={(row) => row.id}
          emptyMessage="Noch keine Lieferanten angelegt."
        />
      )}
    </>
  );
}
