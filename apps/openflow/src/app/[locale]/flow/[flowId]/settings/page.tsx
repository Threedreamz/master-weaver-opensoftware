"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Settings,
  Upload,
  Download,
  Copy,
  Check,
  Trash2,
  Globe,
  QrCode,
  Shield,
  Database,
  Clock,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface FlowData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  settings: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FlowVersion {
  id: string;
  flowId: string;
  version: number;
  publishedAt: string;
  publishedBy: string | null;
}

interface FlowSettingsData {
  tracking?: {
    ga4Id?: string;
    gtmId?: string;
    metaPixelId?: string;
  };
  og?: {
    title?: string;
    description?: string;
    imageUrl?: string;
  };
  behavior?: {
    startOnFirstPage?: boolean;
    restoreInputs?: boolean;
    resetOnBack?: boolean;
    submitOnce?: boolean;
  };
  uploads?: {
    maxFileSizeMb?: number;
    allowedTypes?: string[];
  };
  metaLanguage?: string;
  faviconUrl?: string;
}

type SettingsTab = "allgemein" | "teilen" | "nutzerverhalten" | "tracking" | "uploads" | "backups";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "allgemein", label: "Allgemein" },
  { id: "teilen", label: "Teilen" },
  { id: "nutzerverhalten", label: "Nutzerverhalten" },
  { id: "tracking", label: "Tracking" },
  { id: "uploads", label: "Uploads" },
  { id: "backups", label: "Backups" },
];

// ─── Toggle Component ───────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#4C5FD5] focus:ring-offset-2 ${
        checked ? "bg-[#4C5FD5]" : "bg-gray-300"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ─── Social Preview Tab ─────────────────────────────────────────────────────────

type SocialPlatform = "facebook" | "twitter" | "linkedin" | "google";

function SocialPreviewCard({
  platform,
  title,
  description,
  imageUrl,
  url,
}: {
  platform: SocialPlatform;
  title: string;
  description: string;
  imageUrl?: string;
  url: string;
}) {
  const domain = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "localhost";
    }
  })();

  if (platform === "google") {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 max-w-md">
        <div className="text-sm text-gray-500 mb-1">{domain}</div>
        <div className="text-[#1a0dab] text-lg hover:underline cursor-default mb-1">
          {title || "Kein Titel"}
        </div>
        <div className="text-sm text-gray-600 line-clamp-2">
          {description || "Keine Beschreibung"}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden max-w-md">
      {imageUrl ? (
        <div className="h-40 bg-gray-100 flex items-center justify-center">
          <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-40 bg-gray-100 flex items-center justify-center">
          <span className="text-gray-400 text-sm">Kein Vorschaubild</span>
        </div>
      )}
      <div className="p-3">
        <div className="text-xs text-gray-400 uppercase mb-1">{domain}</div>
        <div className="font-semibold text-sm text-gray-900 mb-1 line-clamp-1">
          {title || "Kein Titel"}
        </div>
        <div className="text-xs text-gray-500 line-clamp-2">
          {description || "Keine Beschreibung"}
        </div>
      </div>
    </div>
  );
}

// ─── Main Settings Page ─────────────────────────────────────────────────────────

