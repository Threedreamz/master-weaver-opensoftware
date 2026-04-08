"use client";

import { Clock } from "lucide-react";

interface PrintJob {
  id: string;
  name: string;
  printer: string;
  status: "queued" | "printing" | "completed" | "failed";
  progress: number;
  submitted: string;
}

const DEMO_JOBS: PrintJob[] = [
  {
    id: "j1",
    name: "Griff_V1.gcode",
    printer: "Bambu X1C",
    status: "printing",
    progress: 67,
    submitted: "2h ago",
  },
  {
    id: "j2",
    name: "Phone Case.gcode",
    printer: "Bambu X1C",
    status: "completed",
    progress: 100,
    submitted: "5h ago",
  },
  {
    id: "j3",
    name: "Bracket v3.gcode",
    printer: "Voron 2.4",
    status: "queued",
    progress: 0,
    submitted: "10m ago",
  },
  {
    id: "j4",
    name: "Gear Housing.gcode",
    printer: "Prusa MK4",
    status: "failed",
    progress: 23,
    submitted: "1h ago",
  },
  {
    id: "j5",
    name: "Cable Clip x10.gcode",
    printer: "Voron 2.4",
    status: "queued",
    progress: 0,
    submitted: "5m ago",
  },
];

function StatusBadge({
  status,
  progress,
}: {
  status: PrintJob["status"];
  progress: number;
}) {
  const styles = {
    queued: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    printing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    completed: "bg-green-500/20 text-green-400 border-green-500/30",
    failed: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
      >
        {status}
      </span>
      {status === "printing" && (
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 h-1.5 rounded-full bg-zinc-700">
            <div
              className="h-1.5 rounded-full bg-blue-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-zinc-400">{progress}%</span>
        </div>
      )}
    </div>
  );
}

export default function QueuePage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Print Queue</h1>
        <div className="text-sm text-zinc-500">
          {DEMO_JOBS.filter((j) => j.status === "queued").length} queued,{" "}
          {DEMO_JOBS.filter((j) => j.status === "printing").length} printing
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">
                Job Name
              </th>
              <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">
                Printer
              </th>
              <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">
                Status
              </th>
              <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  Submitted
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {DEMO_JOBS.map((job) => (
              <tr
                key={job.id}
                className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors"
              >
                <td className="px-5 py-3">
                  <span className="text-sm font-medium text-zinc-200">
                    {job.name}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className="text-sm text-zinc-400">{job.printer}</span>
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={job.status} progress={job.progress} />
                </td>
                <td className="px-5 py-3">
                  <span className="text-sm text-zinc-500">{job.submitted}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
