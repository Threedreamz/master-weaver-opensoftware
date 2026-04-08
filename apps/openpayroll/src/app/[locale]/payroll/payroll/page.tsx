"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader, DataTable, StatusBadge, type Column } from "@opensoftware/ui";
import { Calculator, CheckCircle } from "lucide-react";
import { getPayrollForPeriod, calculatePayroll, approvePayroll, type PayrollEntry } from "./actions";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
}

const MONTHS = [
  "Januar", "Februar", "Maerz", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export default function PayrollPage() {
  const now = new Date();
  const [monat, setMonat] = useState(now.getMonth() + 1);
  const [jahr, setJahr] = useState(now.getFullYear());
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPayrollForPeriod(monat, jahr);
      setEntries(data);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [monat, jahr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCalculate() {
    setCalculating(true);
    setMessage(null);
    try {
      const result = await calculatePayroll(monat, jahr);
      setMessage(
        `Berechnung abgeschlossen: ${result.created} neu, ${result.updated} aktualisiert` +
        (result.errors.length > 0 ? `. Fehler: ${result.errors.join("; ")}` : "")
      );
      await loadData();
    } catch (err) {
      setMessage(`Fehler: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setCalculating(false);
    }
  }

  async function handleApprove() {
    setApproving(true);
    setMessage(null);
    try {
      const count = await approvePayroll(monat, jahr);
      setMessage(`${count} Abrechnungen freigegeben.`);
      await loadData();
    } catch (err) {
      setMessage(`Fehler: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setApproving(false);
    }
  }

  // Totals
  const totalBrutto = entries.reduce((s, e) => s + e.bruttoGesamt, 0);
  const totalLohnsteuer = entries.reduce((s, e) => s + e.lohnsteuer, 0);
  const totalSvAn = entries.reduce((s, e) => s + e.kvAn + e.rvAn + e.avAn + e.pvAn, 0);
  const totalSvAg = entries.reduce((s, e) => s + e.kvAg + e.rvAg + e.avAg + e.pvAg, 0);
  const totalNetto = entries.reduce((s, e) => s + e.netto, 0);

  const columns: Column<PayrollEntry>[] = [
    {
      key: "employee",
      header: "Mitarbeiter",
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{row.mitarbeiterName}</div>
          <div className="text-xs text-gray-500">{row.personalnummer}</div>
        </div>
      ),
    },
    {
      key: "bruttoGesamt",
      header: "Brutto",
      render: (row) => formatCurrency(row.bruttoGesamt),
      className: "text-right",
    },
    {
      key: "lohnsteuer",
      header: "Lohnsteuer",
      render: (row) => formatCurrency(row.lohnsteuer),
      className: "text-right",
    },
    {
      key: "svAn",
      header: "SV AN",
      render: (row) => formatCurrency(row.kvAn + row.rvAn + row.avAn + row.pvAn),
      className: "text-right",
    },
    {
      key: "svAg",
      header: "SV AG",
      render: (row) => formatCurrency(row.kvAg + row.rvAg + row.avAg + row.pvAg),
      className: "text-right",
    },
    {
      key: "netto",
      header: "Netto",
      render: (row) => <span className="font-semibold">{formatCurrency(row.netto)}</span>,
      className: "text-right",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status ?? "entwurf"} />,
    },
  ];

  // Year options: current +/- 2
  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <>
      <PageHeader
        title="Lohnabrechnung"
        description="Monatliche Gehaltsabrechnung berechnen und freigeben"
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={handleCalculate}
              disabled={calculating}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              <Calculator className="w-4 h-4" />
              {calculating ? "Berechne..." : "Berechnen"}
            </button>
            <button
              onClick={handleApprove}
              disabled={approving || entries.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {approving ? "Freigeben..." : "Freigeben"}
            </button>
          </div>
        }
      />

      {/* Period Selector */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <label htmlFor="monat" className="text-sm font-medium text-gray-700 dark:text-gray-300">Monat:</label>
          <select
            id="monat"
            value={monat}
            onChange={(e) => setMonat(Number(e.target.value))}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
          >
            {MONTHS.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="jahr" className="text-sm font-medium text-gray-700 dark:text-gray-300">Jahr:</label>
          <select
            id="jahr"
            value={jahr}
            onChange={(e) => setJahr(Number(e.target.value))}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div className="mb-4 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-300 text-sm">
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={entries}
            keyExtractor={(row) => row.id}
            emptyMessage="Keine Abrechnungen fuer diesen Zeitraum. Klicken Sie 'Berechnen' um die Lohnabrechnung zu starten."
          />

          {/* Totals Row */}
          {entries.length > 0 && (
            <div className="mt-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-5 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Brutto Gesamt</span>
                  <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(totalBrutto)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Lohnsteuer Gesamt</span>
                  <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(totalLohnsteuer)}</p>
                </div>
                <div>
                  <span className="text-gray-500">SV AN Gesamt</span>
                  <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(totalSvAn)}</p>
                </div>
                <div>
                  <span className="text-gray-500">SV AG Gesamt</span>
                  <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(totalSvAg)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Netto Gesamt</span>
                  <p className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">{formatCurrency(totalNetto)}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
