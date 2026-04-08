"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Loader2,
  Send,
  Wifi,
  WifiOff,
  CircleDot,
  Printer,
} from "lucide-react";

interface PrinterDevice {
  id: string;
  name: string;
  vendor: string;
  model: string;
  protocol: string;
  status: "online" | "offline" | "printing";
}

interface SendToPrinterDialogProps {
  open: boolean;
  onClose: () => void;
  gcodeId: string;
  jobName?: string;
  onSent: (printerName: string) => void;
}

const statusConfig = {
  online: {
    label: "Online",
    icon: Wifi,
    badge: "bg-green-500/20 text-green-400 border-green-500/30",
    dot: "bg-green-400",
  },
  offline: {
    label: "Offline",
    icon: WifiOff,
    badge: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    dot: "bg-zinc-500",
  },
  printing: {
    label: "Printing",
    icon: CircleDot,
    badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    dot: "bg-amber-400",
  },
};

export function SendToPrinterDialog({
  open,
  onClose,
  gcodeId,
  jobName,
  onSent,
}: SendToPrinterDialogProps) {
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string | null>(
    null
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch printers when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelectedPrinterId(null);
    setError(null);

    fetch("/api/openfarm/printers")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch printers");
        return res.json();
      })
      .then((data: PrinterDevice[]) => {
        setPrinters(data);
        // Auto-select first online printer
        const firstOnline = data.find((p) => p.status === "online");
        if (firstOnline) setSelectedPrinterId(firstOnline.id);
      })
      .catch(() => {
        setError("Could not load printers");
        setPrinters([]);
      })
      .finally(() => setLoading(false));
  }, [open]);

  const handleSend = useCallback(async () => {
    if (!selectedPrinterId || !gcodeId) return;
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/openfarm/jobs/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gcodeId,
          printerId: selectedPrinterId,
          jobName: jobName ?? `Job-${gcodeId}`,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to submit job");
      }

      const selectedPrinter = printers.find(
        (p) => p.id === selectedPrinterId
      );
      onSent(selectedPrinter?.name ?? "Printer");
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send to printer"
      );
    } finally {
      setSending(false);
    }
  }, [selectedPrinterId, gcodeId, jobName, printers, onSent, onClose]);

  if (!open) return null;

  const selectedPrinter = printers.find((p) => p.id === selectedPrinterId);
  const canSend =
    selectedPrinterId &&
    selectedPrinter?.status === "online" &&
    !sending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-blue-400" />
            <h2 className="text-base font-semibold text-zinc-100">
              Send to Printer
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-zinc-400" />
              <span className="ml-2 text-sm text-zinc-400">
                Loading printers...
              </span>
            </div>
          ) : printers.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">
              No printers found. Add printers in OpenFarm Devices.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-zinc-400 mb-1">
                Select a printer to send the sliced G-code:
              </p>
              {printers.map((printer) => {
                const cfg = statusConfig[printer.status];
                const StatusIcon = cfg.icon;
                const isSelectable = printer.status === "online";
                const isSelected = printer.id === selectedPrinterId;

                return (
                  <button
                    key={printer.id}
                    type="button"
                    disabled={!isSelectable}
                    onClick={() =>
                      isSelectable && setSelectedPrinterId(printer.id)
                    }
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                      isSelected
                        ? "border-blue-500/60 bg-blue-500/10 ring-1 ring-blue-500/30"
                        : isSelectable
                        ? "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800"
                        : "border-zinc-800 bg-zinc-900/50 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {/* Printer icon with status dot */}
                    <div className="relative">
                      <Printer
                        size={28}
                        className={
                          isSelected ? "text-blue-400" : "text-zinc-500"
                        }
                      />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-900 ${cfg.dot}`}
                      />
                    </div>

                    {/* Printer info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium truncate ${
                            isSelected ? "text-zinc-100" : "text-zinc-300"
                          }`}
                        >
                          {printer.name}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${cfg.badge}`}
                        >
                          <StatusIcon size={10} />
                          {cfg.label}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 truncate">
                        {printer.vendor} {printer.model}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {error && (
            <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-zinc-800 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send size={12} />
                Send
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
