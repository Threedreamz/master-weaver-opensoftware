"use client";

import { useState, useTransition } from "react";
import {
  Settings,
  CheckCircle,
  XCircle,
  Loader2,
  FolderOpen,
  Globe,
  SlidersHorizontal,
  Cloud,
  Printer,
  RefreshCw,
} from "lucide-react";

interface ConnectionTestResult {
  success: boolean;
  message: string;
}

interface SettingsState {
  prusaSlicerPath: string;
  orcaSlicerPath: string;
  spoolmanUrl: string;
  openSlicerUrl: string;
  defaultTechnology: "fdm" | "sla" | "sls";
  defaultLayerHeight: number;
  autoAssignPrinters: boolean;
}

interface BambuDevice {
  serialNumber: string;
  name: string;
  model: string;
  online: boolean;
  hasAms: boolean;
  accessCode?: string;
}

async function saveSettings(settings: SettingsState) {
  const res = await fetch("/api/openfarm/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error("Failed to save settings");
  return res.json();
}

async function testSlicerPath(path: string): Promise<ConnectionTestResult> {
  try {
    const res = await fetch("/api/openfarm/settings/test-slicer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    const data = await res.json();
    return data;
  } catch {
    return { success: false, message: "Failed to test path" };
  }
}

async function testServiceUrl(url: string): Promise<ConnectionTestResult> {
  try {
    const res = await fetch("/api/openfarm/settings/test-connection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    return data;
  } catch {
    return { success: false, message: "Failed to test connection" };
  }
}

export default function SettingsPage() {
  const [isPending, startTransition] = useTransition();
  const [settings, setSettings] = useState<SettingsState>({
    prusaSlicerPath: "",
    orcaSlicerPath: "",
    spoolmanUrl: "http://localhost:7912",
    openSlicerUrl: "http://localhost:4175",
    defaultTechnology: "fdm",
    defaultLayerHeight: 0.2,
    autoAssignPrinters: true,
  });

  const [testResults, setTestResults] = useState<Record<string, ConnectionTestResult>>({});
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Bambu Cloud state
  const [bambuEmail, setBambuEmail] = useState("");
  const [bambuPassword, setBambuPassword] = useState("");
  const [bambuToken, setBambuToken] = useState("");
  const [bambuDevices, setBambuDevices] = useState<BambuDevice[]>([]);
  const [bambuLoginStatus, setBambuLoginStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [bambuLoginError, setBambuLoginError] = useState("");
  const [bambuImportStatus, setBambuImportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [bambuImportResult, setBambuImportResult] = useState<{ imported: number; updated: number } | null>(null);

  function updateSetting<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleTestSlicer(key: string, path: string) {
    setTestingKey(key);
    const result = await testSlicerPath(path);
    setTestResults((prev) => ({ ...prev, [key]: result }));
    setTestingKey(null);
  }

  async function handleTestService(key: string, url: string) {
    setTestingKey(key);
    const result = await testServiceUrl(url);
    setTestResults((prev) => ({ ...prev, [key]: result }));
    setTestingKey(null);
  }

  function handleSave() {
    setSaveStatus("saving");
    startTransition(async () => {
      try {
        await saveSettings(settings);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    });
  }

  async function handleBambuLogin() {
    setBambuLoginStatus("loading");
    setBambuLoginError("");
    setBambuDevices([]);
    setBambuToken("");
    try {
      const res = await fetch("/api/bambu/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: bambuEmail, password: bambuPassword }),
      });
      const data = await res.json() as { success?: boolean; token?: string; devices?: BambuDevice[]; error?: string };
      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Login failed");
      }
      setBambuToken(data.token ?? "");
      setBambuDevices(data.devices ?? []);
      setBambuLoginStatus("success");
    } catch (err) {
      setBambuLoginError(err instanceof Error ? err.message : "Login failed");
      setBambuLoginStatus("error");
    }
  }

  async function handleBambuImport() {
    if (!bambuToken) return;
    setBambuImportStatus("loading");
    try {
      const res = await fetch("/api/bambu/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: bambuToken }),
      });
      const data = await res.json() as { imported?: number; updated?: number; error?: string };
      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Import failed");
      }
      setBambuImportResult({ imported: data.imported ?? 0, updated: data.updated ?? 0 });
      setBambuImportStatus("success");
    } catch (err) {
      setBambuLoginError(err instanceof Error ? err.message : "Import failed");
      setBambuImportStatus("error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <button
          onClick={handleSave}
          disabled={isPending || saveStatus === "saving"}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
        >
          {saveStatus === "saving" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : saveStatus === "saved" ? (
            <CheckCircle size={16} />
          ) : (
            <Settings size={16} />
          )}
          {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved!" : "Save Settings"}
        </button>
      </div>

      {/* Bambu Cloud */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-1">
          <Cloud size={20} className="text-green-600" />
          <h2 className="font-semibold text-gray-900">Bambu Lab Cloud</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Connect your Bambu Lab account to import and monitor all your printers (X1C, P1S, A1, A1 Mini) automatically.
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bambu Lab Account Email
              </label>
              <input
                type="email"
                value={bambuEmail}
                onChange={(e) => setBambuEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={bambuPassword}
                onChange={(e) => setBambuPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleBambuLogin}
              disabled={!bambuEmail || !bambuPassword || bambuLoginStatus === "loading"}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {bambuLoginStatus === "loading" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : bambuLoginStatus === "success" ? (
                <CheckCircle size={14} />
              ) : bambuLoginStatus === "error" ? (
                <XCircle size={14} />
              ) : (
                <Cloud size={14} />
              )}
              {bambuLoginStatus === "loading" ? "Connecting..." : bambuLoginStatus === "success" ? "Connected!" : "Connect to Bambu Cloud"}
            </button>

            {bambuLoginStatus === "success" && (
              <button
                onClick={handleBambuLogin}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                title="Refresh device list"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            )}
          </div>

          {bambuLoginError && (
            <p className="text-sm text-red-600">{bambuLoginError}</p>
          )}

          {/* Device list */}
          {bambuDevices.length > 0 && (
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-700">
                  {bambuDevices.length} {bambuDevices.length === 1 ? "Drucker" : "Drucker"} gefunden
                </span>
                <button
                  onClick={handleBambuImport}
                  disabled={bambuImportStatus === "loading"}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  {bambuImportStatus === "loading" ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : bambuImportStatus === "success" ? (
                    <CheckCircle size={12} />
                  ) : (
                    <Printer size={12} />
                  )}
                  {bambuImportStatus === "loading"
                    ? "Importing..."
                    : bambuImportStatus === "success"
                    ? "Imported!"
                    : "Import All to OpenFarm"}
                </button>
              </div>
              <ul className="divide-y divide-gray-100">
                {bambuDevices.map((device) => (
                  <li key={device.serialNumber} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${device.online ? "bg-green-500" : "bg-gray-300"}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{device.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{device.model} · {device.serialNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {device.hasAms && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">AMS</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${device.online ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {device.online ? "Online" : "Offline"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {bambuImportResult && bambuImportStatus === "success" && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
              <p className="text-sm text-green-800 font-medium">
                ✓ {bambuImportResult.imported} printer{bambuImportResult.imported !== 1 ? "s" : ""} imported
                {bambuImportResult.updated > 0 && `, ${bambuImportResult.updated} updated`}.
                {" "}<a href="/de/admin/printers" className="underline hover:no-underline">View Printers →</a>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Slicer Paths */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <FolderOpen size={20} className="text-gray-700" />
          <h2 className="font-semibold text-gray-900">Slicer Paths</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Configure paths to slicer executables. Leave blank for auto-detect.
        </p>

        <div className="space-y-4">
          {/* PrusaSlicer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PrusaSlicer Executable Path
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.prusaSlicerPath}
                onChange={(e) => updateSetting("prusaSlicerPath", e.target.value)}
                placeholder="/usr/bin/prusa-slicer (auto-detect)"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
              <button
                onClick={() => handleTestSlicer("prusaSlicer", settings.prusaSlicerPath)}
                disabled={testingKey === "prusaSlicer"}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {testingKey === "prusaSlicer" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : testResults.prusaSlicer ? (
                  testResults.prusaSlicer.success ? (
                    <CheckCircle size={14} className="text-green-600" />
                  ) : (
                    <XCircle size={14} className="text-red-600" />
                  )
                ) : null}
                Test
              </button>
            </div>
            {testResults.prusaSlicer && (
              <p className={`text-xs mt-1 ${testResults.prusaSlicer.success ? "text-green-600" : "text-red-600"}`}>
                {testResults.prusaSlicer.message}
              </p>
            )}
          </div>

          {/* OrcaSlicer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              OrcaSlicer Executable Path
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.orcaSlicerPath}
                onChange={(e) => updateSetting("orcaSlicerPath", e.target.value)}
                placeholder="/usr/bin/orca-slicer"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
              <button
                onClick={() => handleTestSlicer("orcaSlicer", settings.orcaSlicerPath)}
                disabled={testingKey === "orcaSlicer"}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {testingKey === "orcaSlicer" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : testResults.orcaSlicer ? (
                  testResults.orcaSlicer.success ? (
                    <CheckCircle size={14} className="text-green-600" />
                  ) : (
                    <XCircle size={14} className="text-red-600" />
                  )
                ) : null}
                Test
              </button>
            </div>
            {testResults.orcaSlicer && (
              <p className={`text-xs mt-1 ${testResults.orcaSlicer.success ? "text-green-600" : "text-red-600"}`}>
                {testResults.orcaSlicer.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Service URLs */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={20} className="text-gray-700" />
          <h2 className="font-semibold text-gray-900">Service URLs</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Configure URLs for external services.
        </p>

        <div className="space-y-4">
          {/* Spoolman */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Spoolman URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.spoolmanUrl}
                onChange={(e) => updateSetting("spoolmanUrl", e.target.value)}
                placeholder="http://localhost:7912"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
              <button
                onClick={() => handleTestService("spoolman", settings.spoolmanUrl)}
                disabled={testingKey === "spoolman"}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {testingKey === "spoolman" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : testResults.spoolman ? (
                  testResults.spoolman.success ? (
                    <CheckCircle size={14} className="text-green-600" />
                  ) : (
                    <XCircle size={14} className="text-red-600" />
                  )
                ) : null}
                Test Connection
              </button>
            </div>
            {testResults.spoolman && (
              <p className={`text-xs mt-1 ${testResults.spoolman.success ? "text-green-600" : "text-red-600"}`}>
                {testResults.spoolman.message}
              </p>
            )}
          </div>

          {/* OpenSlicer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              OpenSlicer URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.openSlicerUrl}
                onChange={(e) => updateSetting("openSlicerUrl", e.target.value)}
                placeholder="http://localhost:4175"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
              <button
                onClick={() => handleTestService("openSlicer", settings.openSlicerUrl)}
                disabled={testingKey === "openSlicer"}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {testingKey === "openSlicer" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : testResults.openSlicer ? (
                  testResults.openSlicer.success ? (
                    <CheckCircle size={14} className="text-green-600" />
                  ) : (
                    <XCircle size={14} className="text-red-600" />
                  )
                ) : null}
                Test Connection
              </button>
            </div>
            {testResults.openSlicer && (
              <p className={`text-xs mt-1 ${testResults.openSlicer.success ? "text-green-600" : "text-red-600"}`}>
                {testResults.openSlicer.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* General */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal size={20} className="text-gray-700" />
          <h2 className="font-semibold text-gray-900">General</h2>
        </div>

        <div className="space-y-4">
          {/* Default Technology */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Technology Preference
            </label>
            <div className="flex gap-4">
              {(["fdm", "sla", "sls"] as const).map((tech) => (
                <label key={tech} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="technology"
                    value={tech}
                    checked={settings.defaultTechnology === tech}
                    onChange={() => updateSetting("defaultTechnology", tech)}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-gray-700 uppercase">{tech}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Default Layer Height */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Layer Height (mm)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="1.0"
              value={settings.defaultLayerHeight}
              onChange={(e) => updateSetting("defaultLayerHeight", parseFloat(e.target.value) || 0.2)}
              className="w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            />
          </div>

          {/* Auto-assign Printers */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Auto-assign Printers</p>
              <p className="text-xs text-gray-500">
                Automatically assign printers to queued jobs based on assignment rules
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateSetting("autoAssignPrinters", !settings.autoAssignPrinters)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                settings.autoAssignPrinters ? "bg-amber-500" : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.autoAssignPrinters ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {saveStatus === "error" && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">Failed to save settings. Please try again.</p>
        </div>
      )}
    </div>
  );
}