export default function FlowSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const flowId = params.flowId as string;
  const locale = params.locale as string;

  const [flow, setFlow] = useState<FlowData | null>(null);
  const [settings, setSettings] = useState<FlowSettingsData>({});
  const [versions, setVersions] = useState<FlowVersion[]>([]);
  const [activeTab, setActiveTab] = useState<SettingsTab>("allgemein");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState(false);

  // Editable state
  const [flowName, setFlowName] = useState("");
  const [ogTitle, setOgTitle] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [ga4Id, setGa4Id] = useState("");
  const [gtmId, setGtmId] = useState("");
  const [metaPixelId, setMetaPixelId] = useState("");
  const [maxUploadSize, setMaxUploadSize] = useState(10);
  const [metaLanguage, setMetaLanguage] = useState("de");

  // Behavior toggles
  const [startOnFirstPage, setStartOnFirstPage] = useState(true);
  const [restoreInputs, setRestoreInputs] = useState(false);
  const [resetOnBack, setResetOnBack] = useState(false);
  const [submitOnce, setSubmitOnce] = useState(false);

  // Social preview tab
  const [socialPlatform, setSocialPlatform] = useState<SocialPlatform>("facebook");

  const embedUrl = typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.host}/embed/${flow?.slug ?? ""}`
    : `https://localhost:4168/embed/${flow?.slug ?? ""}`;

  // ─── Fetch Flow Data ───────────────────────────────────────────────────────

  const fetchFlow = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/flows/${flowId}`);
      if (!res.ok) throw new Error("Flow konnte nicht geladen werden.");
      const data = await res.json();
      setFlow(data);
      setFlowName(data.name);

      const parsed: FlowSettingsData = data.settings ? JSON.parse(data.settings) : {};
      setSettings(parsed);
      setOgTitle(parsed.og?.title ?? "");
      setOgDescription(parsed.og?.description ?? "");
      setGa4Id(parsed.tracking?.ga4Id ?? "");
      setGtmId(parsed.tracking?.gtmId ?? "");
      setMetaPixelId(parsed.tracking?.metaPixelId ?? "");
      setMaxUploadSize(parsed.uploads?.maxFileSizeMb ?? 10);
      setMetaLanguage(parsed.metaLanguage ?? "de");
      setStartOnFirstPage(parsed.behavior?.startOnFirstPage ?? true);
      setRestoreInputs(parsed.behavior?.restoreInputs ?? false);
      setResetOnBack(parsed.behavior?.resetOnBack ?? false);
      setSubmitOnce(parsed.behavior?.submitOnce ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }, [flowId]);

  useEffect(() => {
    fetchFlow();
  }, [fetchFlow]);

  // ─── Save Settings ─────────────────────────────────────────────────────────

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const saveSettings = async (patch: Partial<{ name: string; slug: string; settings: string; status: string }>) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/flows/${flowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Speichern fehlgeschlagen.");
      const updated = await res.json();
      setFlow(updated);
      if (updated.settings) {
        const parsed = JSON.parse(updated.settings);
        setSettings(parsed);
      }
      showSuccess("Einstellungen gespeichert.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const updateSettingsField = (updates: Partial<FlowSettingsData>) => {
    const merged = { ...settings, ...updates };
    return saveSettings({ settings: JSON.stringify(merged) });
  };

  const handleUpdateName = () => {
    if (flowName.trim() && flowName !== flow?.name) {
      saveSettings({ name: flowName.trim() });
    }
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(embedUrl);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const handleDeactivate = async () => {
    if (!confirm("Bist du sicher, dass du diesen Flow deaktivieren möchtest?")) return;
    await saveSettings({ status: "archived" });
  };

  const handleDelete = async () => {
    if (!confirm("Bist du sicher, dass du diesen Flow unwiderruflich löschen möchtest?")) return;
    try {
      const res = await fetch(`/api/flows/${flowId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Löschen fehlgeschlagen.");
      router.push(`/${locale}/admin`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Löschen");
    }
  };

  // ─── Loading / Error ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#4C5FD5] border-t-transparent" />
      </div>
    );
  }

  if (error && !flow) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Link
            href={`/${locale}/admin`}
            className="text-[#4C5FD5] hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  if (!flow) return null;

  // ─── Tab Content ───────────────────────────────────────────────────────────

  const renderAllgemein = () => (
    <div className="space-y-8">
      {/* Flow Titel */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Flow Titel</label>
        <div className="flex gap-3">
          <input
            type="text"
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4C5FD5] focus:border-transparent"
          />
          <button
            onClick={handleUpdateName}
            disabled={saving || flowName === flow.name}
            className="bg-[#4C5FD5] text-white rounded px-4 py-2 text-sm font-medium hover:bg-[#3d4fc6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Aktualisieren
          </button>
        </div>
      </div>

      {/* Flow ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Flow ID</label>
        <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-500 font-mono">
          {flow.id}
        </div>
        <p className="mt-1 text-xs text-gray-400">
          Die ID ist eine eindeutige Kennung und kann nicht geändert werden.
        </p>
      </div>

      {/* Flow Pfad */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Flow Pfad</label>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-600 font-mono truncate">
            {embedUrl}
          </div>
          <button
            onClick={handleCopyPath}
            className="shrink-0 bg-gray-100 text-gray-700 rounded px-3 py-2 text-sm hover:bg-gray-200 transition-colors"
          >
            {copiedPath ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-400">
          Du kannst eine eigene Domain verwenden, indem du eine benutzerdefinierte Domain einrichtest.
        </p>
      </div>

      {/* Favicon */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Favicon</label>
        <button className="bg-gray-100 text-gray-700 rounded px-4 py-2 text-sm font-medium hover:bg-gray-200 transition-colors inline-flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Hochladen
        </button>
        <p className="mt-1 text-xs text-gray-400">
          Das Favicon ist das Bildchen, das im Browser-Tab dargestellt ist.
        </p>
      </div>

      {/* Meta Sprache */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Meta Sprache</label>
        <select
          value={metaLanguage}
          onChange={(e) => {
            setMetaLanguage(e.target.value);
            updateSettingsField({ metaLanguage: e.target.value });
          }}
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4C5FD5] focus:border-transparent"
        >
          <option value="de">Deutsch</option>
          <option value="en">English</option>
        </select>
      </div>

      {/* Gefahrenbereich */}
      <div className="pt-4">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Gefahrenbereich</h3>
        <div className="border-l-4 border-red-400 bg-red-50 rounded-r-lg divide-y divide-red-100">
          {/* Deaktivieren */}
          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Deaktiviere diesen Flow</h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Ein deaktivierter Flow ist nicht mehr öffentlich erreichbar.
              </p>
            </div>
            <button
              onClick={handleDeactivate}
              disabled={flow.status === "archived"}
              className="bg-gray-100 text-gray-700 rounded px-4 py-2 text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Deaktivieren
            </button>
          </div>

          {/* Automatisches Löschen */}
          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Antworten automatisch löschen</h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Lösche Antworten automatisch nach einer festgelegten Zeitspanne.
              </p>
            </div>
            <button className="bg-gray-100 text-gray-700 rounded px-4 py-2 text-sm font-medium hover:bg-gray-200 transition-colors">
              Automatisches Löschen aktivieren
            </button>
          </div>

          {/* Löschen */}
          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Lösche diesen Flow</h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Der Flow und alle zugehörigen Daten werden unwiderruflich gelöscht.
              </p>
            </div>
            <button
              onClick={handleDelete}
              className="bg-red-500 text-white rounded px-4 py-2 text-sm font-medium hover:bg-red-600 transition-colors"
            >
              Löschen
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTeilen = () => (
    <div className="space-y-8">
      {/* Vorschaubild */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Vorschaubild</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          {settings.og?.imageUrl ? (
            <img
              src={settings.og.imageUrl}
              alt="Vorschaubild"
              className="mx-auto max-h-48 rounded mb-3"
            />
          ) : (
            <div className="text-gray-400 mb-3">
              <Upload className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Noch kein Vorschaubild hochgeladen</p>
            </div>
          )}
          <button className="bg-gray-100 text-gray-700 rounded px-4 py-2 text-sm font-medium hover:bg-gray-200 transition-colors inline-flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Hochladen
          </button>
        </div>
      </div>

      {/* Social Preview */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Vorschau auf sozialen Medien</label>
        <div className="flex border-b border-gray-200 mb-4">
          {(["facebook", "twitter", "linkedin", "google"] as SocialPlatform[]).map((p) => (
            <button
              key={p}
              onClick={() => setSocialPlatform(p)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                socialPlatform === p
                  ? "text-[#4C5FD5] border-b-2 border-[#4C5FD5]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p === "facebook" ? "Facebook" : p === "twitter" ? "Twitter" : p === "linkedin" ? "LinkedIn" : "Google"}
            </button>
          ))}
        </div>
        <SocialPreviewCard
          platform={socialPlatform}
          title={ogTitle || flow.name}
          description={ogDescription}
          imageUrl={settings.og?.imageUrl}
          url={embedUrl}
        />
      </div>

      {/* OG Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Flow Titel</label>
        <input
          type="text"
          value={ogTitle}
          onChange={(e) => setOgTitle(e.target.value)}
          onBlur={() =>
            updateSettingsField({
              og: { ...settings.og, title: ogTitle },
            })
          }
          placeholder={flow.name}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4C5FD5] focus:border-transparent"
        />
      </div>

      {/* OG Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Flow Beschreibung</label>
        <textarea
          value={ogDescription}
          onChange={(e) => setOgDescription(e.target.value)}
          onBlur={() =>
            updateSettingsField({
              og: { ...settings.og, description: ogDescription },
            })
          }
          placeholder="Beschreibung für die Vorschau in sozialen Medien..."
          rows={3}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4C5FD5] focus:border-transparent resize-none"
        />
      </div>

      {/* QR Code */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">QR Code</label>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 bg-white border border-gray-300 rounded flex items-center justify-center">
              <QrCode className="w-16 h-16 text-gray-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 font-mono truncate mb-2">{embedUrl}</p>
              <button className="bg-[#4C5FD5] text-white rounded px-4 py-2 text-sm font-medium hover:bg-[#3d4fc6] transition-colors inline-flex items-center gap-2">
                <Download className="w-4 h-4" />
                QR Code herunterladen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNutzerverhalten = () => {
    const toggleItems = [
      {
        label: "Starte immer auf der 1. Seite",
        description: "Zeigt Besuchern den Flow auf der ersten Seite zu starten, auch wenn sie den Flow bereits begonnen haben.",
        checked: startOnFirstPage,
        onChange: (val: boolean) => {
          setStartOnFirstPage(val);
          updateSettingsField({ behavior: { ...settings.behavior, startOnFirstPage: val } });
        },
      },
      {
        label: "Eingaben wiederherstellen",
        description: "Stelle die Eingaben des Nutzers bei Folgebesuchen wieder her.",
        checked: restoreInputs,
        onChange: (val: boolean) => {
          setRestoreInputs(val);
          updateSettingsField({ behavior: { ...settings.behavior, restoreInputs: val } });
        },
      },
      {
        label: "Eingaben Zurücksetzen bei 'Zurück'",
        description: "Wenn ein Nutzer auf 'Zurück' klickt werden seine Eingaben zurückgesetzt.",
        checked: resetOnBack,
        onChange: (val: boolean) => {
          setResetOnBack(val);
          updateSettingsField({ behavior: { ...settings.behavior, resetOnBack: val } });
        },
      },
      {
        label: "Ein Mal absenden",
        description: "Erlaubt das Formular nur einmal abzusenden.",
        checked: submitOnce,
        onChange: (val: boolean) => {
          setSubmitOnce(val);
          updateSettingsField({ behavior: { ...settings.behavior, submitOnce: val } });
        },
      },
    ];

    return (
      <div className="space-y-1">
        {toggleItems.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between py-5 border-b border-gray-100 last:border-0"
          >
            <div className="pr-8">
              <h4 className="text-sm font-medium text-gray-900">{item.label}</h4>
              <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
            </div>
            <Toggle checked={item.checked} onChange={item.onChange} />
          </div>
        ))}
      </div>
    );
  };

  const renderTracking = () => {
    const trackingItems = [
      {
        label: "Google Analytics 4",
        placeholder: "G-XXXXXXXXXX",
        value: ga4Id,
        onChange: setGa4Id,
        onSave: () => updateSettingsField({ tracking: { ...settings.tracking, ga4Id } }),
        buttonLabel: "Verbinden",
      },
      {
        label: "Google Tag Manager",
        placeholder: "GTM-XXXXXXX",
        value: gtmId,
        onChange: setGtmId,
        onSave: () => updateSettingsField({ tracking: { ...settings.tracking, gtmId } }),
        buttonLabel: "Verbinden",
      },
      {
        label: "Meta Pixel",
        placeholder: "Pixel-ID",
        value: metaPixelId,
        onChange: setMetaPixelId,
        onSave: () => updateSettingsField({ tracking: { ...settings.tracking, metaPixelId } }),
        buttonLabel: "Verbinden",
      },
    ];

    return (
      <div className="space-y-6">
        {trackingItems.map((item, idx) => {
          const isConnected = item.value.trim().length > 0;
          return (
            <div key={idx} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">{item.label}</h4>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    isConnected
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {isConnected ? "An" : "Aus"}
                </span>
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={item.value}
                  onChange={(e) => item.onChange(e.target.value)}
                  placeholder={item.placeholder}
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4C5FD5] focus:border-transparent"
                />
                <button
                  onClick={item.onSave}
                  disabled={saving}
                  className="bg-[#4C5FD5] text-white rounded px-4 py-2 text-sm font-medium hover:bg-[#3d4fc6] disabled:opacity-50 transition-colors"
                >
                  {item.buttonLabel}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderUploads = () => {
    const usedMb = 0;
    const maxMb = 20000;
    const pct = maxMb > 0 ? Math.round((usedMb / maxMb) * 100) : 0;
    const allowedTypes = settings.uploads?.allowedTypes ?? [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    return (
      <div className="space-y-8">
        {/* Max Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max. Upload Dateigröße
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={maxUploadSize}
              onChange={(e) => setMaxUploadSize(Number(e.target.value))}
              onBlur={() =>
                updateSettingsField({
                  uploads: { ...settings.uploads, maxFileSizeMb: maxUploadSize },
                })
              }
              min={1}
              max={100}
              className="w-24 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4C5FD5] focus:border-transparent"
            />
            <span className="text-sm text-gray-500 font-medium">MB</span>
          </div>
        </div>

        {/* Storage Info */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Speicherplatz
          </label>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">
                Verbrauchter Speicherplatz: {usedMb} / {maxMb.toLocaleString("de-DE")} MB ({pct}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-[#4C5FD5] h-2.5 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Allowed File Types */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Erlaubte Dateitypen
          </label>
          <div className="flex flex-wrap gap-2">
            {allowedTypes.map((type) => {
              const short = type.split("/").pop() ?? type;
              return (
                <span
                  key={type}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
                >
                  {short}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderBackups = () => {
    const isPublished = flow.status === "published";

    return (
      <div className="space-y-6">
        <p className="text-sm text-gray-600">
          Wenn du deinen Flow veröffentlichst wird eine neue Version erstellt. Du kannst jederzeit
          eine ältere Version wiederherstellen.
        </p>

        {!isPublished && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600 font-medium">
              Dieser Flow hat keine Live-Version.
            </p>
          </div>
        )}

        {/* Current draft */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Version
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Datum
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Current draft row */}
              <tr>
                <td className="px-4 py-3 text-sm text-gray-900">Aktuell</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(flow.updatedAt).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                    Entwurf
                  </span>
                </td>
              </tr>
              {/* Version history */}
              {versions.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">Version {v.version}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(v.publishedAt).toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Veröffentlicht
                    </span>
                  </td>
                </tr>
              ))}
              {versions.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-400">
                    Noch keine veröffentlichten Versionen.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "allgemein":
        return renderAllgemein();
      case "teilen":
        return renderTeilen();
      case "nutzerverhalten":
        return renderNutzerverhalten();
      case "tracking":
        return renderTracking();
      case "uploads":
        return renderUploads();
      case "backups":
        return renderBackups();
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <div className="flex items-center gap-3">
            <Link
              href={`/${locale}/admin/flows/${flowId}`}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Settings className="w-6 h-6 text-[#4C5FD5]" />
            <h1 className="text-2xl font-bold text-gray-900">
              {flow.name} Einstellungen
            </h1>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6">
          <nav className="flex gap-0 -mb-px" aria-label="Tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "text-[#4C5FD5] border-[#4C5FD5]"
                    : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Success / Error toasts */}
      {successMsg && (
        <div className="max-w-5xl mx-auto px-6 mt-4">
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 flex items-center gap-2">
            <Check className="w-4 h-4" />
            {successMsg}
          </div>
        </div>
      )}
      {error && (
        <div className="max-w-5xl mx-auto px-6 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 underline hover:no-underline"
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {renderTabContent()}
      </div>
    </div>
  );
}
