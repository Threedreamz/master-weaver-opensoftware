"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Droplet,
  Gauge,
  Thermometer,
  Undo2,
  Zap,
  Crosshair,
  Ruler,
  Box,
  Scan,
  ExternalLink,
} from "lucide-react";

/* ---------- FDM Tools (original) ---------- */

interface CalibrationTool {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const FDM_TOOLS: CalibrationTool[] = [
  {
    id: "flow",
    title: "Flow Rate Calibration",
    description: "Print a calibration cube to measure flow accuracy",
    icon: <Droplet size={24} />,
  },
  {
    id: "pressure",
    title: "Pressure Advance",
    description: "Tune linear advance for sharp corners",
    icon: <Gauge size={24} />,
  },
  {
    id: "temp",
    title: "Temperature Tower",
    description: "Find optimal printing temperature",
    icon: <Thermometer size={24} />,
  },
  {
    id: "retraction",
    title: "Retraction Test",
    description: "Minimize stringing with optimal retraction",
    icon: <Undo2 size={24} />,
  },
  {
    id: "volumetric",
    title: "Max Volumetric Speed",
    description: "Find your hotend's maximum flow rate",
    icon: <Zap size={24} />,
  },
];

/* ---------- SLS Procedures ---------- */

interface SlsProcedure {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  procedureType: string;
}

const SLS_PROCEDURES: SlsProcedure[] = [
  {
    id: "btmt",
    title: "BTMT (Bed Temperature Mapping)",
    description: "Print temperature plaques to find the ideal bed temperature offset for your material",
    icon: <Thermometer size={24} />,
    procedureType: "btmt",
  },
  {
    id: "xy_scaling",
    title: "X/Y Scaling Calibration",
    description: "Measure 24 reference points to calculate X and Y dimensional correction factors",
    icon: <Ruler size={24} />,
    procedureType: "xy_scaling",
  },
  {
    id: "z_scaling",
    title: "Z Scaling Calibration",
    description: "Measure vertical reference points to calculate Z-axis correction factor",
    icon: <Box size={24} />,
    procedureType: "z_scaling",
  },
  {
    id: "diagnostic",
    title: "Diagnostic Print Evaluation",
    description: "Evaluate overall print quality across multiple categories",
    icon: <Scan size={24} />,
    procedureType: "diagnostic",
  },
];

/* ---------- Types for active sessions ---------- */

interface ActiveSession {
  id: string;
  procedureType: string;
  status: string;
}

/* ---------- Component ---------- */

export default function CalibrationPage() {
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "de";

  const [tab, setTab] = useState<"fdm" | "sls">("fdm");
  const [fdmAlert, setFdmAlert] = useState<string | null>(null);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);

  // Fetch active SLS sessions from OpenFarm
  useEffect(() => {
    if (tab !== "sls") return;
    fetch("http://localhost:4174/api/calibration/sessions?status=active")
      .then((r) => r.json())
      .then((data) => {
        const sessions = Array.isArray(data) ? data : data.sessions ?? [];
        setActiveSessions(sessions.filter((s: ActiveSession) => s.status === "measuring"));
      })
      .catch(() => setActiveSessions([]));
  }, [tab]);

  const handleFdmStart = (title: string) => {
    setFdmAlert(`"${title}" — Coming soon! This feature is under development.`);
    setTimeout(() => setFdmAlert(null), 3000);
  };

  const getActiveSessionForProcedure = (procedureType: string) =>
    activeSessions.find((s) => s.procedureType === procedureType);

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">
        Calibration Tools
      </h1>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-6 bg-zinc-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("fdm")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "fdm"
              ? "bg-emerald-600 text-white"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
          }`}
        >
          FDM
        </button>
        <button
          onClick={() => setTab("sls")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "sls"
              ? "bg-blue-600 text-white"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
          }`}
        >
          SLS
        </button>
      </div>

      {/* FDM Tab */}
      {tab === "fdm" && (
        <>
          {fdmAlert && (
            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
              {fdmAlert}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FDM_TOOLS.map((tool) => (
              <div
                key={tool.id}
                className="rounded-lg border border-zinc-700 bg-zinc-900 p-5 flex flex-col"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-emerald-400">
                    {tool.icon}
                  </div>
                  <h3 className="font-semibold text-zinc-100">{tool.title}</h3>
                </div>
                <p className="text-sm text-zinc-400 mb-4 flex-1">
                  {tool.description}
                </p>
                <button
                  onClick={() => handleFdmStart(tool.title)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                >
                  Start Calibration
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* SLS Tab */}
      {tab === "sls" && (
        <div>
          <p className="text-sm text-zinc-400 mb-4">
            SLS calibration procedures are managed from{" "}
            <a
              href={`http://localhost:4174/${locale}/admin/calibration`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              OpenFarm
              <ExternalLink className="w-3 h-3 inline ml-1" />
            </a>
            . When a session reaches the measurement step, enter data here.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SLS_PROCEDURES.map((proc) => {
              const activeSession = getActiveSessionForProcedure(proc.procedureType);

              return (
                <div
                  key={proc.id}
                  className="rounded-lg border border-blue-800/50 bg-zinc-900 p-5 flex flex-col"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-950 text-blue-400">
                      {proc.icon}
                    </div>
                    <h3 className="font-semibold text-zinc-100">{proc.title}</h3>
                  </div>
                  <p className="text-sm text-zinc-400 mb-4 flex-1">
                    {proc.description}
                  </p>

                  {activeSession ? (
                    <a
                      href={`/${locale}/openfarm/calibration/sls/${activeSession.id}`}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                    >
                      <Crosshair className="w-4 h-4" />
                      Enter Measurements
                    </a>
                  ) : (
                    <div className="w-full rounded-md border border-zinc-700 bg-zinc-800 py-2 text-center text-sm text-zinc-500">
                      No active session — start from OpenFarm
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
