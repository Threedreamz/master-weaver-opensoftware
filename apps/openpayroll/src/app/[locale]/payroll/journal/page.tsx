"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader, DataTable, StatusBadge, type Column } from "@opensoftware/ui";
import { Download } from "lucide-react";
import { getPayrollForPeriod, type PayrollEntry } from "../payroll/actions";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
}

const MONTHS = [
  "Januar", "Februar", "Maerz", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export default function JournalPage() {
  const now = new Date();
  const [monat, setMonat] = useState(now.getMonth() + 1);
  const [jahr, setJahr] = useState(now.getFullYear());
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [loading, setLoading] = useState(true);

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

  function handleExportCsv() {
    if (entries.length === 0) return;

    const headers = [
      "Personalnummer", "Name", "Brutto", "Lohnsteuer", "Soli", "Kirchensteuer",
      "KV AN", "KV AG", "RV AN", "RV AG", "AV AN", "AV AG", "PV AN", "PV AG",
      "Netto", "Auszahlung", "Status",
    ];

    const rows = entries.map((e) => [
      e.personalnummer ?? "",
      e.mitarbeiterName ?? "",
      e.bruttoGesamt.toFixed(2),
      e.lohnsteuer.toFixed(2),
      (e.solidaritaetszuschlag ?? 0).toFixed(2),
      (e.kirchensteuerBetrag ?? 0).toFixed(2),
      e.kvAn.toFixed(2),
      e.kvAg.toFixed(2),
      e.rvAn.toFixed(2),
      e.rvAg.toFixed(2),
      e.avAn.toFixed(2),
      e.avAg.toFixed(2),
      e.pvAn.toFixed(2),
      e.pvAg.toFixed(2),
      e.netto.toFixed(2),
      e.auszahlung.toFixed(2),
      e.status ?? "",
    ]);

    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lohnjournal_${jahr}_${String(monat).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Totals
  const totalBrutto = entries.reduce((s, e) => s + e.bruttoGesamt, 0);
  const totalLohnsteuer = entries.reduce((s, e) => s + e.lohnsteuer, 0);
  const totalSoli = entries.reduce((s, e) => s + (e.solidaritaetszuschlag ?? 0), 0);
  const totalKirchensteuer = entries.reduce((s, e) => s + (e.kirchensteuerBetrag ?? 0), 0);
  const totalSvAn = entries.reduce((s, e) => s + e.kvAn + e.rvAn + e.avAn + e.pvAn, 0);
  const totalSvAg = entries.reduce((s, e) => s + e.kvAg + e.rvAg + e.avAg + e.pvAg, 0);
  const totalNetto = entries.reduce((s, e) => s + e.netto, 0);
  const totalAuszahlung = entries.reduce((s, e) => s + e.auszahlung, 0);

  const columns: Column<PayrollEntry>[] = [
    {
      key: "personalnummer",
      header: "PNr.",
      render: (row) => row.personalnummer ?? "",
    },
    {
      key: "name",
      header: "Name",
      render: (row) => row.mitarbeiterName ?? "",
    },
    {
      key: "bruttoGesamt",
      header: "Brutto",
      render: (row) => formatCurrency(row.bruttoGesamt),
      className: "text-right",
    },
    {
      key: "lohnsteuer",
      header: "LSt",
      render: (row) => formatCurrency(row.lohnsteuer),
      className: "text-right",
    },
    {
      key: "soli",
      header: "Soli",
      render: (row) => formatCurrency(row.solidaritaetszuschlag ?? 0),
      className: "text-right",
    },
    {
      key: "kirchensteuer",
      header: "KiSt",
      render: (row) => formatCurrency(row.kirchensteuerBetrag ?? 0),
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

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <>
      <PageHeader
        title="Lohnjournal"
        description="Uebersicht aller Lohnabrechnungen fuer einen Zeitraum"
        actions={
          <button
            onClick={handleExportCsv}
            disabled={entries.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            CSV Export
          </button>
        }
      />

      {/* Period Selector */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <label htmlFor="journal-monat" className="text-sm font-medium text-gray-700 dark:text-gray-300">Monat:</label>
          <select
            id="journal-monat"
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
          <label htmlFor="journal-jahr" className="text-sm font-medium text-gray-700 dark:text-gray-300">Jahr:</label>
          <select
            id="journal-jahr"
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
            emptyMessage="Keine Journaleintraege fuer diesen Zeitraum."
          />

          {/* Summary Totals */}
          {entries.length > 0 && (
            <div className="mt-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                Zusammenfassung {MONTHS[monat - 1]} {jahr}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                <div>
                  <span className="text-gray-500">Brutto Gesamt</span>
                  <p className="font-bold text-gray-900 dark:text-white text-lg">{formatCurrency(totalBrutto)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Lohnsteuer</span>
                  <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(totalLohnsteuer)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Soli</span>
                  <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(totalSoli)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Kirchensteuer</span>
                  <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(totalKirchensteuer)}</p>
                </div>
                <div>
                  <span className="text-gray-500">SV Arbeitnehmer</span>
                  <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(totalSvAn)}</p>
                </div>
                <div>
                  <span className="text-gray-500">SV Arbeitgeber</span>
                  <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(totalSvAg)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Netto Gesamt</span>
                  <p className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">{formatCurrency(totalNetto)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Auszahlung Gesamt</span>
                  <p className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">{formatCurrency(totalAuszahlung)}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
