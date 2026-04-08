"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, TestTube, Loader2 } from "lucide-react";

interface Webhook {
  id: string;
  flowId: string;
  url: string;
  secret: string | null;
  events: string;
  active: boolean;
  createdAt: string;
}

export default function WebhooksPanel({ flowId }: { flowId: string }) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch(`/api/flows/${flowId}/webhooks`);
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data);
      }
    } catch (err) {
      console.error("Failed to fetch webhooks", err);
    } finally {
      setLoading(false);
    }
  }, [flowId]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/flows/${flowId}/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          secret: secret || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Fehler beim Erstellen");
        return;
      }

      setUrl("");
      setSecret("");
      setShowForm(false);
      await fetchWebhooks();
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(webhook: Webhook) {
    try {
      await fetch(`/api/flows/${flowId}/webhooks/${webhook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !webhook.active }),
      });
      await fetchWebhooks();
    } catch (err) {
      console.error("Failed to toggle webhook", err);
    }
  }

  async function handleDelete(webhookId: string) {
    try {
      await fetch(`/api/flows/${flowId}/webhooks/${webhookId}`, {
        method: "DELETE",
      });
      await fetchWebhooks();
    } catch (err) {
      console.error("Failed to delete webhook", err);
    }
  }

  async function handleTest(webhook: Webhook) {
    setTestingId(webhook.id);
    try {
      await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(webhook.secret ? { "X-Webhook-Secret": webhook.secret } : {}),
        },
        body: JSON.stringify({
          event: "test",
          flowId,
          submissionId: "test-" + crypto.randomUUID(),
          answers: { example_field: "test value" },
          metadata: { test: true },
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error("Test webhook failed", err);
    } finally {
      setTestingId(null);
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-sm text-gray-500">Webhooks laden...</div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Webhooks</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs px-3 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Webhook hinzufugen
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="space-y-3 p-3 bg-gray-50 rounded-lg border">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              URL *
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/webhook"
              required
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Secret (optional)
            </label>
            <input
              type="text"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="whsec_..."
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
            />
          </div>
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
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
              onClick={() => { setShowForm(false); setError(null); }}
              className="px-4 py-2 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {webhooks.length === 0 && !showForm && (
        <p className="text-xs text-gray-400 py-2">
          Keine Webhooks konfiguriert.
        </p>
      )}

      <div className="space-y-2">
        {webhooks.map((wh) => (
          <div
            key={wh.id}
            className="flex items-center justify-between p-3 bg-white border rounded-lg"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {wh.url}
              </p>
              <p className="text-xs text-gray-400">
                {wh.active ? "Aktiv" : "Inaktiv"}
              </p>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => handleToggleActive(wh)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  wh.active
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
                title={wh.active ? "Deaktivieren" : "Aktivieren"}
              >
                {wh.active ? "An" : "Aus"}
              </button>
              <button
                onClick={() => handleTest(wh)}
                disabled={testingId === wh.id}
                className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                title="Test senden"
              >
                {testingId === wh.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <TestTube className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => handleDelete(wh.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                title="Loschen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
