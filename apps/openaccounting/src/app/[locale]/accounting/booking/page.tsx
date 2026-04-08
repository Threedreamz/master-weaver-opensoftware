"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  EmptyState,
  type Column,
} from "@opensoftware/ui";
import { BookOpen, Plus, X, Filter } from "lucide-react";
import {
  getBookingEntries,
  createBookingEntry,
  updateBookingStatus,
  type BookingRow,
} from "./actions";

const EUR = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

export default function BookingPage() {
  const [entries, setEntries] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const [formData, setFormData] = useState({
    datum: new Date().toISOString().split("T")[0]!,
    betrag: 0,
    sollHaben: "S" as "S" | "H",
    konto: "",
    gegenkonto: "",
    buchungstext: "",
    belegnummer: "",
    steuerschluessel: "",
    kostenstelle: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const filters: { status?: string; dateFrom?: string; dateTo?: string } = {};
    if (filterStatus) filters.status = filterStatus;
    if (filterDateFrom) filters.dateFrom = filterDateFrom;
    if (filterDateTo) filters.dateTo = filterDateTo;

    const data = await getBookingEntries(
      Object.keys(filters).length > 0 ? filters : undefined
    );
    setEntries(data);
    setLoading(false);
  }, [filterStatus, filterDateFrom, filterDateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const result = await createBookingEntry({
      datum: formData.datum,
      betrag: formData.betrag,
      sollHaben: formData.sollHaben,
      konto: formData.konto,
      gegenkonto: formData.gegenkonto,
      buchungstext: formData.buchungstext,
      belegnummer: formData.belegnummer || undefined,
      steuerschluessel: formData.steuerschluessel || undefined,
      kostenstelle: formData.kostenstelle || undefined,
    });

    setSaving(false);
    if (result.success) {
      setShowForm(false);
      setFormData({
        datum: new Date().toISOString().split("T")[0]!,
        betrag: 0,
        sollHaben: "S",
        konto: "",
        gegenkonto: "",
        buchungstext: "",
        belegnummer: "",
        steuerschluessel: "",
        kostenstelle: "",
      });
      load();
    } else {
      setError(result.error || "Failed to create booking entry");
    }
  };

  const handleStatusChange = async (
    id: number,
    status: "vorschlag" | "geprueft" | "exportiert"
  ) => {
    await updateBookingStatus(id, status);
    load();
  };

  const columns: Column<BookingRow>[] = [
    {
      key: "datum",
      header: "Date",
      render: (row) => <span className="text-xs tabular-nums">{row.datum}</span>,
      className: "w-24",
    },
    {
      key: "betrag",
      header: "Betrag",
      render: (row) => (
        <span className="font-medium tabular-nums">{EUR.format(row.betrag)}</span>
      ),
      className: "w-28 text-right",
    },
    {
      key: "sollHaben",
      header: "S/H",
      render: (row) => (
        <span
          className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${
            row.sollHaben === "S"
              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
          }`}
        >
          {row.sollHaben}
        </span>
      ),
      className: "w-16 text-center",
    },
    {
      key: "konto",
      header: "Konto",
      render: (row) => (
        <span className="font-mono text-xs">{row.konto}</span>
      ),
      className: "w-20",
    },
    {
      key: "gegenkonto",
      header: "Gegenkonto",
      render: (row) => (
        <span className="font-mono text-xs">{row.gegenkonto}</span>
      ),
      className: "w-24",
    },
    {
      key: "buchungstext",
      header: "Buchungstext",
      render: (row) => (
        <span className="text-sm text-gray-700 dark:text-gray-300 line-clamp-1">
          {row.buchungstext}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={row.status || "vorschlag"} />
          {row.status !== "exportiert" && (
            <select
              value={row.status || "vorschlag"}
              onChange={(e) =>
                handleStatusChange(
                  row.id,
                  e.target.value as "vorschlag" | "geprueft" | "exportiert"
                )
              }
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent border-none text-xs cursor-pointer focus:outline-none text-gray-400"
              aria-label={`Change status for booking entry ${row.id}`}
            >
              <option value="vorschlag">Vorschlag</option>
              <option value="geprueft">Geprueft</option>
              <option value="exportiert">Exportiert</option>
            </select>
          )}
        </div>
      ),
      className: "w-40",
    },
  ];

  return (
    <>
      <PageHeader
        title="Booking"
        description="Double-entry journal bookings"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 border ${
                showFilters
                  ? "border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"
              }`}
            >
              <Filter className="w-4 h-4" />
              Filter
            </button>
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
                  New Booking
                </>
              )}
            </button>
          </div>
        }
      />

      {/* Filter bar */}
      {showFilters && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg flex flex-wrap items-end gap-4">
          <div>
            <label
              htmlFor="filter-status"
              className="block text-xs text-gray-500 mb-1"
            >
              Status
            </label>
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-sm"
            >
              <option value="">All</option>
              <option value="vorschlag">Vorschlag</option>
              <option value="geprueft">Geprueft</option>
              <option value="exportiert">Exportiert</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="filter-from"
              className="block text-xs text-gray-500 mb-1"
            >
              From
            </label>
            <input
              id="filter-from"
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="filter-to"
              className="block text-xs text-gray-500 mb-1"
            >
              To
            </label>
            <input
              id="filter-to"
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-sm"
            />
          </div>
          <button
            onClick={() => {
              setFilterStatus("");
              setFilterDateFrom("");
              setFilterDateTo("");
            }}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 p-6 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            New Booking Entry
          </h3>
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label
                htmlFor="bk-datum"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Datum *
              </label>
              <input
                id="bk-datum"
                type="date"
                required
                value={formData.datum}
                onChange={(e) =>
                  setFormData({ ...formData, datum: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label
                htmlFor="bk-betrag"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Betrag *
              </label>
              <input
                id="bk-betrag"
                type="number"
                step="0.01"
                required
                value={formData.betrag || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    betrag: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label
                htmlFor="bk-sh"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Soll/Haben *
              </label>
              <select
                id="bk-sh"
                value={formData.sollHaben}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sollHaben: e.target.value as "S" | "H",
                  })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="S">S (Soll / Debit)</option>
                <option value="H">H (Haben / Credit)</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="bk-konto"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Konto *
              </label>
              <input
                id="bk-konto"
                type="text"
                required
                placeholder="e.g. 1200"
                value={formData.konto}
                onChange={(e) =>
                  setFormData({ ...formData, konto: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label
                htmlFor="bk-gegenkonto"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Gegenkonto *
              </label>
              <input
                id="bk-gegenkonto"
                type="text"
                required
                placeholder="e.g. 8400"
                value={formData.gegenkonto}
                onChange={(e) =>
                  setFormData({ ...formData, gegenkonto: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="md:col-span-2">
              <label
                htmlFor="bk-text"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Buchungstext *
              </label>
              <input
                id="bk-text"
                type="text"
                required
                value={formData.buchungstext}
                onChange={(e) =>
                  setFormData({ ...formData, buchungstext: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label
                htmlFor="bk-beleg"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Belegnummer
              </label>
              <input
                id="bk-beleg"
                type="text"
                value={formData.belegnummer}
                onChange={(e) =>
                  setFormData({ ...formData, belegnummer: e.target.value })
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
              {saving ? "Saving..." : "Create Booking Entry"}
            </button>
          </div>
        </form>
      )}

      {/* Table or empty state */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-12 h-12" />}
          title="No bookings yet"
          description="Create journal entries with double-entry debit and credit postings."
          action={
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
            >
              New Booking
            </button>
          }
        />
      ) : (
        <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
          <DataTable
            columns={columns}
            data={entries}
            keyExtractor={(row) => row.id}
          />
        </div>
      )}
    </>
  );
}
