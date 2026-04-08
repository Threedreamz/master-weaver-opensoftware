"use client";

import { Printer, Play, ListOrdered, Wrench } from "lucide-react";

interface SummaryCardProps {
  title: string;
  icon: React.ReactNode;
  value: string | number;
  detail: React.ReactNode;
}

function SummaryCard({ title, icon, value, detail }: SummaryCardProps) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-zinc-400">{title}</h3>
        <span className="text-zinc-500">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-zinc-100 mb-2">{value}</p>
      <div className="text-sm text-zinc-500">{detail}</div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: "online" | "offline" | "printing";
}) {
  const colors = {
    online: "bg-green-500/20 text-green-400",
    offline: "bg-red-500/20 text-red-400",
    printing: "bg-blue-500/20 text-blue-400",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status]}`}
    >
      {status}
    </span>
  );
}

export default function OpenFarmDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">
        Farm Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SummaryCard
          title="Connected Printers"
          icon={<Printer size={20} />}
          value={3}
          detail={
            <div className="flex items-center gap-2">
              <StatusBadge status="online" />
              <span>2</span>
              <StatusBadge status="printing" />
              <span>1</span>
              <StatusBadge status="offline" />
              <span>0</span>
            </div>
          }
        />

        <SummaryCard
          title="Active Jobs"
          icon={<Play size={20} />}
          value={2}
          detail={
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-zinc-700">
                <div
                  className="h-1.5 rounded-full bg-blue-500"
                  style={{ width: "67%" }}
                />
              </div>
              <span className="text-xs text-zinc-400">67% avg</span>
            </div>
          }
        />

        <SummaryCard
          title="Queue Length"
          icon={<ListOrdered size={20} />}
          value={4}
          detail={<span>4 jobs pending</span>}
        />

        <SummaryCard
          title="Calibration"
          icon={<Wrench size={20} />}
          value="OK"
          detail={<span>Last calibrated 2 days ago</span>}
        />
      </div>
    </div>
  );
}
