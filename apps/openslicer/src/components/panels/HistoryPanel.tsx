"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Clock,
  Download,
  RefreshCw,
  Eye,
  CircleDot,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

interface SliceHistoryEntry {
  id: string;
  modelName: string;
  profileName: string;
  status: "pending" | "slicing" | "completed" | "failed";
  timestamp: string;
  outputPath?: string;
}

const STATUS_CONFIG = {
  pending: {
    icon: CircleDot,
    color: "text-yellow-400",
    bg: "bg-yellow-500/20",
    label: "Pending",
  },
  slicing: {
    icon: Loader2,
    color: "text-blue-400",
    bg: "bg-blue-500/20",
    label: "Slicing",
  },
  completed: {
    icon: CheckCircle2,
    color: "text-green-400",
    bg: "bg-green-500/20",
    label: "Done",
  },
  failed: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-500/20",
    label: "Failed",
  },
} as const;

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function HistoryPanel() {
  const [history, setHistory] = useState<SliceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/slice/history");
      if (res.ok) {
        setHistory(await res.json());
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleReslice = async (entry: SliceHistoryEntry) => {
    try {
      await fetch("/api/slice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelName: entry.modelName,
          profileName: entry.profileName,
          reslice: true,
          originalId: entry.id,
        }),
      });
      await fetchHistory();
    } catch (err) {
      console.error("Re-slice error:", err);
    }
  };

  if (loading) {
    return (
      <div className="p-3 text-xs text-zinc-400 text-center">Loading...</div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="p-3 text-xs text-zinc-500 text-center">
        No slices yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-3">
      {history.map((entry) => {
        const statusCfg = STATUS_CONFIG[entry.status];
        const StatusIcon = statusCfg.icon;

        return (
          <div
            key={entry.id}
            className="rounded-md border border-zinc-700/50 bg-zinc-800 px-2.5 py-2"
          >
            {/* Top row: model name + status */}
            <div className="flex items-center gap-2">
              <p className="flex-1 text-xs font-medium text-zinc-200 truncate">
                {entry.modelName}
              </p>
              <span
                className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${statusCfg.bg} ${statusCfg.color}`}
              >
                <StatusIcon
                  size={10}
                  className={entry.status === "slicing" ? "animate-spin" : ""}
                />
                {statusCfg.label}
              </span>
            </div>

            {/* Second row: profile + time */}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-zinc-500 truncate">
                {entry.profileName}
              </span>
              <span className="text-[10px] text-zinc-600 ml-auto flex items-center gap-0.5">
                <Clock size={9} />
                {formatTimestamp(entry.timestamp)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-1 mt-1.5">
              <button
                type="button"
                onClick={() => handleReslice(entry)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
              >
                <RefreshCw size={10} />
                Re-slice
              </button>
              {entry.status === "completed" && entry.outputPath && (
                <>
                  <a
                    href={entry.outputPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                  >
                    <Download size={10} />
                    Download
                  </a>
                  <a
                    href={`/viewer/gcode?file=${encodeURIComponent(entry.outputPath)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                  >
                    <Eye size={10} />
                    View
                  </a>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
