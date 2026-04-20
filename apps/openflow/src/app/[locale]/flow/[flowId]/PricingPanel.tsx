"use client";

import type { FlowSettings } from "@opensoftware/openflow-core";

interface PricingCondition {
  fieldKey: string;
  operator: "<" | ">" | "<=" | ">=" | "=" | "!=";
  value: number;
  unit?: string;
}

interface PricingRule {
  id: string;
  conditions: PricingCondition[];
  logic: "AND" | "OR";
  price: number;
  maxPrice?: number;
  label?: string;
}

interface PricingConfig {
  enabled: boolean;
  currency: string;
  currencySymbol: string;
  label: string;
  basePrice?: number;
  basePriceRules?: PricingRule[];
}

function newRule(): PricingRule {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    conditions: [{ fieldKey: "", operator: "<=", value: 0 }],
    logic: "AND",
    price: 0,
  };
}

const DEFAULT_PRICING: PricingConfig = {
  enabled: false,
  currency: "EUR",
  currencySymbol: "€",
  label: "Geschätzter Preis",
  basePrice: 0,
};

const CURRENCY_OPTIONS = [
  { value: "EUR", symbol: "€", label: "Euro (€)" },
  { value: "USD", symbol: "$", label: "US-Dollar ($)" },
  { value: "CHF", symbol: "CHF", label: "Schweizer Franken (CHF)" },
  { value: "GBP", symbol: "£", label: "Britisches Pfund (£)" },
];

