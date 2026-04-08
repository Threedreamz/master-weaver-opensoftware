"use client";

import { Camera, Printer } from "lucide-react";

interface MonitoredPrinter {
  id: string;
  name: string;
  status: "online" | "offline" | "printing";
  currentJob: string | null;
  progress: number;
  nozzleTemp: number;
  nozzleTarget: number;
  bedTemp: number;
  bedTarget: number;
  timeRemaining: string | null;
}

const DEMO_PRINTERS: MonitoredPrinter[] = [
  {
    id: "m1",
    name: "Bambu X1C",
    status: "printing",
    currentJob: "Griff_V1.gcode",
    progress: 67,
    nozzleTemp: 205,
    nozzleTarget: 210,
    bedTemp: 60,
    bedTarget: 60,
    timeRemaining: "1h 12m",
  },
  {
    id: "m2",
    name: "Voron 2.4",
    status: "online",
    currentJob: null,
    progress: 0,
    nozzleTemp: 24,
    nozzleTarget: 0,
    bedTemp: 23,
    bedTarget: 0,
    timeRemaining: null,
  },
  {
    id: "m3",
    name: "Prusa MK4",
    status: "offline",
    currentJob: null,
    progress: 0,
    nozzleTemp: 0,
    nozzleTarget: 0,
    bedTemp: 0,
    bedTarget: 0,
    timeRemaining: null,
  },
];

function StatusBadge({
  status,
}: {
  status: "online" | "offline" | "printing";
}) {
  const colors = {
    online: "bg-green-500/20 text-green-400 border-green-500/30",
    offline: "bg-red-500/20 text-red-400 border-red-500/30",
    printing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors[status]}`}
    >
      {status}
    </span>
  );
}

function TempDisplay({
  label,
  current,
  target,
}: {
  label: string;
  current: number;
  target: number;
}) {
  const isHeating = target > 0 && current < target;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className={isHeating ? "text-amber-400" : "text-zinc-300"}>
        {current > 0 ? <>{current}°C</> : "--"}
        {target > 0 && (
          <span className="text-zinc-600"> / {target}°C</span>
        )}
      </span>
    </div>
  );
}

export default function MonitoringPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">
        Live Monitoring
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DEMO_PRINTERS.map((printer) => (
          <div
            key={printer.id}
            className="rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Printer size={16} className="text-zinc-500" />
                <span className="font-semibold text-zinc-100">
                  {printer.name}
                </span>
              </div>
              <StatusBadge status={printer.status} />
            </div>

            {/* Webcam placeholder */}
            <div className="mx-5 mt-4 rounded-lg bg-zinc-800 h-36 flex flex-col items-center justify-center">
              <Camera size={32} className="text-zinc-600 mb-2" />
              <span className="text-xs text-zinc-600">Webcam feed</span>
            </div>

            {/* Info */}
            <div className="p-5 space-y-3">
              {/* Current job */}
              {printer.currentJob ? (
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Current Job</p>
                  <p className="text-sm font-medium text-zinc-200">
                    {printer.currentJob}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-zinc-500 italic">
                  {printer.status === "offline" ? "Printer offline" : "Idle"}
                </p>
              )}

              {/* Progress bar */}
              {printer.status === "printing" && (
                <div>
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                    <span>Progress</span>
                    <span>{printer.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-700">
                    <div
                      className="h-2 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${printer.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Temperatures */}
              <div className="space-y-1.5">
                <TempDisplay
                  label="Nozzle"
                  current={printer.nozzleTemp}
                  target={printer.nozzleTarget}
                />
                <TempDisplay
                  label="Bed"
                  current={printer.bedTemp}
                  target={printer.bedTarget}
                />
              </div>

              {/* Time remaining */}
              {printer.timeRemaining && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Remaining</span>
                  <span className="text-zinc-300 font-medium">
                    {printer.timeRemaining}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
