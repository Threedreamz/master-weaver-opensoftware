"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  GitMerge,
  Reply,
  Webhook,
  Shield,
  BarChart3,
  Code,
  Globe,
  Mail,
  MessageSquare,
  Trash2,
  ExternalLink,
  Plus,
} from "lucide-react";

type SidebarSection = {
  title: string;
  items: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
};

const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    title: "Antworten",
    items: [
      { id: "antwort-routinen", label: "Antwort-Routinen", icon: GitMerge },
      { id: "auto-antworten", label: "Auto-Antworten", icon: Reply },
      { id: "hooks", label: "Hooks", icon: Webhook },
    ],
  },
  {
    title: "Flow",
    items: [
      { id: "cookie-consent", label: "Cookie Consent", icon: Shield },
      { id: "tracking", label: "Tracking", icon: BarChart3 },
    ],
  },
  {
    title: "Hosting",
    items: [
      { id: "einbetten", label: "Einbetten", icon: Code },
      { id: "domains", label: "Domains", icon: Globe },
    ],
  },
];

interface WebhookItem {
  id: string;
  url: string;
  active: boolean;
}

const CRM_INTEGRATIONS = [
  { name: "ActiveCampaign", color: "#356AE6", desc: "Sende neue Antworten direkt in dein ActiveCampaign." },
  { name: "HighLevel", color: "#00C853", desc: "Sende neue Leads direkt in dein HighLevel CRM." },
  { name: "HubSpot", color: "#FF7A59", desc: "Sende neue Antworten direkt in dein HubSpot CRM." },
  { name: "Klaviyo", color: "#1A1A1A", desc: "Sende Leads und verwalte deine E-Mail-Marketing-Kampagnen mit Klaviyo." },
  { name: "LeadByte", color: "#0066FF", desc: "Sende neue Antworten direkt in dein LeadByte." },
  { name: "monday.com", color: "#FF3D57", desc: "Sende Antworten direkt an dein monday.com Board." },
  { name: "Pipedrive", color: "#017737", desc: "Sende neue Antworten in dein Pipedrive." },
  { name: "Salesforce", color: "#00A1E0", desc: "Erstelle Salesforce-Objekte direkt aus Antworten." },
  { name: "Zoho CRM", color: "#E42527", desc: "Sende neue Antworten direkt in dein Zoho CRM." },
];

const DATA_INTEGRATIONS = [
  { name: "Airtable", color: "#FCBF49", desc: "Erstelle eine neue Zeile in Airtable für jede neue Antwort." },
  { name: "Google Sheets", color: "#0F9D58", desc: "Trage neue Antworten in ein Google Sheet ein." },
];

const AUTOMATION_INTEGRATIONS = [
  { name: "Make", color: "#6D00CC", desc: "Vielseitige Integrations-Platform zum Automatisieren von Abläufen." },
  { name: "Zapier", color: "#FF4A00", desc: "Verbinde mit über 5.000 Apps." },
];

const TRACKING_INTEGRATIONS = [
  { name: "Google Ads", color: "#4285F4", desc: "Tracke Conversions aus Google Ads Kampagnen." },
  { name: "Google Analytics 4", color: "#E37400", desc: "Verbinde deinen Flow mit Google Analytics 4." },
  { name: "Google Tag Manager", color: "#4285F4", desc: "Verwalte Tags zentral mit dem Google Tag Manager." },
  { name: "Hotjar", color: "#FF3C00", desc: "Analysiere Nutzerverhalten mit Hotjar." },
  { name: "LinkedIn Pixel", color: "#0A66C2", desc: "Tracke Conversions für LinkedIn Kampagnen." },
  { name: "Matomo", color: "#3152A0", desc: "Open-Source Web-Analytics mit Matomo." },
  { name: "Meta Conversions API", color: "#0081FB", desc: "Sende Conversion-Events an Meta." },
];