export function PricingPanel({
  settings,
  onChange,
}: {
  settings: FlowSettings;
  onChange: (partial: Partial<FlowSettings>) => void;
}) {
  const pricing: PricingConfig = {
    ...DEFAULT_PRICING,
    ...(settings.pricingConfig ?? {}),
  };

  function update(partial: Partial<PricingConfig>) {
    onChange({ pricingConfig: { ...pricing, ...partial } });
  }

  const inputClass =
    "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400";

  return (
    <div className="p-4 space-y-5">
      {/* Enable toggle */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-gray-100">
        <div>
          <p className="text-sm font-semibold text-gray-800">Preisberechnung</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {pricing.enabled
              ? "Aktiv – Preisfelder im Inspector sichtbar"
              : "Inaktiv – keine Preislogik im Flow"}
          </p>
        </div>
        <button
          onClick={() => update({ enabled: !pricing.enabled })}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
            pricing.enabled ? "bg-indigo-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              pricing.enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {pricing.enabled && (
        <>
          {/* Currency */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Währung
            </label>
            <select
              value={pricing.currency}
              onChange={(e) => {
                const opt = CURRENCY_OPTIONS.find((c) => c.value === e.target.value);
                update({ currency: e.target.value, currencySymbol: opt?.symbol ?? e.target.value });
              }}
              className={inputClass}
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Label */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Bezeichnung (Preisanzeige)
            </label>
            <input
              type="text"
              value={pricing.label}
              onChange={(e) => update({ label: e.target.value })}
              placeholder="Geschätzter Preis"
              className={inputClass}
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Wird als Titel in der Preisanzeige-Komponente gezeigt.
            </p>
          </div>

          {/* Rule-based base price */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">
                Grundpreis-Regeln
              </label>
              <button
                onClick={() => update({ basePriceRules: [...(pricing.basePriceRules ?? []), newRule()] })}
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                + Regel hinzufügen
              </button>
            </div>

            {(pricing.basePriceRules ?? []).length === 0 && (
              <div className="text-[11px] text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
                Keine Regeln definiert — erste Regel hinzufügen.
              </div>
            )}

            {(pricing.basePriceRules ?? []).map((rule, rIdx) => {
              const updateRule = (patch: Partial<PricingRule>) => {
                const next = (pricing.basePriceRules ?? []).map((r, i) =>
                  i === rIdx ? { ...r, ...patch } : r
                );
                update({ basePriceRules: next });
              };
              const updateCond = (cIdx: number, patch: Partial<PricingCondition>) => {
                const nextConds = rule.conditions.map((c, i) =>
                  i === cIdx ? { ...c, ...patch } : c
                );
                updateRule({ conditions: nextConds });
              };

              return (
                <div key={rule.id} className="border border-gray-200 rounded-lg mb-3 overflow-hidden bg-white">
                  {/* Rule header */}
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      Regel {rIdx + 1}
                    </span>
                    <button
                      onClick={() => update({ basePriceRules: (pricing.basePriceRules ?? []).filter((_, i) => i !== rIdx) })}
                      className="text-[11px] text-red-400 hover:text-red-600"
                    >
                      Löschen
                    </button>
                  </div>

                  <div className="px-3 py-2 space-y-1">
                    {/* Conditions */}
                    {rule.conditions.map((cond, cIdx) => (
                      <div key={cIdx}>
                        {/* AND/OR pill between conditions */}
                        {cIdx > 0 && (
                          <div className="flex justify-center my-2">
                            <button
                              onClick={() => updateRule({ logic: rule.logic === "AND" ? "OR" : "AND" })}
                              className="px-3 py-0.5 rounded-full text-[10px] font-bold border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                            >
                              {rule.logic}
                            </button>
                          </div>
                        )}
                        {/* Condition: fieldKey full-width on its own row */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide shrink-0 w-20">Ausdruck</span>
                            <input
                              value={cond.fieldKey}
                              onChange={(e) => updateCond(cIdx, { fieldKey: e.target.value })}
                              placeholder="z.B. cbrt(Länge * Breite * Höhe)"
                              className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300 font-mono"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide shrink-0 w-20">Operator / Wert</span>
                            <select
                              value={cond.operator}
                              onChange={(e) => updateCond(cIdx, { operator: e.target.value as PricingCondition["operator"] })}
                              className="w-16 text-xs border border-gray-200 rounded px-1 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300"
                            >
                              {(["<=", ">=", "<", ">", "=", "!="] as const).map((op) => (
                                <option key={op} value={op}>{op}</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              value={cond.value}
                              onChange={(e) => updateCond(cIdx, { value: parseFloat(e.target.value) || 0 })}
                              className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                            />
                            <input
                              value={cond.unit ?? ""}
                              onChange={(e) => updateCond(cIdx, { unit: e.target.value || undefined })}
                              placeholder="cm"
                              title="Einheit (kosmetisch)"
                              className="w-10 text-xs border border-gray-200 rounded px-1.5 py-1.5 text-gray-500 placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                            />
                            <button
                              onClick={() => updateRule({ conditions: rule.conditions.filter((_, i) => i !== cIdx) })}
                              className={`text-gray-300 hover:text-red-400 text-xs leading-none shrink-0 ${rule.conditions.length === 1 ? "invisible" : ""}`}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => updateRule({ conditions: [...rule.conditions, { fieldKey: "", operator: "<=", value: 0 }] })}
                      className="mt-1 text-[11px] text-indigo-500 hover:text-indigo-700"
                    >
                      + Bedingung hinzufügen
                    </button>
                  </div>

                  {/* Price footer — Von / Bis */}
                  <div className="px-3 py-2 bg-indigo-50 border-t border-indigo-100 space-y-1.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] font-semibold text-indigo-600 mb-0.5">Von ({pricing.currencySymbol})</p>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={rule.price}
                          onChange={(e) => updateRule({ price: parseFloat(e.target.value) || 0 })}
                          className="w-full text-xs border border-indigo-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300"
                        />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-indigo-600 mb-0.5">Bis ({pricing.currencySymbol}) <span className="font-normal text-indigo-400">optional</span></p>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={rule.maxPrice ?? ""}
                          placeholder="—"
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            updateRule({ maxPrice: isNaN(v) || e.target.value === "" ? undefined : v });
                          }}
                          className="w-full text-xs border border-indigo-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300"
                        />
                      </div>
                    </div>
                    {rule.maxPrice !== undefined && rule.maxPrice > rule.price && (
                      <p className="text-[10px] text-indigo-500 text-center">
                        Preisspanne: {pricing.currencySymbol} {rule.price.toFixed(2).replace(".", ",")} – {pricing.currencySymbol} {rule.maxPrice.toFixed(2).replace(".", ",")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="mt-2 rounded-lg bg-gray-50 border border-gray-100 p-2.5 space-y-1">
              <p className="text-[10px] font-semibold text-gray-500">Ausdruck-Syntax</p>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                Feldschlüssel direkt verwenden oder mit Formeln kombinieren:
              </p>
              <div className="space-y-0.5 font-mono">
                {[
                  ["Länge", "Einzelnes Feld"],
                  ["Länge * Breite * Höhe", "Multiplikation"],
                  ["cbrt(Länge * Breite * Höhe)", "Kubikwurzel"],
                  ["sqrt(Länge)", "Quadratwurzel"],
                  ["pow(Länge, 2)", "Potenz"],
                  ["max(Länge, Breite)", "Maximum"],
                ].map(([ex, desc]) => (
                  <div key={ex} className="flex items-baseline gap-1.5">
                    <span className="text-[10px] text-indigo-600 shrink-0">{ex}</span>
                    <span className="text-[10px] text-gray-400">— {desc}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 pt-0.5">
                Operatoren: <span className="font-mono text-gray-500">+ - * / ^</span> &nbsp;|&nbsp; Funktionen: cbrt, sqrt, abs, round, floor, ceil, pow, log, min, max
              </p>
            </div>
          </div>

          {/* Info box */}
          <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 space-y-2">
            <p className="text-xs font-semibold text-indigo-700">So funktioniert es</p>
            <ul className="text-[11px] text-indigo-600 space-y-1 list-disc list-inside">
              <li>Preise pro Auswahl im Inspector der Elemente hinterlegen</li>
              <li>Preisanzeige-Block auf einer Seite einfügen</li>
              <li>Der Preis aktualisiert sich live beim Ausfüllen</li>
              <li>Der Gesamtpreis wird mit der Einreichung gespeichert</li>
            </ul>
          </div>

          {/* Hint: compatible components */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">Preisfähige Elemente</p>
            <div className="flex flex-wrap gap-1.5">
              {["Karten-Auswahl", "Bildauswahl", "Single-Choice", "Mehrfachauswahl", "Dropdown", "Preispakete"].map((t) => (
                <span key={t} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
