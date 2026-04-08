"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface LithoConfig {
  widthMm: number;
  resolution: number;
  faceUp: boolean;
  colorCorrection: "LINEAR" | "LUMINANCE";
}

export function LithoConfigForm() {
  const t = useTranslations("litophane");
  const [config, setConfig] = useState<LithoConfig>({
    widthMm: 100,
    resolution: 0.2,
    faceUp: true,
    colorCorrection: "LUMINANCE",
  });

  function update<K extends keyof LithoConfig>(key: K, value: LithoConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Width */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("widthMm")}</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={20}
              max={300}
              value={config.widthMm}
              onChange={(e) => update("widthMm", parseInt(e.target.value, 10))}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <span className="text-sm text-gray-500">mm</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">{t("widthDescription")}</p>
        </div>

        {/* Resolution */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("resolution")}</label>
          <select
            value={config.resolution}
            onChange={(e) => update("resolution", parseFloat(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          >
            <option value={0.1}>0.1 mm/pixel ({t("highDetail")})</option>
            <option value={0.2}>0.2 mm/pixel ({t("standard")})</option>
            <option value={0.4}>0.4 mm/pixel ({t("fast")})</option>
          </select>
        </div>

        {/* Color Correction */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("colorCorrection")}</label>
          <select
            value={config.colorCorrection}
            onChange={(e) => update("colorCorrection", e.target.value as "LINEAR" | "LUMINANCE")}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          >
            <option value="LINEAR">Linear</option>
            <option value="LUMINANCE">Luminance</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">{t("colorCorrectionDescription")}</p>
        </div>
      </div>

      {/* Face Up Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={config.faceUp}
          onClick={() => update("faceUp", !config.faceUp)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            config.faceUp ? "bg-blue-500" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              config.faceUp ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <div>
          <span className="text-sm font-medium text-gray-700">{t("faceUp")}</span>
          <p className="text-xs text-gray-400">{t("faceUpDescription")}</p>
        </div>
      </div>
    </div>
  );
}
