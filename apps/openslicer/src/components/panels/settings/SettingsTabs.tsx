"use client";

import { useState } from "react";
import { useSlicerStore } from "../../../stores/slicer-store";
import { QualityTab } from "./QualityTab";
import { StrengthTab } from "./StrengthTab";
import { SpeedTab } from "./SpeedTab";
import { SupportTab } from "./SupportTab";
import { OthersTab } from "./OthersTab";
import { SettingsSearch } from "./SettingsSearch";

const TABS = [
  { id: "quality", label: "Quality" },
  { id: "strength", label: "Strength" },
  { id: "speed", label: "Speed" },
  { id: "support", label: "Support" },
  { id: "others", label: "Others" },
] as const;

type SettingsTabId = (typeof TABS)[number]["id"];

const TAB_COMPONENTS: Record<SettingsTabId, React.FC> = {
  quality: QualityTab,
  strength: StrengthTab,
  speed: SpeedTab,
  support: SupportTab,
  others: OthersTab,
};

export function SettingsTabs() {
  const { activeSettingsTab, setActiveSettingsTab, variableLayerProfile } =
    useSlicerStore();
  const currentTab = (activeSettingsTab ?? "quality") as SettingsTabId;
  const TabContent = TAB_COMPONENTS[currentTab] ?? QualityTab;

  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const hasVariableProfile =
    variableLayerProfile !== null && variableLayerProfile.length > 2;

  return (
    <div className="flex flex-col gap-2">
      {/* Settings search */}
      <SettingsSearch
        onSearchActive={setSearchActive}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

      {/* Tab bar — hidden when search is active with results */}
      {!searchActive && (
        <>
          <div className="flex border-b border-zinc-700">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSettingsTab(tab.id)}
                className={`relative flex-1 px-0.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider transition-colors whitespace-nowrap ${
                  currentTab === tab.id
                    ? "text-blue-400 border-b-2 border-blue-400"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab.label}
                {tab.id === "quality" && hasVariableProfile && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-indigo-500" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="pt-1">
            <TabContent />
          </div>
        </>
      )}
    </div>
  );
}
