"use client";

import { useState, useTransition } from "react";
import { Bell, Loader2, CheckCircle, Save } from "lucide-react";

interface NotificationPref {
  type: string;
  label: string;
  email: boolean;
  inApp: boolean;
  push: boolean;
}

const NOTIFICATION_TYPES: { type: string; label: string }[] = [
  { type: "print_completed", label: "Print Job Completed" },
  { type: "print_failed", label: "Print Job Failed" },
  { type: "maintenance_due", label: "Maintenance Due" },
  { type: "material_low", label: "Material Running Low" },
  { type: "new_job_assigned", label: "New Job Assigned" },
  { type: "error_critical", label: "Critical Error" },
  { type: "slicer_done", label: "Slicing Completed" },
];

const CHANNELS = [
  { key: "email" as const, label: "Email" },
  { key: "inApp" as const, label: "In-App" },
  { key: "push" as const, label: "Push" },
];

export default function NotificationPreferencesPage() {
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const [preferences, setPreferences] = useState<NotificationPref[]>(
    NOTIFICATION_TYPES.map((nt) => ({
      type: nt.type,
      label: nt.label,
      email: true,
      inApp: true,
      push: false,
    }))
  );

  function toggleChannel(type: string, channel: "email" | "inApp" | "push") {
    setPreferences((prev) =>
      prev.map((p) => (p.type === type ? { ...p, [channel]: !p[channel] } : p))
    );
  }

  function handleSave() {
    setSaveStatus("saving");
    startTransition(async () => {
      try {
        const res = await fetch("/api/openfarm/notification-preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            preferences: preferences.map((p) => ({
              type: p.type,
              channels: [
                ...(p.email ? ["email"] : []),
                ...(p.inApp ? ["in_app"] : []),
                ...(p.push ? ["push"] : []),
              ],
              enabled: p.email || p.inApp || p.push,
            })),
          }),
        });
        if (res.ok) {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } else {
          throw new Error("Failed to save");
        }
      } catch {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notification Preferences</h1>
          <p className="text-sm text-gray-500 mt-1">
            Choose how you want to be notified for each event type
          </p>
        </div>
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
            <Save size={16} />
          )}
          {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved!" : "Save"}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-6 py-3 font-medium text-gray-600">Notification Type</th>
              {CHANNELS.map((ch) => (
                <th key={ch.key} className="text-center px-4 py-3 font-medium text-gray-600 w-24">
                  {ch.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {preferences.map((pref) => (
              <tr key={pref.type} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Bell size={16} className="text-gray-400" />
                    <span className="font-medium text-gray-900">{pref.label}</span>
                  </div>
                </td>
                {CHANNELS.map((ch) => (
                  <td key={ch.key} className="text-center px-4 py-4">
                    <button
                      type="button"
                      onClick={() => toggleChannel(pref.type, ch.key)}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        pref[ch.key] ? "bg-amber-500" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          pref[ch.key] ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {saveStatus === "error" && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">Failed to save preferences. Please try again.</p>
        </div>
      )}

      {/* Legend */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-xs text-gray-500">
          <strong>Email</strong> — Receive email notifications. &nbsp;
          <strong>In-App</strong> — Show in the notification center. &nbsp;
          <strong>Push</strong> — Browser push notifications (requires permission).
        </p>
      </div>
    </div>
  );
}
