"use client";

import { PageHeader, DataTable, type Column } from "@opensoftware/ui";
import { Tags } from "lucide-react";
import { useEffect, useState } from "react";
import { getCategories, createCategory } from "./actions";

interface CategoryRow {
  id: number;
  name: string;
  color: string | null;
  sortOrder: number | null;
  isActive: boolean | null;
  articleCount: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    getCategories()
      .then((data) => setCategories(data as CategoryRow[]))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const result = await createCategory({
      name: form.get("name") as string,
      color: (form.get("color") as string) || "#f59e0b",
    });
    if (result.success) {
      setShowForm(false);
      const refreshed = await getCategories();
      setCategories(refreshed as CategoryRow[]);
    }
  }

  const columns: Column<CategoryRow>[] = [
    { key: "name", header: "Name" },
    {
      key: "color",
      header: "Farbe",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-600"
            style={{ backgroundColor: row.color || "#f59e0b" }}
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">{row.color || "#f59e0b"}</span>
        </div>
      ),
    },
    {
      key: "articleCount",
      header: "Artikel",
      render: (row) => <span>{row.articleCount}</span>,
    },
    {
      key: "isActive",
      header: "Aktiv",
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            row.isActive
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {row.isActive ? "Aktiv" : "Inaktiv"}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Kategorien"
        description="Artikelkategorien verwalten"
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700"
          >
            Kategorie hinzufuegen
          </button>
        }
      />

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Neue Kategorie</h3>
          <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name *
              </label>
              <input
                id="name"
                name="name"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                placeholder="Kategoriename"
              />
            </div>
            <div>
              <label htmlFor="color" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Farbe
              </label>
              <input
                id="color"
                name="color"
                type="color"
                defaultValue="#f59e0b"
                className="mt-1 block h-10 w-16 rounded-md border border-gray-300 dark:border-gray-600 cursor-pointer"
              />
            </div>
            <div className="flex gap-2">
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
          data={categories}
          keyExtractor={(row) => row.id}
          emptyMessage="Noch keine Kategorien angelegt."
        />
      )}
    </>
  );
}
