"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Search,
  Filter,
  Plus,
  Building2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/* ---------- types ---------- */
interface Lead {
  id: number;
  vatId?: string;
  companyName: string;
  countryCode: string;
  city?: string;
  industry?: string;
  leadScore: number;
  leadStatus: string;
  enrichmentStatus: string;
  employeesRange?: string;
  createdAt: string;
}

interface LeadsResponse {
  leads: Lead[];
  pagination: { page: number; limit: number; total: number; pages: number };
  filters: { countries: string[]; statuses: string[] };
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400",
  qualified: "bg-green-500/20 text-green-400",
  contacted: "bg-yellow-500/20 text-yellow-400",
  converted: "bg-emerald-500/20 text-emerald-300",
  rejected: "bg-red-500/20 text-red-400",
};

const ENRICHMENT_COLORS: Record<string, string> = {
  pending: "bg-gray-500/20 text-gray-400",
  partial: "bg-yellow-500/20 text-yellow-400",
  complete: "bg-green-500/20 text-green-400",
  failed: "bg-red-500/20 text-red-400",
};

/* ---------- helpers ---------- */
function countryFlag(code: string): string {
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0))
  );
}

function scoreColor(score: number): string {
  if (score >= 75) return "bg-green-500/20 text-green-400";
  if (score >= 50) return "bg-yellow-500/20 text-yellow-400";
  if (score >= 25) return "bg-orange-500/20 text-orange-400";
  return "bg-red-500/20 text-red-400";
}

/* ---------- page ---------- */
export default function LeadsPage() {
  const params = useParams();
  const locale = params.locale as string;

  const [data, setData] = useState<LeadsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [status, setStatus] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [page, setPage] = useState(1);
  const [sortDesc, setSortDesc] = useState(true);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (country) qs.set("country", country);
    if (status) qs.set("status", status);
    if (minScore > 0) qs.set("minScore", String(minScore));
    qs.set("page", String(page));
    qs.set("limit", "20");

    try {
      const res = await fetch(`/api/market-map/leads?${qs.toString()}`);
      const json = await res.json();
      setData(json);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [search, country, status, minScore, page]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const leads = data?.leads ?? [];
  const pagination = data?.pagination;
  const availableCountries = data?.filters?.countries ?? [];
  const availableStatuses = data?.filters?.statuses ?? [];

  const sorted = sortDesc ? leads : [...leads].reverse();

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      {/* ---- top bar ---- */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/accounting/market-map`}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <Building2 className="w-5 h-5 text-blue-500" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Business Leads
          </h1>
          {pagination && (
            <span className="text-sm text-gray-500">
              ({pagination.total} total)
            </span>
          )}
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Add Lead
        </button>
      </div>

      {/* ---- filter row ---- */}
      <div className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 shrink-0 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />

        {/* search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 w-56"
          />
        </div>

        {/* country dropdown */}
        <select
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            setPage(1);
          }}
          className="px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        >
          <option value="">All Countries</option>
          {availableCountries.map((c) => (
            <option key={c} value={c}>
              {countryFlag(c)} {c}
            </option>
          ))}
        </select>

        {/* status dropdown */}
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        >
          <option value="">All Statuses</option>
          {(availableStatuses.length > 0
            ? availableStatuses
            : ["new", "qualified", "contacted", "converted", "rejected"]
          ).map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        {/* min score slider */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Min Score:</span>
          <input
            type="range"
            min={0}
            max={100}
            value={minScore}
            onChange={(e) => {
              setMinScore(Number(e.target.value));
              setPage(1);
            }}
            className="w-24 accent-blue-500"
          />
          <span className="text-xs font-mono text-gray-400 w-6 text-right">
            {minScore}
          </span>
        </div>

        {/* sort toggle */}
        <button
          onClick={() => setSortDesc((v) => !v)}
          className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          Score {sortDesc ? "DESC" : "ASC"}
        </button>
      </div>

      {/* ---- table ---- */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400 text-sm">Loading leads...</div>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Building2 className="w-12 h-12 text-gray-600" />
            <div className="text-gray-400 text-sm">No leads found</div>
            <p className="text-gray-500 text-xs max-w-sm text-center">
              Add your first business lead or adjust your filters to see results.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Company
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Country
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    City
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Industry
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Score
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Enrichment
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {sorted.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {lead.companyName}
                      </div>
                      {lead.vatId && (
                        <div className="text-xs text-gray-500">{lead.vatId}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {countryFlag(lead.countryCode)} {lead.countryCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {lead.city ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {lead.industry ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${scoreColor(lead.leadScore)}`}
                      >
                        {lead.leadScore}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.leadStatus] ?? "bg-gray-500/20 text-gray-400"}`}
                      >
                        {lead.leadStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ENRICHMENT_COLORS[lead.enrichmentStatus] ?? "bg-gray-500/20 text-gray-400"}`}
                      >
                        {lead.enrichmentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/${locale}/accounting/market-map/leads/${lead.id}`}
                          className="text-xs text-blue-500 hover:text-blue-400 font-medium transition-colors"
                        >
                          View
                        </Link>
                        <button className="text-xs text-emerald-500 hover:text-emerald-400 font-medium transition-colors">
                          Enrich
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---- pagination ---- */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shrink-0">
          <div className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.pages}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