function IntegrationCard({
  name,
  color,
  desc,
  connected,
  onConnect,
}: {
  name: string;
  color: string;
  desc: string;
  connected?: boolean;
  onConnect?: () => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-3">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
        style={{ backgroundColor: color }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-900">{name}</h3>
          {connected && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              Verbunden
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
      </div>
      <button
        onClick={onConnect}
        className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
      >
        {connected ? "Konfigurieren" : "Verbinden"}
      </button>
    </div>
  );
}

function showComingSoonToast() {
  const toast = document.createElement("div");
  toast.textContent = "Bald verfügbar";
  toast.className =
    "fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium z-50 shadow-lg";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

export default function IntegrationsPage() {
  const params = useParams();
  const flowId = params.flowId as string;
  const [activeSection, setActiveSection] = useState("antwort-routinen");
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [webhooksLoading, setWebhooksLoading] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");

  const fetchWebhooks = useCallback(async () => {
    setWebhooksLoading(true);
    try {
      const res = await fetch(`/api/flows/${flowId}/webhooks`);
      if (res.ok) {
        const data = await res.json();
        setWebhooks(Array.isArray(data) ? data : data.webhooks ?? []);
      }
    } catch {
      // ignore
    } finally {
      setWebhooksLoading(false);
    }
  }, [flowId]);

  useEffect(() => {
    if (activeSection === "hooks") {
      fetchWebhooks();
    }
  }, [activeSection, fetchWebhooks]);

  async function addWebhook() {
    if (!newWebhookUrl.trim()) return;
    try {
      const res = await fetch(`/api/flows/${flowId}/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newWebhookUrl.trim() }),
      });
      if (res.ok) {
        setNewWebhookUrl("");
        fetchWebhooks();
      }
    } catch {
      // ignore
    }
  }

  async function deleteWebhook(id: string) {
    try {
      await fetch(`/api/flows/${flowId}/webhooks/${id}`, { method: "DELETE" });
      fetchWebhooks();
    } catch {
      // ignore
    }
  }

  async function toggleWebhook(id: string, active: boolean) {
    try {
      await fetch(`/api/flows/${flowId}/webhooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      fetchWebhooks();
    } catch {
      // ignore
    }
  }

  function renderContent() {
    switch (activeSection) {
      case "antwort-routinen":
        return (
          <div className="space-y-8">
            {/* Benachrichtigungen */}
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Benachrichtigungen</h2>
              <div className="space-y-3">
                <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-[#4C5FD5]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-gray-900">E-Mail</h3>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        Verbunden
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Erhalte eine E-Mail für jede Antwort, die Nutzer:innen abschicken.
                    </p>
                  </div>
                  <button className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                    Konfigurieren
                  </button>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900">Slack</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Bekomme eine Slack Benachrichtigung für jede gesendete Antwort.
                    </p>
                  </div>
                  <button
                    onClick={showComingSoonToast}
                    className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Verbinden
                  </button>
                </div>
              </div>
            </div>

            {/* CRM & Lead-Management */}
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-3">CRM &amp; Lead-Management</h2>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {CRM_INTEGRATIONS.map((int) => (
                  <IntegrationCard
                    key={int.name}
                    name={int.name}
                    color={int.color}
                    desc={int.desc}
                    onConnect={showComingSoonToast}
                  />
                ))}
              </div>
            </div>

            {/* Daten & Tabellenkalkulationen */}
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Daten &amp; Tabellenkalkulationen</h2>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {DATA_INTEGRATIONS.map((int) => (
                  <IntegrationCard
                    key={int.name}
                    name={int.name}
                    color={int.color}
                    desc={int.desc}
                    onConnect={showComingSoonToast}
                  />
                ))}
              </div>
            </div>

            {/* Automatisierungsplattformen */}
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Automatisierungsplattformen</h2>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {AUTOMATION_INTEGRATIONS.map((int) => (
                  <IntegrationCard
                    key={int.name}
                    name={int.name}
                    color={int.color}
                    desc={int.desc}
                    onConnect={showComingSoonToast}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case "auto-antworten":
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Individuelle E-Mail Antwort</h2>
            <div className="space-y-3">
              <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-[#4C5FD5]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900">Individuelle E-Mail Antwort</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Schicke deinen Besuchern automatisch nach dem Absenden eine personalisierte E-Mail.
                  </p>
                </div>
                <button
                  onClick={showComingSoonToast}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Konfigurieren
                </button>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900">WhatsApp-Antworten</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Sende deinen Besuchern automatisch eine personalisierte WhatsApp-Nachricht.
                  </p>
                </div>
                <button
                  onClick={showComingSoonToast}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Verbinden
                </button>
              </div>
            </div>
          </div>
        );

      case "hooks":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Hooks</h2>
              <a
                href="https://docs.heyflow.com/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#4C5FD5] hover:underline inline-flex items-center gap-1 mt-1"
              >
                Mehr über die Konfiguration von Webhooks erfahren
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {webhooksLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-4 border-[#4C5FD5] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {webhooks.length === 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                    <Webhook className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      Mit Webhooks kannst du jede Antwort sofort an jeden beliebigen URL-Endpunkt schicken.
                    </p>
                  </div>
                )}

                {webhooks.length > 0 && (
                  <div className="space-y-2">
                    {webhooks.map((wh) => (
                      <div
                        key={wh.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono text-gray-700 truncate">{wh.url}</p>
                        </div>
                        <button
                          onClick={() => toggleWebhook(wh.id, wh.active)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                            wh.active ? "bg-[#4C5FD5]" : "bg-gray-200"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              wh.active ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => deleteWebhook(wh.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                    placeholder="https://example.com/webhook"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4C5FD5] focus:border-transparent"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addWebhook();
                    }}
                  />
                  <button
                    onClick={addWebhook}
                    className="px-4 py-2 bg-[#4C5FD5] text-white text-sm font-medium rounded-lg hover:bg-[#3d4eb8] transition-colors inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Webhook hinzufügen
                  </button>
                </div>
              </>
            )}
          </div>
        );

      case "cookie-consent":
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Cookie Consent</h2>
            <div className="space-y-3">
              <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-[#4C5FD5]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900">OpenFlow Cookie Consent</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Mit dem Cookie Consent Manager bist du sofort DSGVO konform.
                  </p>
                </div>
                <button
                  onClick={showComingSoonToast}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Konfigurieren
                </button>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900">Openli Cookie Consent</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Mit Openlis Cookie-Manager DSGVO-Richtlinien einhalten.
                  </p>
                </div>
                <button
                  onClick={showComingSoonToast}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Verbinden
                </button>
              </div>
            </div>
          </div>
        );

      case "tracking":
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Tracking</h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {TRACKING_INTEGRATIONS.map((int) => (
                <IntegrationCard
                  key={int.name}
                  name={int.name}
                  color={int.color}
                  desc={int.desc}
                  onConnect={showComingSoonToast}
                />
              ))}
            </div>
          </div>
        );

      case "einbetten":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Einbetten</h2>
              <p className="text-sm text-gray-500 mt-1">
                Bette deinen Flow als Inline-Element oder Popup auf deiner Seite ein.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Embed Code</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4 font-mono text-xs text-gray-600 whitespace-pre-wrap break-all">
                {`<div id="openflow-${flowId}"></div>\n<script src="/embed.js" data-flow-id="${flowId}"></script>`}
              </div>
            </div>

            <button
              onClick={showComingSoonToast}
              className="px-4 py-2 bg-[#4C5FD5] text-white text-sm font-medium rounded-lg hover:bg-[#3d4eb8] transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Hinzufügen
            </button>
          </div>
        );

      case "domains":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Domains</h2>
              <p className="text-sm text-gray-500 mt-1">
                Verbinde eine eigene Domain mit deinem Flow.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <Globe className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                Noch keine Domain verbunden. Füge eine eigene Domain hinzu, um deinen Flow unter deiner eigenen URL
                bereitzustellen.
              </p>
            </div>

            <button
              onClick={showComingSoonToast}
              className="px-4 py-2 bg-[#4C5FD5] text-white text-sm font-medium rounded-lg hover:bg-[#3d4eb8] transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Domain hinzufügen
            </button>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-[200px] shrink-0 bg-[#f9fafb] border-r border-gray-200 overflow-y-auto py-4">
        {SIDEBAR_SECTIONS.map((section) => (
          <div key={section.title} className="mb-4 px-3">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-1.5 px-2">
              {section.title}
            </p>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-[#e8ecff] text-[#4C5FD5] font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto">{renderContent()}</div>
      </main>
    </div>
  );
}
