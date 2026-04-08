"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader, DataTable, StatusBadge, type Column } from "@opensoftware/ui";
import { Plus, X, Check, XCircle } from "lucide-react";
import { getSalaryTypes, createSalaryType, deleteSalaryType } from "./actions";
import type { PayLohnart } from "@opensoftware/db/openpayroll";

const TYP_OPTIONS = [
  { value: "brutto", label: "Brutto" },
  { value: "netto", label: "Netto" },
  { value: "abzug", label: "Abzug" },
  { value: "ag_anteil", label: "AG-Anteil" },
] as const;

export default function SalaryTypesPage() {
  const [salaryTypes, setSalaryTypes] = useState<PayLohnart[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nummer: "",
    bezeichnung: "",
    typ: "brutto" as "brutto" | "netto" | "abzug" | "ag_anteil",
    kontoSoll: "",
    kontoHaben: "",
    steuerpflichtig: true,
    svPflichtig: true,
  });

  const loadData = useCallback(async () => {
    try {
      const data = await getSalaryTypes();
      setSalaryTypes(data);
    } catch {
      // empty DB
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createSalaryType(formData);
      setShowModal(false);
      setFormData({
        nummer: "",
        bezeichnung: "",
        typ: "brutto",
        kontoSoll: "",
        kontoHaben: "",
        steuerpflichtig: true,
        svPflichtig: true,
      });
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create salary type");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Lohnart wirklich loeschen?")) return;
    await deleteSalaryType(id);
    await loadData();
  }

  function BoolIcon({ value }: { value: boolean | null }) {
    return value ? (
      <Check className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-gray-400" />
    );
  }

  const columns: Column<PayLohnart>[] = [
    { key: "nummer", header: "Nummer" },
    { key: "bezeichnung", header: "Bezeichnung" },
    {
      key: "typ",
      header: "Typ",
      render: (row) => <StatusBadge status={row.typ} />,
    },
    {
      key: "steuerpflichtig",
      header: "Steuerpflichtig",
      render: (row) => <BoolIcon value={row.steuerpflichtig} />,
    },
    {
      key: "svPflichtig",
      header: "SV-pflichtig",
      render: (row) => <BoolIcon value={row.svPflichtig} />,
    },
    {
      key: "isActive",
      header: "Active",
      render: (row) => <StatusBadge status={row.isActive ? "active" : "archived"} />,
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }}
          className="text-red-500 hover:text-red-700 text-xs"
          aria-label={`Delete salary type ${row.bezeichnung}`}
        >
          Delete
        </button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Lohnarten"
        description="Verwaltung der Lohn- und Gehaltsarten"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Lohnart hinzufuegen
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={salaryTypes}
        keyExtractor={(row) => row.id}
        emptyMessage="Keine Lohnarten vorhanden. Legen Sie die erste Lohnart an."
      />

      {/* Add Salary Type Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-label="Add salary type dialog">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Neue Lohnart
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600" aria-label="Close dialog">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nummer" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nummer *</label>
                  <input
                    id="nummer"
                    required
                    value={formData.nummer}
                    onChange={(e) => setFormData((f) => ({ ...f, nummer: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label htmlFor="typ" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Typ *</label>
                  <select
                    id="typ"
                    value={formData.typ}
                    onChange={(e) => setFormData((f) => ({ ...f, typ: e.target.value as typeof formData.typ }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    {TYP_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="bezeichnung" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bezeichnung *</label>
                <input
                  id="bezeichnung"
                  required
                  value={formData.bezeichnung}
                  onChange={(e) => setFormData((f) => ({ ...f, bezeichnung: e.target.value }))}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="Grundgehalt"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="kontoSoll" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Konto Soll</label>
                  <input
                    id="kontoSoll"
                    value={formData.kontoSoll}
                    onChange={(e) => setFormData((f) => ({ ...f, kontoSoll: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    placeholder="6000"
                  />
                </div>
                <div>
                  <label htmlFor="kontoHaben" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Konto Haben</label>
                  <input
                    id="kontoHaben"
                    value={formData.kontoHaben}
                    onChange={(e) => setFormData((f) => ({ ...f, kontoHaben: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    placeholder="3720"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <input
                    id="steuerpflichtig"
                    type="checkbox"
                    checked={formData.steuerpflichtig}
                    onChange={(e) => setFormData((f) => ({ ...f, steuerpflichtig: e.target.checked }))}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="steuerpflichtig" className="text-sm text-gray-700 dark:text-gray-300">Steuerpflichtig</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="svPflichtig"
                    type="checkbox"
                    checked={formData.svPflichtig}
                    onChange={(e) => setFormData((f) => ({ ...f, svPflichtig: e.target.checked }))}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="svPflichtig" className="text-sm text-gray-700 dark:text-gray-300">SV-pflichtig</label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Speichern..." : "Lohnart anlegen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
