"use client";

import { useState, useEffect, useCallback } from "react";
import { ROLE_PERMISSIONS, ROLE_LABELS, PERMISSION_LABELS, type UserRole } from "@/db/schema";

type SettingsTab = "allgemein" | "teilen" | "nutzerverhalten" | "tracking" | "uploads" | "backups" | "admin";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "allgemein", label: "Allgemein" },
  { id: "teilen", label: "Teilen" },
  { id: "nutzerverhalten", label: "Nutzerverhalten" },
  { id: "tracking", label: "Tracking" },
  { id: "uploads", label: "Uploads" },
  { id: "backups", label: "Backups" },
  { id: "admin", label: "Admin-Panel" },
];

interface FlowVersion {
  id: string;
  flowId: string;
  version: number;
  publishedAt: string;
  publishedBy: string | null;
}

interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  displayName: string | null;
  role: UserRole;
  image: string | null;
  avatarUrl: string | null;
  createdAt: number | null;
  updatedAt: number | null;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("allgemein");
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [versions, setVersions] = useState<FlowVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Load all settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error("Failed to load settings", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Load flow versions for Backups tab
  useEffect(() => {
    if (activeTab === "backups" && versions.length === 0) {
      setVersionsLoading(true);
      fetch("/api/flows")
        .then((res) => res.json())
        .then(async (flows: { id: string; name: string }[]) => {
          const allVersions: FlowVersion[] = [];
          for (const flow of flows) {
            try {
              const res = await fetch(`/api/flows/${flow.id}`);
              if (res.ok) {
                const data = await res.json();
                if (data.versions) {
                  allVersions.push(...data.versions);
                }
              }
            } catch {
              // skip
            }
          }
          setVersions(allVersions);
        })
        .catch(() => {})
        .finally(() => setVersionsLoading(false));
    }
  }, [activeTab, versions.length]);

  // Load users for Admin tab
  useEffect(() => {
    if (activeTab === "admin" && users.length === 0) {
      setUsersLoading(true);
      fetch("/api/users")
        .then((res) => res.json())
        .then((data: AdminUser[]) => {
          if (Array.isArray(data)) setUsers(data);
        })
        .catch(() => {})
        .finally(() => setUsersLoading(false));
    }
  }, [activeTab, users.length]);

  function getSetting(key: string, fallback: string = "") {
    return settings[key] ?? fallback;
  }

  async function saveSetting(key: string, value: string) {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      setSettings((prev) => ({ ...prev, [key]: value }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save setting", err);
    } finally {
      setSaving(false);
    }
  }

  async function saveMultiple(pairs: { key: string; value: string }[]) {
    setSaving(true);
    try {
      for (const { key, value } of pairs) {
        await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value }),
        });
        setSettings((prev) => ({ ...prev, [key]: value }));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save settings", err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
        <p className="text-sm text-gray-500 mt-1">
          Anwendungsweite Konfiguration
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Status bar */}
      {(saving || saved) && (
        <div className={`text-sm font-medium ${saved ? "text-green-600" : "text-gray-500"}`}>
          {saving ? "Speichern..." : "Einstellungen gespeichert!"}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === "allgemein" && (
        <AllgemeinTab
          settings={settings}
          getSetting={getSetting}
          onSave={saveMultiple}
          saving={saving}
        />
      )}
      {activeTab === "teilen" && (
        <TeilenTab
          settings={settings}
          getSetting={getSetting}
          onSave={saveMultiple}
          saving={saving}
        />
      )}
      {activeTab === "nutzerverhalten" && (
        <NutzerverhaltenTab
          settings={settings}
          getSetting={getSetting}
          onSave={saveSetting}
        />
      )}
      {activeTab === "tracking" && (
        <TrackingTab
          settings={settings}
          getSetting={getSetting}
          onSave={saveMultiple}
          saving={saving}
        />
      )}
      {activeTab === "uploads" && (
        <UploadsTab
          settings={settings}
          getSetting={getSetting}
          onSave={saveMultiple}
          saving={saving}
        />
      )}
      {activeTab === "backups" && (
        <BackupsTab versions={versions} loading={versionsLoading} />
      )}
      {activeTab === "admin" && (
        <AdminTab
          users={users}
          setUsers={setUsers}
          loading={usersLoading}
        />
      )}
    </div>
  );
}

// ─── Tab 1: Allgemein ──────────────────────────────────────────────────────────

