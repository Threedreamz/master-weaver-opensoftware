"use client";

import { useState } from "react";
import { createMaterial } from "../actions";

interface MaterialFormProps {
  locale: string;
  labels: {
    name: string;
    technology: string;
    type: string;
    manufacturer: string;
    color: string;
    colorHex: string;
    totalQuantity: string;
    unit: string;
    costPerUnit: string;
    diameter: string;
    printTempMin: string;
    printTempMax: string;
    bedTempMin: string;
    bedTempMax: string;
    notes: string;
    basicInfo: string;
    appearance: string;
    inventory: string;
    fdmProperties: string;
    submit: string;
    selectTechnology: string;
    selectUnit: string;
    selectDiameter: string;
  };
}

const TYPE_OPTIONS: Record<string, string[]> = {
  fdm: ["PLA", "PETG", "ABS", "ASA", "TPU", "Nylon", "PC", "HIPS", "PVA", "CF-PLA", "CF-PETG"],
  sla: ["Standard Resin", "Tough Resin", "Flexible Resin", "Castable Resin", "Dental Resin", "ABS-Like Resin"],
  sls: ["PA12", "PA11", "TPU Powder", "PA12-GF", "PP"],
};

const inputClass =
  "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const sectionClass = "space-y-4";

export default function MaterialForm({ locale, labels }: MaterialFormProps) {
  const [technology, setTechnology] = useState("");

  const typeOptions = technology ? TYPE_OPTIONS[technology] ?? [] : [];

  return (
    <form action={createMaterial} className="space-y-8">
      <input type="hidden" name="locale" value={locale} />
      {/* Basic Info */}
      <fieldset className={sectionClass}>
        <legend className="text-base font-semibold text-gray-900 mb-2">
          {labels.basicInfo}
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className={labelClass}>{labels.name} *</label>
            <input id="name" name="name" type="text" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="technology" className={labelClass}>{labels.technology} *</label>
            <select
              id="technology"
              name="technology"
              required
              className={inputClass}
              value={technology}
              onChange={(e) => setTechnology(e.target.value)}
            >
              <option value="">{labels.selectTechnology}</option>
              <option value="fdm">FDM</option>
              <option value="sla">SLA</option>
              <option value="sls">SLS</option>
            </select>
          </div>
          <div>
            <label htmlFor="type" className={labelClass}>{labels.type} *</label>
            <select id="type" name="type" required className={inputClass} disabled={!technology}>
              <option value="">--</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="manufacturer" className={labelClass}>{labels.manufacturer}</label>
            <input id="manufacturer" name="manufacturer" type="text" className={inputClass} />
          </div>
        </div>
      </fieldset>

      {/* Appearance */}
      <fieldset className={sectionClass}>
        <legend className="text-base font-semibold text-gray-900 mb-2">
          {labels.appearance}
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="color" className={labelClass}>{labels.color}</label>
            <input id="color" name="color" type="text" className={inputClass} />
          </div>
          <div>
            <label htmlFor="colorHex" className={labelClass}>{labels.colorHex}</label>
            <input
              id="colorHex"
              name="colorHex"
              type="color"
              defaultValue="#000000"
              className="h-10 w-20 cursor-pointer rounded-lg border border-gray-300 p-1"
            />
          </div>
        </div>
      </fieldset>

      {/* Inventory */}
      <fieldset className={sectionClass}>
        <legend className="text-base font-semibold text-gray-900 mb-2">
          {labels.inventory}
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="totalQuantity" className={labelClass}>{labels.totalQuantity}</label>
            <input id="totalQuantity" name="totalQuantity" type="number" step="0.01" min="0" className={inputClass} />
          </div>
          <div>
            <label htmlFor="unit" className={labelClass}>{labels.unit}</label>
            <select id="unit" name="unit" className={inputClass} defaultValue="g">
              <option value="g">g</option>
              <option value="kg">kg</option>
              <option value="ml">ml</option>
              <option value="l">l</option>
            </select>
          </div>
          <div>
            <label htmlFor="costPerUnit" className={labelClass}>{labels.costPerUnit}</label>
            <input id="costPerUnit" name="costPerUnit" type="number" step="0.01" min="0" className={inputClass} />
          </div>
        </div>
      </fieldset>

      {/* FDM Properties - only shown when technology is fdm */}
      {technology === "fdm" && (
        <fieldset className={sectionClass}>
          <legend className="text-base font-semibold text-gray-900 mb-2">
            {labels.fdmProperties}
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="diameter" className={labelClass}>{labels.diameter}</label>
              <select id="diameter" name="diameter" className={inputClass} defaultValue="1.75">
                <option value="1.75">1.75 mm</option>
                <option value="2.85">2.85 mm</option>
              </select>
            </div>
            <div>
              <label htmlFor="printTempMin" className={labelClass}>{labels.printTempMin}</label>
              <input id="printTempMin" name="printTempMin" type="number" min="0" max="500" className={inputClass} placeholder="°C" />
            </div>
            <div>
              <label htmlFor="printTempMax" className={labelClass}>{labels.printTempMax}</label>
              <input id="printTempMax" name="printTempMax" type="number" min="0" max="500" className={inputClass} placeholder="°C" />
            </div>
            <div>
              <label htmlFor="bedTempMin" className={labelClass}>{labels.bedTempMin}</label>
              <input id="bedTempMin" name="bedTempMin" type="number" min="0" max="200" className={inputClass} placeholder="°C" />
            </div>
            <div>
              <label htmlFor="bedTempMax" className={labelClass}>{labels.bedTempMax}</label>
              <input id="bedTempMax" name="bedTempMax" type="number" min="0" max="200" className={inputClass} placeholder="°C" />
            </div>
          </div>
        </fieldset>
      )}

      {/* Notes */}
      <fieldset className={sectionClass}>
        <legend className="text-base font-semibold text-gray-900 mb-2">
          {labels.notes}
        </legend>
        <textarea id="notes" name="notes" rows={3} className={inputClass} />
      </fieldset>

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
        >
          {labels.submit}
        </button>
      </div>
    </form>
  );
}
