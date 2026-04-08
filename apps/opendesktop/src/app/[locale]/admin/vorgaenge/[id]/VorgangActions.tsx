"use client";

import { updateVorgangStatus } from "../actions";

interface VorgangActionsProps {
  vorgangId: string;
  currentStatus: "entwurf" | "aktiv" | "pausiert" | "abgeschlossen" | "storniert";
  locale: string;
}

const transitions: Record<string, Array<{ status: string; label: string; className: string }>> = {
  entwurf: [
    {
      status: "aktiv",
      label: "Aktivieren",
      className:
        "inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors",
    },
    {
      status: "storniert",
      label: "Stornieren",
      className:
        "inline-flex items-center rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors",
    },
  ],
  aktiv: [
    {
      status: "pausiert",
      label: "Pausieren",
      className:
        "inline-flex items-center rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 transition-colors",
    },
    {
      status: "abgeschlossen",
      label: "Abschließen",
      className:
        "inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors",
    },
    {
      status: "storniert",
      label: "Stornieren",
      className:
        "inline-flex items-center rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors",
    },
  ],
  pausiert: [
    {
      status: "aktiv",
      label: "Fortsetzen",
      className:
        "inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors",
    },
    {
      status: "storniert",
      label: "Stornieren",
      className:
        "inline-flex items-center rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors",
    },
  ],
  abgeschlossen: [],
  storniert: [],
};

export function VorgangActions({ vorgangId, currentStatus, locale }: VorgangActionsProps) {
  const availableTransitions = transitions[currentStatus] ?? [];

  if (availableTransitions.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">Keine weiteren Statusübergänge möglich.</p>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {availableTransitions.map((transition) => (
        <form key={transition.status} action={updateVorgangStatus}>
          <input type="hidden" name="id" value={vorgangId} />
          <input type="hidden" name="newStatus" value={transition.status} />
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className={transition.className}>
            {transition.label}
          </button>
        </form>
      ))}
    </div>
  );
}
