"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronLeft,
  Building2,
  Globe,
  FileText,
  MapPin,
  Zap,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Briefcase,
  TrendingUp,
  Users,
  Factory,
} from "lucide-react";

/* ---------- types ---------- */
interface Lead {
  id: number;
  vatId?: string;
  companyName: string;
  legalForm?: string;
  countryCode: string;
  postalCode?: string;
  city?: string;
  street?: string;
  website?: string;
  domain?: string;
  industry?: string;
  employeesRange?: string;
  revenueRange?: string;
  registerNumber?: string;
  registerCourt?: string;
  creditScore?: number;
  creditRating?: string;
  insolvencyRisk?: boolean;
  latitude?: number;
  longitude?: number;
  enrichmentStatus: string;
  enrichmentDate?: string;
  leadScore: number;
  leadStatus: string;
  source?: string;
  tags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/* ---------- helpers ---------- */
function countryFlag(code: string): string {
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0))
  );
}

function scoreBarColor(score: number): string {
  if (score >= 75) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  if (score >= 25) return "#f97316";
  return "#ef4444";
}

function scoreBadgeClass(score: number): string {
  if (score >= 75) return "bg-green-500/20 text-green-400";
  if (score >= 50) return "bg-yellow-500/20 text-yellow-400";
  if (score >= 25) return "bg-orange-500/20 text-orange-400";
  return "bg-red-500/20 text-red-400";
}

const STATUS_OPTIONS = ["new", "qualified", "contacted", "converted", "rejected"];

const ENRICHMENT_STAGES = [
  { key: "vat_lookup", label: "VAT Lookup" },
  { key: "register_check", label: "Register Check" },
  { key: "credit_score", label: "Credit Score" },
  { key: "website_scan", label: "Website Scan" },
  { key: "geocoding", label: "Geocoding" },
];

