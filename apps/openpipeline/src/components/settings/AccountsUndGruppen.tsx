"use client";

import { useState } from "react";
import { Users, Shield } from "lucide-react";
import { AccountVerwaltung } from "./AccountVerwaltung";
import { GruppenVerwaltung } from "./GruppenVerwaltung";

type Tab = "accounts" | "gruppen";

export function AccountsUndGruppen() {
  const [activeTab, setActiveTab] = useState<Tab>("accounts");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "accounts", label: "Accounts", icon: <Users className="w-4 h-4" /> },
    { id: "gruppen", label: "Berechtigungsgruppen", icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-blue-500 text-zinc-100"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "accounts" && <AccountVerwaltung />}
      {activeTab === "gruppen" && <GruppenVerwaltung />}
    </div>
  );
}
