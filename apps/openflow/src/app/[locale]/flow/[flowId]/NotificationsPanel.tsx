"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Mail, Reply, GitBranch } from "lucide-react";

interface Notification {
  id: string;
  flowId: string;
  type: string;
  config: string;
  active: boolean;
  createdAt: string;
}

interface ParsedEmailConfig {
  emails: string[];
  subject?: string;
}

interface ParsedAutoReplyConfig {
  subject: string;
  body: string;
  emailFieldKey: string;
}

interface RoutingRule {
  fieldKey: string;
  operator: "equals" | "contains";
  value: string;
  emails: string[];
  subject?: string;
}

interface ParsedRoutingConfig {
  rules: RoutingRule[];
}

interface FlowComponent {
  id: string;
  componentType: string;
  fieldKey: string;
  label: string | null;
}

interface FlowStep {
  id: string;
  label: string;
  components: FlowComponent[];
}

function parseConfig<T>(config: string, fallback: T): T {
  try {
    return JSON.parse(config);
  } catch {
    return fallback;
  }
}

export default function NotificationsPanel({ flowId }: { flowId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [flowComponents, setFlowComponents] = useState<FlowComponent[]>([]);

  // Email notification form state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emails, setEmails] = useState("");
  const [subject, setSubject] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-reply form state
  const [showAutoReplyForm, setShowAutoReplyForm] = useState(false);
  const [autoReplySubject, setAutoReplySubject] = useState("");
  const [autoReplyBody, setAutoReplyBody] = useState("");
  const [autoReplyEmailField, setAutoReplyEmailField] = useState("");
  const [autoReplySaving, setAutoReplySaving] = useState(false);
  const [autoReplyError, setAutoReplyError] = useState<string | null>(null);

  // Routing form state
  const [showRoutingForm, setShowRoutingForm] = useState(false);
  const [routingRules, setRoutingRules] = useState<RoutingRule[]>([
    { fieldKey: "", operator: "equals", value: "", emails: [], subject: "" },
  ]);
  const [routingSaving, setRoutingSaving] = useState(false);
  const [routingError, setRoutingError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/flows/${flowId}/notifications`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
    }
  }, [flowId]);

  const fetchFlowComponents = useCallback(async () => {
    try {
      const res = await fetch(`/api/flows/${flowId}/steps`);
      if (res.ok) {
        const steps: FlowStep[] = await res.json();
        const allComponents: FlowComponent[] = [];
        for (const step of steps) {
          for (const comp of step.components) {
            allComponents.push(comp);
          }
        }
        setFlowComponents(allComponents);
      }
    } catch (err) {
      console.error("Failed to fetch flow components", err);
    }
  }, [flowId]);

  useEffect(() => {
    fetchNotifications();
    fetchFlowComponents();
  }, [fetchNotifications, fetchFlowComponents]);

  const emailFieldComponents = flowComponents.filter(
    (c) => c.componentType === "email" || c.componentType === "email_input"
  );

  const allFieldComponents = flowComponents.filter(
    (c) =>
      c.componentType !== "heading" &&
      c.componentType !== "paragraph" &&
      c.componentType !== "image" &&
      c.componentType !== "divider" &&
      c.componentType !== "spacer"
  );

  // Existing email notifications
  const emailNotifications = notifications.filter((n) => n.type === "email");
  const autoReplyNotifications = notifications.filter((n) => n.type === "auto_reply");
  const routingNotifications = notifications.filter((n) => n.type === "routing");

  async function handleCreateEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const emailList = emails
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    if (emailList.length === 0) {
      setError("Mindestens eine E-Mail-Adresse erforderlich");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/flows/${flowId}/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "email",
          config: { emails: emailList, subject: subject || undefined },
          active: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Fehler beim Erstellen");
        return;
      }

      setEmails("");
      setSubject("");
      setShowEmailForm(false);
      await fetchNotifications();
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateAutoReply(e: React.FormEvent) {
    e.preventDefault();
    setAutoReplyError(null);
    setAutoReplySaving(true);

    if (!autoReplyEmailField) {
      setAutoReplyError("E-Mail Feld ist erforderlich");
      setAutoReplySaving(false);
      return;
    }

    if (!autoReplySubject.trim()) {
      setAutoReplyError("Betreff ist erforderlich");
      setAutoReplySaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/flows/${flowId}/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "auto_reply",
          config: {
            subject: autoReplySubject,
            body: autoReplyBody,
            emailFieldKey: autoReplyEmailField,
          },
          active: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setAutoReplyError(data.error || "Fehler beim Erstellen");
        return;
      }

      setAutoReplySubject("");
      setAutoReplyBody("");
      setAutoReplyEmailField("");
      setShowAutoReplyForm(false);
      await fetchNotifications();
    } catch {
      setAutoReplyError("Netzwerkfehler");
    } finally {
      setAutoReplySaving(false);
    }
  }

  async function handleCreateRouting(e: React.FormEvent) {
    e.preventDefault();
    setRoutingError(null);
    setRoutingSaving(true);

    const validRules = routingRules.filter(
      (r) => r.fieldKey && r.value && r.emails.length > 0
    );

    if (validRules.length === 0) {
      setRoutingError("Mindestens eine vollstaendige Regel erforderlich");
      setRoutingSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/flows/${flowId}/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "routing",
          config: { rules: validRules },
          active: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setRoutingError(data.error || "Fehler beim Erstellen");
        return;
      }

      setRoutingRules([
        { fieldKey: "", operator: "equals", value: "", emails: [], subject: "" },
      ]);
      setShowRoutingForm(false);
      await fetchNotifications();
    } catch {
      setRoutingError("Netzwerkfehler");
    } finally {
      setRoutingSaving(false);
    }
  }

  async function handleToggleActive(notification: Notification) {
    try {
      await fetch(`/api/flows/${flowId}/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificationId: notification.id,
          active: !notification.active,
        }),
      });
      await fetchNotifications();
    } catch (err) {
      console.error("Failed to toggle notification", err);
    }
  }

  async function handleDelete(notificationId: string) {
    try {
      await fetch(
        `/api/flows/${flowId}/notifications?notificationId=${notificationId}`,
        { method: "DELETE" }
      );
      await fetchNotifications();
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  }

  function updateRoutingRule(index: number, updates: Partial<RoutingRule>) {
    setRoutingRules((prev) =>
      prev.map((rule, i) => (i === index ? { ...rule, ...updates } : rule))
    );
  }

  function addRoutingRule() {
    setRoutingRules((prev) => [
      ...prev,
      { fieldKey: "", operator: "equals", value: "", emails: [], subject: "" },
    ]);
  }

  function removeRoutingRule(index: number) {
    setRoutingRules((prev) => prev.filter((_, i) => i !== index));
  }

  if (loading) {
    return (
      <div className="p-4 text-sm text-gray-500">Benachrichtigungen laden...</div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* ==================== E-Mail Benachrichtigungen ==================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">E-Mail Benachrichtigungen</h3>
          <button
            onClick={() => setShowEmailForm(!showEmailForm)}
            className="flex items-center gap-1 text-xs px-3 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Hinzufuegen
          </button>
        </div>

        {showEmailForm && (
          <form
            onSubmit={handleCreateEmail}
            className="space-y-3 p-3 bg-gray-50 rounded-lg border"
          >
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                E-Mail-Adressen * (kommagetrennt)
              </label>
              <input
                type="text"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder="admin@example.com, team@example.com"
                required
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Betreff-Vorlage (optional)
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Neue Einsendung: {{flow_name}}"
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors"
              >
                {saving ? "Speichern..." : "Speichern"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEmailForm(false);
                  setError(null);
                }}
                className="px-4 py-2 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </form>
        )}

        {emailNotifications.length === 0 && !showEmailForm && (
          <p className="text-xs text-gray-400 py-2">
            Keine E-Mail-Benachrichtigungen konfiguriert.
          </p>
        )}

        <div className="space-y-2">
          {emailNotifications.map((n) => {
            const config = parseConfig<ParsedEmailConfig>(n.config, { emails: [] });
            return (
              <div
                key={n.id}
                className="flex items-center justify-between p-3 bg-white border rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {config.emails.join(", ")}
                    </p>
                  </div>
                  {config.subject && (
                    <p className="text-xs text-gray-500 truncate">
                      Betreff: {config.subject}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    {n.active ? "Aktiv" : "Inaktiv"} &middot; E-Mail
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => handleToggleActive(n)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      n.active
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                    title={n.active ? "Deaktivieren" : "Aktivieren"}
                  >
                    {n.active ? "An" : "Aus"}
                  </button>
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                    title="Loeschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================== Auto-Antworten ==================== */}
      <div className="space-y-4 border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Auto-Antworten</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Schicke deinen Besuchern automatisch eine personalisierte E-Mail nach dem Absenden.
            </p>
          </div>
          <button
            onClick={() => setShowAutoReplyForm(!showAutoReplyForm)}
            className="flex items-center gap-1 text-xs px-3 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Hinzufuegen
          </button>
        </div>

        {showAutoReplyForm && (
          <form
            onSubmit={handleCreateAutoReply}
            className="space-y-3 p-3 bg-gray-50 rounded-lg border"
          >
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                E-Mail Feld *
              </label>
              <select
                value={autoReplyEmailField}
                onChange={(e) => setAutoReplyEmailField(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none bg-white"
              >
                <option value="">-- E-Mail Feld waehlen --</option>
                {emailFieldComponents.map((comp) => (
                  <option key={comp.id} value={comp.fieldKey}>
                    {comp.label || comp.fieldKey}
                  </option>
                ))}
                {emailFieldComponents.length === 0 && (
                  <option value="" disabled>
                    Keine E-Mail Felder gefunden
                  </option>
                )}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Das Feld, das die E-Mail-Adresse des Absenders enthaelt.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Betreff *
              </label>
              <input
                type="text"
                value={autoReplySubject}
                onChange={(e) => setAutoReplySubject(e.target.value)}
                placeholder="Danke fuer deine Anfrage, {name}!"
                required
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nachricht
              </label>
              <textarea
                value={autoReplyBody}
                onChange={(e) => setAutoReplyBody(e.target.value)}
                placeholder={`Hallo {name},\n\nvielen Dank fuer deine Einsendung.\nWir melden uns in Kuerze bei dir unter {email}.\n\nMit freundlichen Gruessen`}
                rows={5}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none resize-y"
              />
              <p className="text-xs text-gray-400 mt-1">
                Verwende Platzhalter wie {"{name}"}, {"{email}"}, {"{telefon}"} usw. basierend auf deinen Feld-Keys.
              </p>
            </div>
            {autoReplyError && <p className="text-xs text-red-600">{autoReplyError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={autoReplySaving}
                className="px-4 py-2 text-xs bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors"
              >
                {autoReplySaving ? "Speichern..." : "Speichern"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAutoReplyForm(false);
                  setAutoReplyError(null);
                }}
                className="px-4 py-2 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </form>
        )}

        {autoReplyNotifications.length === 0 && !showAutoReplyForm && (
          <p className="text-xs text-gray-400 py-2">
            Keine Auto-Antworten konfiguriert.
          </p>
        )}

        <div className="space-y-2">
          {autoReplyNotifications.map((n) => {
            const config = parseConfig<ParsedAutoReplyConfig>(n.config, {
              subject: "",
              body: "",
              emailFieldKey: "",
            });
            return (
              <div
                key={n.id}
                className="flex items-center justify-between p-3 bg-white border rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Reply className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-sm font-medium text-gray-800 truncate">
                      Individuelle E-Mail Antwort
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    Betreff: {config.subject}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    E-Mail Feld: {config.emailFieldKey}
                  </p>
                  <p className="text-xs text-gray-400">
                    {n.active ? "Aktiv" : "Inaktiv"} &middot; Auto-Antwort
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => handleToggleActive(n)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      n.active
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                    title={n.active ? "Deaktivieren" : "Aktivieren"}
                  >
                    {n.active ? "An" : "Aus"}
                  </button>
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                    title="Loeschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================== Antwort-Routinen ==================== */}
      <div className="space-y-4 border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Antwort-Routinen</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Leite Einsendungen basierend auf Antworten an verschiedene E-Mail-Adressen weiter.
            </p>
          </div>
          <button
            onClick={() => setShowRoutingForm(!showRoutingForm)}
            className="flex items-center gap-1 text-xs px-3 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Routine hinzufuegen
          </button>
        </div>

        {showRoutingForm && (
          <form
            onSubmit={handleCreateRouting}
            className="space-y-3 p-3 bg-gray-50 rounded-lg border"
          >
            {routingRules.map((rule, index) => (
              <div
                key={index}
                className="space-y-2 p-3 bg-white rounded-lg border"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600">
                    Regel {index + 1}
                  </span>
                  {routingRules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRoutingRule(index)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Regel entfernen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-gray-500">WENN</span>
                  <select
                    value={rule.fieldKey}
                    onChange={(e) =>
                      updateRoutingRule(index, { fieldKey: e.target.value })
                    }
                    className="px-2 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none bg-white"
                  >
                    <option value="">-- Feld --</option>
                    {allFieldComponents.map((comp) => (
                      <option key={comp.id} value={comp.fieldKey}>
                        {comp.label || comp.fieldKey}
                      </option>
                    ))}
                  </select>
                  <select
                    value={rule.operator}
                    onChange={(e) =>
                      updateRoutingRule(index, {
                        operator: e.target.value as "equals" | "contains",
                      })
                    }
                    className="px-2 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none bg-white"
                  >
                    <option value="equals">ist gleich</option>
                    <option value="contains">enthaelt</option>
                  </select>
                  <input
                    type="text"
                    value={rule.value}
                    onChange={(e) =>
                      updateRoutingRule(index, { value: e.target.value })
                    }
                    placeholder="Wert"
                    className="px-2 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none flex-1 min-w-[100px]"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-gray-500">DANN sende an:</span>
                  <input
                    type="text"
                    value={rule.emails.join(", ")}
                    onChange={(e) =>
                      updateRoutingRule(index, {
                        emails: e.target.value
                          .split(",")
                          .map((em) => em.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="team-a@example.com, team-b@example.com"
                    className="px-2 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none flex-1 min-w-[200px]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Betreff (optional)
                  </label>
                  <input
                    type="text"
                    value={rule.subject || ""}
                    onChange={(e) =>
                      updateRoutingRule(index, { subject: e.target.value || undefined })
                    }
                    placeholder="Eigener Betreff fuer diese Regel"
                    className="w-full px-2 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addRoutingRule}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Weitere Regel hinzufuegen
            </button>

            {routingError && <p className="text-xs text-red-600">{routingError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={routingSaving}
                className="px-4 py-2 text-xs bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors"
              >
                {routingSaving ? "Speichern..." : "Speichern"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRoutingForm(false);
                  setRoutingError(null);
                }}
                className="px-4 py-2 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </form>
        )}

        {routingNotifications.length === 0 && !showRoutingForm && (
          <p className="text-xs text-gray-400 py-2">
            Keine Antwort-Routinen konfiguriert.
          </p>
        )}

        <div className="space-y-2">
          {routingNotifications.map((n) => {
            const config = parseConfig<ParsedRoutingConfig>(n.config, { rules: [] });
            return (
              <div
                key={n.id}
                className="flex items-center justify-between p-3 bg-white border rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <GitBranch className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {config.rules.length} Regel{config.rules.length !== 1 ? "n" : ""}
                    </p>
                  </div>
                  {config.rules.map((rule, i) => (
                    <p key={i} className="text-xs text-gray-500 truncate">
                      Wenn {rule.fieldKey}{" "}
                      {rule.operator === "equals" ? "=" : "enthaelt"}{" "}
                      &quot;{rule.value}&quot; → {rule.emails.join(", ")}
                    </p>
                  ))}
                  <p className="text-xs text-gray-400 mt-1">
                    {n.active ? "Aktiv" : "Inaktiv"} &middot; Routing
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => handleToggleActive(n)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      n.active
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                    title={n.active ? "Deaktivieren" : "Aktivieren"}
                  >
                    {n.active ? "An" : "Aus"}
                  </button>
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                    title="Loeschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
