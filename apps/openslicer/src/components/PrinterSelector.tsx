"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Printer } from "lucide-react";

interface PrinterOption {
  id: string;
  name: string;
  brand: string;
  buildVolume: string;
}

const PRINTERS: PrinterOption[] = [
  { id: "bambu-x1c", name: "X1 Carbon", brand: "Bambu Lab", buildVolume: "256x256x256" },
  { id: "bambu-p1s", name: "P1S", brand: "Bambu Lab", buildVolume: "256x256x256" },
  { id: "bambu-a1", name: "A1", brand: "Bambu Lab", buildVolume: "256x256x256" },
  { id: "prusa-mk4", name: "MK4S", brand: "Prusa", buildVolume: "250x210x220" },
  { id: "prusa-xl", name: "XL", brand: "Prusa", buildVolume: "360x360x360" },
  { id: "generic", name: "Generic FDM", brand: "Custom", buildVolume: "Custom" },
];

export function PrinterSelector() {
  const t = useTranslations("slice");
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {PRINTERS.map((printer) => (
        <button
          key={printer.id}
          type="button"
          onClick={() => setSelected(printer.id)}
          className={`rounded-xl border p-4 text-left transition-all ${
            selected === printer.id
              ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
              : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Printer size={16} className={selected === printer.id ? "text-blue-500" : "text-gray-400"} />
            <span className="text-xs font-medium text-gray-500">{printer.brand}</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">{printer.name}</p>
          <p className="text-xs text-gray-400 mt-1">{printer.buildVolume} mm</p>
        </button>
      ))}
    </div>
  );
}
