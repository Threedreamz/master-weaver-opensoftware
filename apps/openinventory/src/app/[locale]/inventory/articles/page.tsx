"use client";

import { PageHeader, DataTable, StatusBadge, type Column } from "@opensoftware/ui";
import { BoxIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { getArticles, createArticle } from "./actions";

interface ArticleRow {
  id: number;
  artikelnummer: string;
  bezeichnung: string;
  kategorie: string | null;
  lagerbestand: number | null;
  mindestbestand: number | null;
  einheit: string | null;
  preisProEinheit: number | null;
  status: string | null;
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    getArticles()
      .then((data) => setArticles(data as ArticleRow[]))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const result = await createArticle({
      artikelnummer: form.get("artikelnummer") as string,
      bezeichnung: form.get("bezeichnung") as string,
      einheit: (form.get("einheit") as string) || "Stueck",
      mindestbestand: Number(form.get("mindestbestand")) || 0,
      lagerbestand: Number(form.get("lagerbestand")) || 0,
      preisProEinheit: Number(form.get("preisProEinheit")) || undefined,
    });
    if (result.success) {
      setShowForm(false);
      const refreshed = await getArticles();
      setArticles(refreshed as ArticleRow[]);
    }
  }

  const columns: Column<ArticleRow>[] = [
    { key: "artikelnummer", header: "Artikelnr." },
    { key: "bezeichnung", header: "Bezeichnung" },
    { key: "kategorie", header: "Kategorie", render: (row) => row.kategorie || "-" },
    {
      key: "lagerbestand",
      header: "Lagerbestand",
      render: (row) => {
        const isLow =
          row.mindestbestand != null &&
          row.mindestbestand > 0 &&
          (row.lagerbestand ?? 0) < row.mindestbestand;
        return (
          <span className={isLow ? "text-red-600 dark:text-red-400 font-semibold" : ""}>
            {row.lagerbestand ?? 0} {row.einheit || ""}
            {isLow && " (!)"}
          </span>
        );
      },
    },
    {
      key: "mindestbestand",
      header: "Mindestbestand",
      render: (row) => (
        <span>{row.mindestbestand ?? 0} {row.einheit || ""}</span>
      ),
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
        title="Artikel"
        description="Artikelstammdaten verwalten"
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700"
          >
            Artikel hinzufuegen
          </button>
        }
      />

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Neuer Artikel</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="artikelnummer" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Artikelnummer *
              </label>
              <input
                id="artikelnummer"
                name="artikelnummer"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                placeholder="ART-001"
              />
            </div>
            <div>
              <label htmlFor="bezeichnung" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Bezeichnung *
              </label>
              <input
                id="bezeichnung"
                name="bezeichnung"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                placeholder="Artikelbezeichnung"
              />
            </div>
            <div>
              <label htmlFor="einheit" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Einheit
              </label>
              <input
                id="einheit"
                name="einheit"
                defaultValue="Stueck"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="lagerbestand" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Lagerbestand
              </label>
              <input
                id="lagerbestand"
                name="lagerbestand"
                type="number"
                step="0.01"
                defaultValue="0"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="mindestbestand" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Mindestbestand
              </label>
              <input
                id="mindestbestand"
                name="mindestbestand"
                type="number"
                step="0.01"
                defaultValue="0"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="preisProEinheit" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Preis / Einheit (EUR)
              </label>
              <input
                id="preisProEinheit"
                name="preisProEinheit"
                type="number"
                step="0.01"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                placeholder="0.00"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-2 justify-end">
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
          data={articles}
          keyExtractor={(row) => row.id}
          emptyMessage="Noch keine Artikel angelegt."
        />
      )}
    </>
  );
}
