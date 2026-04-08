"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  EmptyState,
  type Column,
} from "@opensoftware/ui";
import { ListTree, Plus, X, Database } from "lucide-react";
import { getKonten, createKonto, seedDefaultKonten, type KontoRow } from "./actions";

const TYP_COLORS: Record<string, string> = {
  aktiv: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  passiv: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  aufwand: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  ertrag: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

export default function KontenplanPage() {
  const [konten, setKonten] = useState<KontoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRahmen, setSelectedRahmen] = useState<"SKR03" | "SKR04">("SKR03");

  const [formData, setFormData] = useState({
    kontonummer: "",
    bezeichnung: "",
    typ: "aufwand" as "aktiv" | "passiv" | "aufwand" | "ertrag",
    kontenrahmen: "SKR03" as "SKR03" | "SKR04",
    kontenklasse: "",
    parentKonto: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getKonten(selectedRahmen);
    setKonten(data);
    setLoading(false);
  }, [selectedRahmen]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const result = await createKonto({
      kontonummer: formData.kontonummer,
      bezeichnung: formData.bezeichnung,
      typ: formData.typ,
      kontenrahmen: formData.kontenrahmen,
      kontenklasse: formData.kontenklasse || undefined,
      parentKonto: formData.parentKonto || undefined,
    });

    setSaving(false);
    if (result.success) {
      setShowForm(false);
      setFormData({
        kontonummer: "",
        bezeichnung: "",
        typ: "aufwand",
        kontenrahmen: "SKR03",
        kontenklasse: "",
        parentKonto: "",
      });
      load();
    } else {
      setError(result.error || "Failed to create account");
    }
  };

  const handleSeed = async () => {
    if (
      !confirm(
        "Seed SKR03 default accounts? This only works if no accounts exist yet."
      )
    )
      return;
    setSeeding(true);
    setError(null);
    const result = await seedDefaultKonten();
    setSeeding(false);
    if (result.success) {
      load();
    } else {
      setError(result.error || "Failed to seed accounts");
    }
  };

  // Group accounts by Kontenklasse for summary
  const typCounts = konten.reduce(
    (acc, k) => {
      acc[k.typ] = (acc[k.typ] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const columns: Column<KontoRow>[] = [
    {
      key: "kontonummer",
      header: "Kontonummer",
      render: (row) => (
        <span className="font-mono font-medium text-gray-900 dark:text-white">
          {row.kontonummer}
        </span>
      ),
      className: "w-28",
    },
    {
      key: "bezeichnung",
      header: "Bezeichnung",
      render: (row) => (
        <span className="text-sm">{row.bezeichnung}</span>
      ),
    },
    {
      key: "typ",
      header: "Typ",
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYP_COLORS[row.typ] || ""}`}
        >
          {row.typ}
        </span>
      ),
      className: "w-24",
    },
    {
      key: "kontenrahmen",
      header: "Kontenrahmen",
      render: (row) => (
        <span className="text-xs font-medium text-gray-500">
          {row.kontenrahmen}
        </span>
      ),
      className: "w-28",
    },
    {
      key: "kontenklasse",
      header: "Klasse",
      render: (row) => (
        <span className="font-mono text-xs text-gray-500">
          {row.kontenklasse || "-"}
        </span>
      ),
      className: "w-16",
    },
    {
      key: "isActive",
      header: "Active",
      render: (row) =>
        row.isActive ? (
          <span className="inline-flex w-2 h-2 rounded-full bg-green-500" />
        ) : (
          <span className="inline-flex w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
        ),
      className: "w-16 text-center",
    },
  ];

  return (
    <>
      <PageHeader
        title="Chart of Accounts"
        description="Manage your chart of accounts (Kontenplan / SKR)"
        actions={
          <div className="flex items-center gap-2">
            {konten.length === 0 && !loading && (
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="px-4 py-2 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm hover:bg-emerald-50 dark:hover:bg-emerald-950 flex items-center gap-2 disabled:opacity-50"
              >
                <Database className="w-4 h-4" />
                {seeding ? "Seeding..." : "Seed SKR03 Defaults"}
              </button>
            )}
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-2"
            >
              {showForm ? (
                <>
                  <X className="w-4 h-4" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Account
                </>
              )}
            </button>
          </div>
        }
      />

      {/* Kontenrahmen toggle */}
      <div className="mb-4 flex items-center gap-4">
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setSelectedRahmen("SKR03")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              selectedRahmen === "SKR03"
                ? "bg-emerald-600 text-white"
                : "bg-white dark:bg-gray-950 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"
            }`}
          >
            SKR03
          </button>
          <button
            onClick={() => setSelectedRahmen("SKR04")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              selectedRahmen === "SKR04"
                ? "bg-emerald-600 text-white"
                : "bg-white dark:bg-gray-950 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"
            }`}
          >
            SKR04
          </button>
        </div>
        {konten.length > 0 && (
          <div className="flex gap-3 text-xs">
            {Object.entries(typCounts).map(([typ, count]) => (
              <span
                key={typ}
                className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${TYP_COLORS[typ] || ""}`}
              >
                {typ}: {count}
              </span>
            ))}
            <span className="text-gray-500">
              Total: {konten.length}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 p-6 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            New Account
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="kt-nummer"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Kontonummer *
              </label>
              <input
                id="kt-nummer"
                type="text"
                required
                placeholder="e.g. 1200"
                value={formData.kontonummer}
                onChange={(e) =>
                  setFormData({ ...formData, kontonummer: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label
                htmlFor="kt-bezeichnung"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Bezeichnung *
              </label>
              <input
                id="kt-bezeichnung"
                type="text"
                required
                value={formData.bezeichnung}
                onChange={(e) =>
                  setFormData({ ...formData, bezeichnung: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label
                htmlFor="kt-typ"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Typ *
              </label>
              <select
                id="kt-typ"
                value={formData.typ}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    typ: e.target.value as
                      | "aktiv"
                      | "passiv"
                      | "aufwand"
                      | "ertrag",
                  })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="aktiv">Aktiv (Asset)</option>
                <option value="passiv">Passiv (Liability)</option>
                <option value="aufwand">Aufwand (Expense)</option>
                <option value="ertrag">Ertrag (Revenue)</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="kt-rahmen"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Kontenrahmen
              </label>
              <select
                id="kt-rahmen"
                value={formData.kontenrahmen}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    kontenrahmen: e.target.value as "SKR03" | "SKR04",
                  })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="SKR03">SKR03</option>
                <option value="SKR04">SKR04</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="kt-klasse"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Kontenklasse
              </label>
              <input
                id="kt-klasse"
                type="text"
                placeholder="e.g. 1"
                value={formData.kontenklasse}
                onChange={(e) =>
                  setFormData({ ...formData, kontenklasse: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label
                htmlFor="kt-parent"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Parent Konto
              </label>
              <input
                id="kt-parent"
                type="text"
                placeholder="e.g. 1200"
                value={formData.parentKonto}
                onChange={(e) =>
                  setFormData({ ...formData, parentKonto: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Create Account"}
            </button>
          </div>
        </form>
      )}

      {/* Table or empty state */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : konten.length === 0 ? (
        <EmptyState
          icon={<ListTree className="w-12 h-12" />}
          title="No accounts configured"
          description="Set up your chart of accounts based on SKR03 or SKR04 to start bookkeeping."
          action={
            <div className="flex gap-2">
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {seeding ? "Seeding..." : "Seed SKR03 Defaults"}
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                Add Manually
              </button>
            </div>
          }
        />
      ) : (
        <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
          <DataTable
            columns={columns}
            data={konten}
            keyExtractor={(row) => row.id}
          />
        </div>
      )}
    </>
  );
}
