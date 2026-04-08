"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader, DataTable, StatusBadge, type Column } from "@opensoftware/ui";
import { Users, Plus, X } from "lucide-react";
import { getEmployees, createEmployee, deleteEmployee } from "./actions";
import type { PayMitarbeiter } from "@opensoftware/db/openpayroll";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
}

const STEUERKLASSEN = [1, 2, 3, 4, 5, 6];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<PayMitarbeiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    personalnummer: "",
    vorname: "",
    nachname: "",
    eintrittsdatum: new Date().toISOString().split("T")[0]!,
    steuerklasse: 1,
    bruttoGehalt: 0,
    krankenkasse: "AOK",
    kirchensteuer: false,
    bundesland: "NW",
  });

  const loadEmployees = useCallback(async () => {
    try {
      const data = await getEmployees();
      setEmployees(data);
    } catch {
      // empty DB
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createEmployee({
        ...formData,
        bruttoGehalt: Number(formData.bruttoGehalt),
        steuerklasse: Number(formData.steuerklasse),
      });
      setShowModal(false);
      setFormData({
        personalnummer: "",
        vorname: "",
        nachname: "",
        eintrittsdatum: new Date().toISOString().split("T")[0]!,
        steuerklasse: 1,
        bruttoGehalt: 0,
        krankenkasse: "AOK",
        kirchensteuer: false,
        bundesland: "NW",
      });
      await loadEmployees();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create employee");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Mitarbeiter wirklich loeschen?")) return;
    await deleteEmployee(id);
    await loadEmployees();
  }

  const columns: Column<PayMitarbeiter>[] = [
    { key: "personalnummer", header: "Personalnr." },
    {
      key: "name",
      header: "Name",
      render: (row) => `${row.vorname} ${row.nachname}`,
    },
    { key: "steuerklasse", header: "Steuerklasse" },
    {
      key: "bruttoGehalt",
      header: "Brutto Gehalt",
      render: (row) => formatCurrency(row.bruttoGehalt),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status ?? "aktiv"} />,
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }}
          className="text-red-500 hover:text-red-700 text-xs"
          aria-label={`Delete employee ${row.vorname} ${row.nachname}`}
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
        title="Mitarbeiter"
        description="Mitarbeiterverwaltung und Stammdaten"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Mitarbeiter hinzufuegen
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={employees}
        keyExtractor={(row) => row.id}
        emptyMessage="Keine Mitarbeiter vorhanden. Legen Sie den ersten Mitarbeiter an."
      />

      {/* Add Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-label="Add employee dialog">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Neuer Mitarbeiter
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600" aria-label="Close dialog">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="personalnummer" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Personalnummer *</label>
                  <input
                    id="personalnummer"
                    required
                    value={formData.personalnummer}
                    onChange={(e) => setFormData((f) => ({ ...f, personalnummer: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    placeholder="M001"
                  />
                </div>
                <div>
                  <label htmlFor="eintrittsdatum" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Eintrittsdatum *</label>
                  <input
                    id="eintrittsdatum"
                    type="date"
                    required
                    value={formData.eintrittsdatum}
                    onChange={(e) => setFormData((f) => ({ ...f, eintrittsdatum: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="vorname" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Vorname *</label>
                  <input
                    id="vorname"
                    required
                    value={formData.vorname}
                    onChange={(e) => setFormData((f) => ({ ...f, vorname: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="nachname" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nachname *</label>
                  <input
                    id="nachname"
                    required
                    value={formData.nachname}
                    onChange={(e) => setFormData((f) => ({ ...f, nachname: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="steuerklasse" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Steuerklasse *</label>
                  <select
                    id="steuerklasse"
                    value={formData.steuerklasse}
                    onChange={(e) => setFormData((f) => ({ ...f, steuerklasse: Number(e.target.value) }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    {STEUERKLASSEN.map((sk) => (
                      <option key={sk} value={sk}>Steuerklasse {sk}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="bruttoGehalt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Brutto Gehalt (EUR) *</label>
                  <input
                    id="bruttoGehalt"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.bruttoGehalt || ""}
                    onChange={(e) => setFormData((f) => ({ ...f, bruttoGehalt: parseFloat(e.target.value) || 0 }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    placeholder="3500.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="krankenkasse" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Krankenkasse</label>
                  <input
                    id="krankenkasse"
                    value={formData.krankenkasse}
                    onChange={(e) => setFormData((f) => ({ ...f, krankenkasse: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="bundesland" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bundesland</label>
                  <input
                    id="bundesland"
                    value={formData.bundesland}
                    onChange={(e) => setFormData((f) => ({ ...f, bundesland: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    placeholder="NW"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="kirchensteuer"
                  type="checkbox"
                  checked={formData.kirchensteuer}
                  onChange={(e) => setFormData((f) => ({ ...f, kirchensteuer: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="kirchensteuer" className="text-sm text-gray-700 dark:text-gray-300">Kirchensteuerpflichtig</label>
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
                  {saving ? "Speichern..." : "Mitarbeiter anlegen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