function AllgemeinTab({
  settings,
  getSetting,
  onSave,
  saving,
}: {
  settings: Record<string, string>;
  getSetting: (key: string, fallback?: string) => string;
  onSave: (pairs: { key: string; value: string }[]) => Promise<void>;
  saving: boolean;
}) {
  const [appName, setAppName] = useState(getSetting("general.appName", "OpenFlow"));
  const [defaultLocale, setDefaultLocale] = useState(getSetting("general.defaultLocale", "de"));
  const [primaryColor, setPrimaryColor] = useState(getSetting("general.primaryColor", "#6366f1"));

  useEffect(() => {
    setAppName(getSetting("general.appName", "OpenFlow"));
    setDefaultLocale(getSetting("general.defaultLocale", "de"));
    setPrimaryColor(getSetting("general.primaryColor", "#6366f1"));
  }, [settings]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave([
      { key: "general.appName", value: appName },
      { key: "general.defaultLocale", value: defaultLocale },
      { key: "general.primaryColor", value: primaryColor },
    ]);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="font-semibold text-gray-900">Allgemeine Einstellungen</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            App Name
          </label>
          <input
            type="text"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">
            Wird im Browser-Tab und im Admin-Header angezeigt.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Standard Sprache
          </label>
          <select
            value={defaultLocale}
            onChange={(e) => setDefaultLocale(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            <option value="de">Deutsch (de)</option>
            <option value="en">English (en)</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Standard-Sprache fuer neue Flow-Einbettungen.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Primaerfarbe
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Standard-Akzentfarbe fuer eingebettete Flows. Einzelne Flows koennen dies ueberschreiben.
          </p>

          {/* Preview */}
          <div
            className="mt-3 h-12 rounded-lg flex items-center justify-center text-white text-sm font-medium transition-colors"
            style={{ backgroundColor: primaryColor }}
          >
            Button Vorschau
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
      >
        {saving ? "Speichern..." : "Speichern"}
      </button>
    </form>
  );
}

// ─── Tab 2: Teilen ─────────────────────────────────────────────────────────────

function TeilenTab({
  settings,
  getSetting,
  onSave,
  saving,
}: {
  settings: Record<string, string>;
  getSetting: (key: string, fallback?: string) => string;
  onSave: (pairs: { key: string; value: string }[]) => Promise<void>;
  saving: boolean;
}) {
  const [ogTitle, setOgTitle] = useState(getSetting("sharing.ogTitle", ""));
  const [ogDescription, setOgDescription] = useState(getSetting("sharing.ogDescription", ""));
  const [ogImage, setOgImage] = useState(getSetting("sharing.ogImage", ""));

  useEffect(() => {
    setOgTitle(getSetting("sharing.ogTitle", ""));
    setOgDescription(getSetting("sharing.ogDescription", ""));
    setOgImage(getSetting("sharing.ogImage", ""));
  }, [settings]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave([
      { key: "sharing.ogTitle", value: ogTitle },
      { key: "sharing.ogDescription", value: ogDescription },
      { key: "sharing.ogImage", value: ogImage },
    ]);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="font-semibold text-gray-900">Teilen & Social Media</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Heyflow-Titel (OG Title)
          </label>
          <input
            type="text"
            value={ogTitle}
            onChange={(e) => setOgTitle(e.target.value)}
            placeholder="Mein Formular"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">
            Titel der beim Teilen in sozialen Medien angezeigt wird.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Heyflow-Beschreibung (OG Description)
          </label>
          <textarea
            value={ogDescription}
            onChange={(e) => setOgDescription(e.target.value)}
            placeholder="Beschreiben Sie Ihr Formular..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vorschaubild URL (OG Image)
          </label>
          <input
            type="text"
            value={ogImage}
            onChange={(e) => setOgImage(e.target.value)}
            placeholder="https://example.com/preview.png"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div className="border-t border-gray-100 pt-5">
          <h3 className="text-sm font-medium text-gray-700 mb-2">QR Code</h3>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-500 mb-2">
              QR-Code URL-Muster fuer Flow-Einbettungen:
            </p>
            <code className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded font-mono">
              {typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/embed/&#123;flow-slug&#125;
            </code>
            <p className="text-xs text-gray-400 mt-2">
              Verwenden Sie diese URL mit einem QR-Code-Generator, um einen teilbaren QR-Code zu erstellen.
            </p>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
      >
        {saving ? "Speichern..." : "Speichern"}
      </button>
    </form>
  );
}

// ─── Tab 3: Nutzerverhalten ────────────────────────────────────────────────────

function NutzerverhaltenTab({
  settings,
  getSetting,
  onSave,
}: {
  settings: Record<string, string>;
  getSetting: (key: string, fallback?: string) => string;
  onSave: (key: string, value: string) => Promise<void>;
}) {
  const toggles = [
    {
      key: "behavior.startOnFirstPage",
      label: "Starte immer auf der 1. Seite",
      description: "Benutzer beginnen immer auf der ersten Seite, auch wenn sie den Flow bereits besucht haben.",
    },
    {
      key: "behavior.restoreInputs",
      label: "Eingaben wiederherstellen",
      description: "Bereits eingegebene Daten werden beim erneuten Besuch wiederhergestellt.",
    },
    {
      key: "behavior.submitOnce",
      label: "Ein Mal absenden",
      description: "Benutzer koennen das Formular nur einmal absenden (Cookie-basiert).",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="font-semibold text-gray-900">Nutzerverhalten</h2>

        {toggles.map((toggle) => {
          const isActive = getSetting(toggle.key, "false") === "true";
          return (
            <div
              key={toggle.key}
              className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {toggle.label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {toggle.description}
                </p>
              </div>
              <button
                onClick={() => onSave(toggle.key, isActive ? "false" : "true")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  isActive ? "bg-indigo-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                    isActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab 4: Tracking ───────────────────────────────────────────────────────────

function TrackingTab({
  settings,
  getSetting,
  onSave,
  saving,
}: {
  settings: Record<string, string>;
  getSetting: (key: string, fallback?: string) => string;
  onSave: (pairs: { key: string; value: string }[]) => Promise<void>;
  saving: boolean;
}) {
  const [gaId, setGaId] = useState(getSetting("tracking.googleAnalyticsId", ""));
  const [gtmId, setGtmId] = useState(getSetting("tracking.googleTagManagerId", ""));
  const [metaPixelId, setMetaPixelId] = useState(getSetting("tracking.metaPixelId", ""));

  useEffect(() => {
    setGaId(getSetting("tracking.googleAnalyticsId", ""));
    setGtmId(getSetting("tracking.googleTagManagerId", ""));
    setMetaPixelId(getSetting("tracking.metaPixelId", ""));
  }, [settings]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave([
      { key: "tracking.googleAnalyticsId", value: gaId },
      { key: "tracking.googleTagManagerId", value: gtmId },
      { key: "tracking.metaPixelId", value: metaPixelId },
    ]);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="font-semibold text-gray-900">Tracking & Analytics</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Google Analytics ID
          </label>
          <input
            type="text"
            value={gaId}
            onChange={(e) => setGaId(e.target.value)}
            placeholder="G-XXXXXXXXXX"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Google Tag Manager ID
          </label>
          <input
            type="text"
            value={gtmId}
            onChange={(e) => setGtmId(e.target.value)}
            placeholder="GTM-XXXXXXX"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meta Pixel ID
          </label>
          <input
            type="text"
            value={metaPixelId}
            onChange={(e) => setMetaPixelId(e.target.value)}
            placeholder="1234567890"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
      >
        {saving ? "Speichern..." : "Speichern"}
      </button>
    </form>
  );
}

// ─── Tab 5: Uploads ────────────────────────────────────────────────────────────

function UploadsTab({
  settings,
  getSetting,
  onSave,
  saving,
}: {
  settings: Record<string, string>;
  getSetting: (key: string, fallback?: string) => string;
  onSave: (pairs: { key: string; value: string }[]) => Promise<void>;
  saving: boolean;
}) {
  const [maxSize, setMaxSize] = useState(getSetting("uploads.maxSizeMb", "10"));
  const [allowedTypes, setAllowedTypes] = useState(
    getSetting("uploads.allowedTypes", "pdf,jpg,jpeg,png,gif,doc,docx")
  );

  useEffect(() => {
    setMaxSize(getSetting("uploads.maxSizeMb", "10"));
    setAllowedTypes(getSetting("uploads.allowedTypes", "pdf,jpg,jpeg,png,gif,doc,docx"));
  }, [settings]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave([
      { key: "uploads.maxSizeMb", value: maxSize },
      { key: "uploads.allowedTypes", value: allowedTypes },
    ]);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="font-semibold text-gray-900">Upload-Einstellungen</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max. Upload-Groesse (MB)
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={maxSize}
            onChange={(e) => setMaxSize(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">
            Maximale Dateigroesse fuer Uploads in Megabyte.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Erlaubte Dateitypen
          </label>
          <input
            type="text"
            value={allowedTypes}
            onChange={(e) => setAllowedTypes(e.target.value)}
            placeholder="pdf,jpg,jpeg,png,gif"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">
            Kommagetrennte Liste erlaubter Dateiendungen.
          </p>

          {/* Preview tags */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {allowedTypes
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
              .map((type) => (
                <span
                  key={type}
                  className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                >
                  .{type}
                </span>
              ))}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
      >
        {saving ? "Speichern..." : "Speichern"}
      </button>
    </form>
  );
}

// ─── Tab 6: Backups ────────────────────────────────────────────────────────────

function BackupsTab({
  versions,
  loading,
}: {
  versions: FlowVersion[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="font-semibold text-gray-900">Flow-Versionen / Backups</h2>
        <p className="text-sm text-gray-500">
          Uebersicht aller veroeffentlichten Flow-Versionen. Rollback wird in einer zukuenftigen Version verfuegbar sein.
        </p>

        {versions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">
              Noch keine veroeffentlichten Versionen vorhanden.
            </p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2 font-medium text-gray-600">
                    Version
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">
                    Flow ID
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">
                    Veroeffentlicht am
                  </th>
                </tr>
              </thead>
              <tbody>
                {versions.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        <span className="font-medium text-gray-800">
                          v{v.version}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                      {v.flowId.substring(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(v.publishedAt).toLocaleString("de-DE")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 7: Admin-Panel ───────────────────────────────────────────────────────

const ROLE_ORDER: UserRole[] = ["user", "editor", "reviewer", "publisher", "admin"];

const ROLE_COLORS: Record<UserRole, string> = {
  user: "bg-gray-100 text-gray-700",
  editor: "bg-blue-100 text-blue-700",
  reviewer: "bg-amber-100 text-amber-700",
  publisher: "bg-green-100 text-green-700",
  admin: "bg-indigo-100 text-indigo-700",
};

function AdminTab({
  users,
  setUsers,
  loading,
}: {
  users: AdminUser[];
  setUsers: React.Dispatch<React.SetStateAction<AdminUser[]>>;
  loading: boolean;
}) {
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [roleChangeSuccess, setRoleChangeSuccess] = useState<string | null>(null);

  async function handleRoleChange(userId: string, newRole: UserRole) {
    setUpdatingUserId(userId);
    setRoleChangeSuccess(null);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
        setRoleChangeSuccess(userId);
        setTimeout(() => setRoleChangeSuccess(null), 2500);
      }
    } catch (err) {
      console.error("Failed to update role", err);
    } finally {
      setUpdatingUserId(null);
    }
  }

  function getInitials(user: AdminUser): string {
    const name = user.displayName || user.name || user.email || "?";
    return name
      .split(/[\s@]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0].toUpperCase())
      .join("");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section A: Rollenuebersicht */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="font-semibold text-gray-900">Rollen&uuml;bersicht</h2>
        <p className="text-sm text-gray-500">
          &Uuml;bersicht aller verf&uuml;gbaren Rollen und deren Berechtigungen.
        </p>

        <div className="grid gap-4">
          {ROLE_ORDER.map((role) => {
            const permissions = ROLE_PERMISSIONS[role] ?? [];
            return (
              <div
                key={role}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[role]}`}
                  >
                    {ROLE_LABELS[role]}
                  </span>
                  <span className="text-xs text-gray-400">
                    {permissions.length} Berechtigungen
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {permissions.map((perm) => (
                    <span
                      key={perm}
                      className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200"
                    >
                      {PERMISSION_LABELS[perm] ?? perm}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section B: Nutzer verwalten */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="font-semibold text-gray-900">Nutzer verwalten</h2>
        <p className="text-sm text-gray-500">
          Rollen einzelner Nutzer einsehen und &auml;ndern.
        </p>

        {users.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">
              Keine Nutzer gefunden.
            </p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2 font-medium text-gray-600">
                    Nutzer
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">
                    E-Mail
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">
                    Rolle
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">
                    Rolle &auml;ndern
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold shrink-0">
                          {getInitials(user)}
                        </div>
                        <span className="font-medium text-gray-800">
                          {user.displayName || user.name || "Unbenannt"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {user.email || "\u2013"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] ?? "bg-gray-100 text-gray-700"}`}
                      >
                        {ROLE_LABELS[user.role] ?? user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(user.id, e.target.value as UserRole)
                          }
                          disabled={updatingUserId === user.id}
                          className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white disabled:opacity-50"
                        >
                          {ROLE_ORDER.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                        {updatingUserId === user.id && (
                          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        )}
                        {roleChangeSuccess === user.id && (
                          <span className="text-xs text-green-600 font-medium">
                            Gespeichert
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