/* ---------- page ---------- */
export default function LeadDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    fetch(`/api/market-map/leads/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Lead not found");
        return r.json();
      })
      .then((data) => {
        setLead(data);
        setNotes(data.notes ?? "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const updateLead = async (patch: Partial<Lead>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/market-map/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const updated = await res.json();
        setLead(updated);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEnrich = async () => {
    setEnriching(true);
    try {
      const res = await fetch("/api/market-map/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: Number(id) }),
      });
      if (res.ok) {
        // Re-fetch lead to get updated enrichment data
        const updated = await fetch(`/api/market-map/leads/${id}`);
        if (updated.ok) setLead(await updated.json());
      }
    } finally {
      setEnriching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950">
        <div className="text-zinc-400 text-sm">Loading lead...</div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-zinc-950 gap-3">
        <AlertTriangle className="w-10 h-10 text-red-400" />
        <div className="text-zinc-400 text-sm">{error ?? "Lead not found"}</div>
        <Link
          href="/leads"
          className="text-blue-500 hover:text-blue-400 text-sm"
        >
          Back to Leads
        </Link>
      </div>
    );
  }

  const enrichmentComplete = lead.enrichmentStatus === "complete";

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* ---- header ---- */}
      <div className="flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Link
            href="/leads"
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <span className="text-2xl">{countryFlag(lead.countryCode)}</span>
          <div>
            <h1 className="text-lg font-semibold text-white">
              {lead.companyName}
            </h1>
            <div className="text-xs text-zinc-500">
              {lead.countryCode} &middot; ID #{lead.id} &middot; Added{" "}
              {new Date(lead.createdAt).toLocaleDateString()}
            </div>
          </div>
          <span
            className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${scoreBadgeClass(lead.leadScore)}`}
          >
            Score: {lead.leadScore}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleEnrich}
            disabled={enriching}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Zap className="w-4 h-4" />
            {enriching ? "Enriching..." : "Enrich Now"}
          </button>
          <button
            onClick={() => updateLead({ leadStatus: "converted" })}
            disabled={saving || lead.leadStatus === "converted"}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <UserCheck className="w-4 h-4" />
            Convert to Customer
          </button>
        </div>
      </div>

      {/* ---- score bar ---- */}
      <div className="px-6 py-3 bg-zinc-900/50 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-zinc-300">
            Lead Score
          </span>
          <div className="flex-1 h-3 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${lead.leadScore}%`,
                background: scoreBarColor(lead.leadScore),
              }}
            />
          </div>
          <span
            className="text-sm font-bold"
            style={{ color: scoreBarColor(lead.leadScore) }}
          >
            {lead.leadScore}/100
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* ---- stats grid ---- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-blue-400" />}
            label="Credit Score"
            value={lead.creditScore != null ? String(lead.creditScore) : "N/A"}
            sub={lead.creditRating ?? undefined}
          />
          <StatCard
            icon={<Users className="w-5 h-5 text-green-400" />}
            label="Employees"
            value={lead.employeesRange ?? "N/A"}
          />
          <StatCard
            icon={<Briefcase className="w-5 h-5 text-yellow-400" />}
            label="Revenue"
            value={lead.revenueRange ?? "N/A"}
          />
          <StatCard
            icon={<Factory className="w-5 h-5 text-purple-400" />}
            label="Industry"
            value={lead.industry ?? "N/A"}
          />
        </div>

        {/* ---- two column layout ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* left: company info */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-zinc-400" />
              Company Information
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <InfoField label="VAT ID" value={lead.vatId} />
              <InfoField label="Legal Form" value={lead.legalForm} />
              <InfoField label="Register Number" value={lead.registerNumber} />
              <InfoField label="Register Court" value={lead.registerCourt} />
            </div>
            <div className="pt-2 border-t border-zinc-800">
              <div className="flex items-start gap-2 text-sm text-zinc-400">
                <MapPin className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" />
                <div>
                  {lead.street && <div>{lead.street}</div>}
                  <div>
                    {lead.postalCode} {lead.city}
                  </div>
                  <div>{lead.countryCode}</div>
                </div>
              </div>
            </div>
            {lead.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="w-4 h-4 text-zinc-400" />
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-400 transition-colors"
                >
                  {lead.domain ?? lead.website}
                </a>
              </div>
            )}
            {lead.insolvencyRisk && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertTriangle className="w-4 h-4" />
                Insolvency risk detected
              </div>
            )}
          </div>

          {/* right: enrichment pipeline */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-400" />
              Enrichment Pipeline
            </h2>
            <div className="space-y-3">
              {ENRICHMENT_STAGES.map((stage) => {
                const isComplete = enrichmentComplete;
                const isPending = lead.enrichmentStatus === "pending";
                return (
                  <div
                    key={stage.key}
                    className="flex items-center gap-3 text-sm"
                  >
                    {isComplete ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                    ) : isPending ? (
                      <Clock className="w-5 h-5 text-zinc-500 shrink-0" />
                    ) : lead.enrichmentStatus === "failed" ? (
                      <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-400 shrink-0" />
                    )}
                    <span className="text-zinc-300">
                      {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {lead.enrichmentDate && (
              <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-800">
                Last enriched:{" "}
                {new Date(lead.enrichmentDate).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {/* ---- status + notes ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* status control */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white">
              Lead Status
            </h2>
            <select
              value={lead.leadStatus}
              onChange={(e) => updateLead({ leadStatus: e.target.value })}
              disabled={saving}
              className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
            <div className="text-xs text-zinc-500">
              Source: {lead.source ?? "unknown"} &middot; Tags:{" "}
              {lead.tags?.join(", ") || "none"}
            </div>
          </div>

          {/* notes */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white">
              Notes
            </h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
              placeholder="Add notes about this lead..."
            />
            <button
              onClick={() => updateLead({ notes })}
              disabled={saving || notes === (lead.notes ?? "")}
              className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg transition-colors"
            >
              {saving ? "Saving..." : "Save Notes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- sub-components ---------- */
function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
      <div className="flex items-center gap-2 mb-1">{icon}</div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-lg font-semibold text-white">
        {value}
      </div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-sm text-white">
        {value || "-"}
      </div>
    </div>
  );
}
