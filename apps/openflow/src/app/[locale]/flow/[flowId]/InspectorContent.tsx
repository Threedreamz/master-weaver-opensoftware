"use client";

import { useState, useRef } from "react";
import type { FlowStep, StepComponent, ConfigSchemaField, ComponentVisibilityCondition, ConditionType } from "@opensoftware/openflow-core";
import { COMPONENT_DEFINITIONS } from "@opensoftware/openflow-core";
import IconLibrary from "./IconLibrary";

// ─── Dynamic config field renderer ───────────────────────────────────────────

function ConfigFieldEditor({
  field,
  value,
  allConfig,
  onChange,
  allSteps,
  currentStepId,
}: {
  field: ConfigSchemaField;
  value: unknown;
  allConfig: Record<string, unknown>;
  onChange: (key: string, val: unknown) => void;
  allSteps?: FlowStep[];
  currentStepId?: string;
}) {
  // Conditional visibility
  if (field.condition) {
    if (allConfig[field.condition.field] !== field.condition.value) return null;
  }

  const inputClass =
    "w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400";

  switch (field.type) {
    case "text":
      // targetStepId: show a step dropdown instead of a free-text input
      if (field.key === "targetStepId" && allSteps && allSteps.length > 0) {
        const realStepsList = allSteps.filter((s) => s.type !== "start" && s.type !== "end");
        const availableSteps = realStepsList.filter((s) => s.id !== currentStepId);
        return (
          <div key={field.key}>
            <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
            <select
              value={(value as string) ?? ""}
              onChange={(e) => onChange(field.key, e.target.value)}
              className={inputClass}
            >
              <option value="">Seite wählen…</option>
              {availableSteps.map((s) => {
                const realIdx = realStepsList.findIndex((rs) => rs.id === s.id);
                const stepName = s.label || (s.config as { title?: string }).title || `Seite ${realIdx + 1}`;
                return (
                  <option key={s.id} value={s.id}>
                    {realIdx + 1}. {stepName}
                  </option>
                );
              })}
            </select>
          </div>
        );
      }
      return (
        <div key={field.key}>
          <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
          <input
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(field.key, e.target.value)}
            className={inputClass}
          />
          {field.description && (
            <p className="text-xs text-gray-400 mt-0.5">{field.description}</p>
          )}
        </div>
      );

    case "textarea":
      return (
        <div key={field.key}>
          <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
          <textarea
            value={(value as string) ?? ""}
            onChange={(e) => onChange(field.key, e.target.value)}
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>
      );

    case "number":
      return (
        <div key={field.key}>
          <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
          <input
            type="number"
            value={(value as number) ?? (field.defaultValue as number) ?? 0}
            onChange={(e) => onChange(field.key, e.target.valueAsNumber)}
            className={inputClass}
          />
        </div>
      );

    case "boolean":
      return (
        <div key={field.key} className="flex items-center justify-between">
          <label className="text-xs text-gray-500">{field.label}</label>
          <button
            onClick={() => onChange(field.key, !value)}
            className={`relative w-9 h-5 rounded-full transition-colors ${
              value ? "bg-indigo-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                value ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      );

    case "select":
      return (
        <div key={field.key}>
          <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
          <select
            value={(value as string) ?? (field.defaultValue as string) ?? ""}
            onChange={(e) => onChange(field.key, e.target.value)}
            className={inputClass}
          >
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );

    case "color":
      return (
        <div key={field.key}>
          <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={(value as string) || "#000000"}
              onChange={(e) => onChange(field.key, e.target.value)}
              className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
            />
            <input
              type="text"
              value={(value as string) ?? ""}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder="#000000"
              className={`${inputClass} font-mono`}
            />
          </div>
        </div>
      );

    case "file":
      return (
        <FileFieldEditor
          field={field}
          value={(value as string) ?? ""}
          onChange={onChange}
        />
      );

    default:
      return null;
  }
}

// ─── File upload field ────────────────────────────────────────────────────────

function FileFieldEditor({
  field,
  value,
  onChange,
}: {
  field: ConfigSchemaField;
  value: string;
  onChange: (key: string, val: unknown) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [iconLibraryOpen, setIconLibraryOpen] = useState(false);

  const inputClass =
    "w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400";

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Upload fehlgeschlagen");
      }
      const data = await res.json();
      onChange(field.key, data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  }

  const fileName = value ? value.split("/").pop() : null;

  return (
    <div key={field.key}>
      <label className="block text-xs text-gray-500 mb-1">{field.label}</label>

      {/* Current file display */}
      {value && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg">
          <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-xs text-indigo-600 truncate flex-1">{fileName}</span>
          <button
            onClick={() => onChange(field.key, "")}
            className="text-indigo-400 hover:text-red-500 transition-colors"
            title="Entfernen"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Upload button */}
      <input
        ref={fileInputRef}
        type="file"
        accept={field.accept ?? "*"}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full text-sm border-2 border-dashed border-gray-200 hover:border-indigo-400 rounded-lg px-3 py-3 text-gray-500 hover:text-indigo-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {uploading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Wird hochgeladen…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {value ? "Andere Datei wählen" : "Datei hochladen"}
          </>
        )}
      </button>

      {/* Manual URL input */}
      <div className="mt-2">
        <p className="text-[10px] text-gray-400 mb-1">oder URL eingeben:</p>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder="https://example.com/model.stl"
          className={inputClass}
        />
      </div>

      {/* Icon library link */}
      <button
        onClick={() => setIconLibraryOpen(true)}
        className="mt-1.5 text-[11px] text-indigo-500 hover:text-indigo-700 hover:underline transition-colors"
      >
        oder aus Icon-Bibliothek
      </button>

      <IconLibrary
        open={iconLibraryOpen}
        onClose={() => setIconLibraryOpen(false)}
        onSelect={(iconData) => {
          onChange(field.key, iconData.url);
          setIconLibraryOpen(false);
        }}
      />

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {field.description && !error && (
        <p className="text-xs text-gray-400 mt-0.5">{field.description}</p>
      )}
    </div>
  );
}

// ─── Options editor (radio, checkbox, dropdown) ───────────────────────────────

function OptionsEditor({
  options,
  onChange,
  pricingEnabled = false,
  pricingCurrency = "€",
  optionPrices = {},
  onOptionPricesChange,
  optionMaxPrices = {},
  onOptionMaxPricesChange,
  optionPriceModifiers = {},
  onOptionPriceModifiersChange,
}: {
  options: { value: string; label: string }[];
  onChange: (opts: { value: string; label: string }[]) => void;
  pricingEnabled?: boolean;
  pricingCurrency?: string;
  optionPrices?: Record<string, number>;
  onOptionPricesChange?: (prices: Record<string, number>) => void;
  optionMaxPrices?: Record<string, number>;
  onOptionMaxPricesChange?: (prices: Record<string, number>) => void;
  optionPriceModifiers?: Record<string, "add" | "subtract">;
  onOptionPriceModifiersChange?: (mods: Record<string, "add" | "subtract">) => void;
}) {
  const text = options.map((o) => `${o.value}|${o.label}`).join("\n");
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">
        Optionen <span className="text-gray-400">(wert|Label, eine pro Zeile)</span>
      </label>
      <textarea
        value={text}
        onChange={(e) => {
          const opts = e.target.value
            .split("\n")
            .filter((l) => l.trim())
            .map((line) => {
              const [v, ...rest] = line.split("|");
              return { value: v!.trim(), label: rest.join("|").trim() || v!.trim() };
            });
          onChange(opts);
        }}
        rows={4}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono resize-none"
      />
      {pricingEnabled && options.length > 0 && (
        <div className="mt-2 space-y-1.5">
          <p className="text-[10px] font-medium text-gray-500">Preise pro Option</p>
          {options.map((opt) => {
            const mod = optionPriceModifiers[opt.value] ?? "add";
            return (
              <div key={opt.value} className="space-y-0.5">
                <span className="text-[10px] text-gray-600 truncate block">{opt.label || opt.value}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onOptionPriceModifiersChange?.({ ...optionPriceModifiers, [opt.value]: mod === "add" ? "subtract" : "add" })}
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 transition-colors ${mod === "subtract" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}
                    title={mod === "subtract" ? "Abzug" : "Aufschlag"}
                  >
                    {mod === "subtract" ? "−" : "+"}
                  </button>
                  <div className="relative flex-1">
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">{pricingCurrency}</span>
                    <input type="number" min={0} step={0.01}
                      value={optionPrices[opt.value] ?? ""}
                      onChange={(e) => { const val = parseFloat(e.target.value) || 0; onOptionPricesChange?.({ ...optionPrices, [opt.value]: val }); }}
                      placeholder="Von"
                      className="w-full text-[10px] border border-gray-200 rounded px-1.5 py-0.5 pl-5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  </div>
                  <span className="text-[10px] text-gray-300 shrink-0">–</span>
                  <div className="relative flex-1">
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">{pricingCurrency}</span>
                    <input type="number" min={0} step={0.01}
                      value={optionMaxPrices[opt.value] ?? ""}
                      onChange={(e) => { const val = parseFloat(e.target.value) || 0; onOptionMaxPricesChange?.({ ...optionMaxPrices, [opt.value]: val || 0 }); }}
                      placeholder="Bis"
                      className="w-full text-[10px] border border-gray-200 rounded px-1.5 py-0.5 pl-5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Checkbox-group editor (card-style, with Sonstiges support) ──────────────

interface CheckboxOption {
  value: string;
  label: string;
  isOther?: boolean;
}

function CheckboxGroupEditor({
  options,
  onChange,
  pricingEnabled = false,
  pricingCurrency = "€",
  optionPrices = {},
  onOptionPricesChange,
  optionMaxPrices = {},
  onOptionMaxPricesChange,
  optionPriceModifiers = {},
  onOptionPriceModifiersChange,
}: {
  options: CheckboxOption[];
  onChange: (opts: CheckboxOption[]) => void;
  pricingEnabled?: boolean;
  pricingCurrency?: string;
  optionPrices?: Record<string, number>;
  onOptionPricesChange?: (prices: Record<string, number>) => void;
  optionMaxPrices?: Record<string, number>;
  onOptionMaxPricesChange?: (prices: Record<string, number>) => void;
  optionPriceModifiers?: Record<string, "add" | "subtract">;
  onOptionPriceModifiersChange?: (mods: Record<string, "add" | "subtract">) => void;
}) {
  const hasSonstiges = options.some((o) => o.isOther);

  function move(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= options.length) return;
    const arr = [...options];
    [arr[idx], arr[next]] = [arr[next]!, arr[idx]!];
    onChange(arr);
  }

  function addOption() {
    const n = options.filter((o) => !o.isOther).length + 1;
    const val = `option${n}`;
    // insert before Sonstiges if present
    const sIdx = options.findIndex((o) => o.isOther);
    const arr = [...options];
    const newOpt: CheckboxOption = { value: val, label: `Option ${n}` };
    if (sIdx >= 0) arr.splice(sIdx, 0, newOpt);
    else arr.push(newOpt);
    onChange(arr);
  }

  function addSonstiges() {
    onChange([...options, { value: "__other__", label: "Sonstiges", isOther: true }]);
  }

  function removeOption(idx: number) {
    const removed = options[idx]!;
    onChange(options.filter((_, i) => i !== idx));
    if (removed.value !== "__other__" && optionPrices[removed.value] !== undefined) {
      const next = { ...optionPrices };
      delete next[removed.value];
      onOptionPricesChange?.(next);
    }
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-2">Optionen</label>
      <div className="space-y-1.5">
        {options.map((opt, idx) => (
          <div key={opt.value + idx}>
            <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
              {/* Reorder */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="text-gray-300 hover:text-gray-500 disabled:opacity-30 leading-none"
                >
                  ▲
                </button>
                <button
                  onClick={() => move(idx, 1)}
                  disabled={idx === options.length - 1}
                  className="text-gray-300 hover:text-gray-500 disabled:opacity-30 leading-none"
                >
                  ▼
                </button>
              </div>

              {/* Label */}
              {opt.isOther ? (
                <span className="flex-1 text-sm text-gray-400 italic">Sonstiges (Freitext)</span>
              ) : (
                <input
                  value={opt.label}
                  onChange={(e) => {
                    onChange(options.map((o, i) => i === idx ? { ...o, label: e.target.value } : o));
                  }}
                  placeholder={`Option ${idx + 1}`}
                  className="flex-1 text-sm border-none outline-none bg-transparent text-gray-800 placeholder-gray-400"
                />
              )}

              {/* Delete */}
              <button
                onClick={() => removeOption(idx)}
                className="text-gray-300 hover:text-red-400 transition-colors text-xs shrink-0 ml-1"
              >
                ✕
              </button>
            </div>

            {/* Price input */}
            {pricingEnabled && !opt.isOther && (() => {
              const mod = optionPriceModifiers[opt.value] ?? "add";
              return (
                <div className="flex items-center gap-1 mt-0.5 px-1">
                  <button
                    type="button"
                    onClick={() => onOptionPriceModifiersChange?.({ ...optionPriceModifiers, [opt.value]: mod === "add" ? "subtract" : "add" })}
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 transition-colors ${mod === "subtract" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}
                    title={mod === "subtract" ? "Abzug" : "Aufschlag"}
                  >
                    {mod === "subtract" ? "−" : "+"}
                  </button>
                  <div className="relative flex-1">
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">{pricingCurrency}</span>
                    <input type="number" min={0} step={0.01}
                      value={optionPrices[opt.value] ?? ""}
                      onChange={(e) => { const val = parseFloat(e.target.value) || 0; onOptionPricesChange?.({ ...optionPrices, [opt.value]: val }); }}
                      placeholder="Von"
                      className="w-full text-[10px] border border-gray-200 rounded px-1.5 py-0.5 pl-5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  </div>
                  <span className="text-[10px] text-gray-300 shrink-0">–</span>
                  <div className="relative flex-1">
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">{pricingCurrency}</span>
                    <input type="number" min={0} step={0.01}
                      value={optionMaxPrices[opt.value] ?? ""}
                      onChange={(e) => { const val = parseFloat(e.target.value) || 0; onOptionMaxPricesChange?.({ ...optionMaxPrices, [opt.value]: val || 0 }); }}
                      placeholder="Bis"
                      className="w-full text-[10px] border border-gray-200 rounded px-1.5 py-0.5 pl-5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1 mt-2">
        <button
          onClick={addOption}
          className="w-full text-sm text-gray-600 border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
        >
          <span className="text-gray-400">+</span> Hinzufügen
        </button>
        {!hasSonstiges && (
          <button
            onClick={addSonstiges}
            className="w-full text-sm text-gray-600 border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
          >
            <span className="text-gray-400">+</span> &apos;Sonstiges&apos;-Option hinzufügen
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Cards editor (card-selector) ────────────────────────────────────────────

interface CardItem {
  key: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  price?: number;
  maxPrice?: number;
  priceModifier?: "add" | "subtract";
  navigationAction?: { type: string; targetStepId?: string };
}

function CardsEditor({
  cards,
  onChange,
  allSteps,
  currentStepId,
  pricingEnabled = false,
  pricingCurrency = "€",
}: {
  cards: CardItem[];
  onChange: (cards: CardItem[]) => void;
  allSteps?: FlowStep[];
  currentStepId?: string;
  pricingEnabled?: boolean;
  pricingCurrency?: string;
}) {
  const inputClass =
    "w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400";
  const [iconLibOpen, setIconLibOpen] = useState(false);
  const [iconLibTarget, setIconLibTarget] = useState<number | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  async function handleImageUpload(idx: number, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) return;
      const data = await res.json();
      const updated = cards.map((c, i) => i === idx ? { ...c, imageUrl: data.url } : c);
      onChange(updated);
    } catch { /* ignore */ }
  }

  return (
    <div>
      <label className="block text-xs text-gray-500 mb-2">Karten</label>
      <div className="space-y-3">
        {cards.map((card, idx) => (
          <div key={card.key} className="border border-gray-200 rounded-lg p-2 space-y-1.5 bg-white">
            <div className="flex gap-2 items-start">
              {/* Image thumbnail / picker toggle */}
              <button
                onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                className="w-8 h-8 rounded flex items-center justify-center border border-gray-200 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex-shrink-0 overflow-hidden"
                title="Bild / Icon hinzufügen"
              >
                {card.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={card.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
              <div className="flex-1 space-y-1">
                <input
                  value={card.title}
                  onChange={(e) => {
                    const updated = cards.map((c, i) =>
                      i === idx ? { ...c, title: e.target.value } : c
                    );
                    onChange(updated);
                  }}
                  placeholder="Titel"
                  className={inputClass}
                />
                <input
                  value={card.subtitle ?? ""}
                  onChange={(e) => {
                    const updated = cards.map((c, i) =>
                      i === idx ? { ...c, subtitle: e.target.value } : c
                    );
                    onChange(updated);
                  }}
                  placeholder="Untertitel (optional)"
                  className={`${inputClass} text-gray-500`}
                />
                {pricingEnabled && (
                  <div className="mt-0.5 space-y-1">
                    <div className="flex items-center gap-1">
                      <label className="text-[10px] text-gray-400 shrink-0 w-8">Preis</label>
                      {/* +/– toggle */}
                      <button
                        type="button"
                        onClick={() => onChange(cards.map((c, i) => i === idx ? { ...c, priceModifier: (c.priceModifier ?? "add") === "add" ? "subtract" : "add" } : c))}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 transition-colors ${(card.priceModifier ?? "add") === "subtract" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}
                        title={(card.priceModifier ?? "add") === "subtract" ? "Abzug (klicken für Aufschlag)" : "Aufschlag (klicken für Abzug)"}
                      >
                        {(card.priceModifier ?? "add") === "subtract" ? "−" : "+"}
                      </button>
                      {/* Von */}
                      <div className="relative flex-1">
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">{pricingCurrency}</span>
                        <input
                          type="number" min={0} step={0.01}
                          value={card.price ?? ""}
                          onChange={(e) => { const val = e.target.value === "" ? undefined : parseFloat(e.target.value); onChange(cards.map((c, i) => i === idx ? { ...c, price: val } : c)); }}
                          placeholder="Von"
                          className="w-full text-[10px] border border-gray-200 rounded px-1.5 py-0.5 pl-5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </div>
                      <span className="text-[10px] text-gray-300 shrink-0">–</span>
                      {/* Bis */}
                      <div className="relative flex-1">
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">{pricingCurrency}</span>
                        <input
                          type="number" min={0} step={0.01}
                          value={card.maxPrice ?? ""}
                          onChange={(e) => { const val = e.target.value === "" ? undefined : parseFloat(e.target.value); onChange(cards.map((c, i) => i === idx ? { ...c, maxPrice: val } : c)); }}
                          placeholder="Bis"
                          className="w-full text-[10px] border border-gray-200 rounded px-1.5 py-0.5 pl-5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => onChange(cards.filter((_, i) => i !== idx))}
                className="text-red-400 hover:text-red-600 text-xs mt-1"
              >
                ✕
              </button>
            </div>

            {/* Inline image/icon picker panel */}
            {expandedIdx === idx && (
              <div className="border border-gray-200 rounded-lg p-2 bg-gray-50 space-y-1.5">
                <input
                  ref={(el) => { fileInputRefs.current[idx] = el; }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload(idx, f);
                    e.target.value = "";
                    setExpandedIdx(null);
                  }}
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={() => fileInputRefs.current[idx]?.click()}
                    className="flex-1 h-8 border border-dashed border-gray-300 rounded text-xs text-gray-500 flex items-center justify-center gap-1 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Hochladen
                  </button>
                  <button
                    onClick={() => { setIconLibTarget(idx); setIconLibOpen(true); }}
                    className="flex-1 h-8 border border-dashed border-gray-300 rounded text-xs text-gray-500 flex items-center justify-center gap-1 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                    Bibliothek
                  </button>
                  {card.imageUrl && (
                    <button
                      onClick={() => {
                        const updated = cards.map((c, i) => i === idx ? { ...c, imageUrl: undefined } : c);
                        onChange(updated);
                        setExpandedIdx(null);
                      }}
                      className="h-8 px-2 border border-dashed border-red-200 rounded text-xs text-red-400 hover:border-red-400 hover:text-red-500 transition-colors"
                    >
                      Entfernen
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Per-card navigation action */}
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] text-gray-400 shrink-0">Aktion:</label>
              <select
                value={card.navigationAction?.type ?? "none"}
                onChange={(e) => {
                  const type = e.target.value;
                  const updated = cards.map((c, i) =>
                    i === idx ? { ...c, navigationAction: { type, targetStepId: "" } } : c
                  );
                  onChange(updated);
                }}
                className="flex-1 text-[10px] border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
              >
                <option value="none">Keine Aktion</option>
                <option value="next">Nächste Seite</option>
                <option value="jump">Zur Seite springen</option>
              </select>
            </div>
            {card.navigationAction?.type === "jump" && allSteps && (
              <select
                value={card.navigationAction?.targetStepId ?? ""}
                onChange={(e) => {
                  const updated = cards.map((c, i) =>
                    i === idx ? { ...c, navigationAction: { type: "jump", targetStepId: e.target.value } } : c
                  );
                  onChange(updated);
                }}
                className="w-full text-[10px] border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
              >
                <option value="">Seite wählen...</option>
                {(() => {
                  const realList = allSteps.filter((s) => s.type !== "start" && s.type !== "end");
                  return realList
                    .filter((s) => s.id !== currentStepId)
                    .map((s) => {
                      const ri = realList.findIndex((rs) => rs.id === s.id);
                      return (
                        <option key={s.id} value={s.id}>
                          {ri + 1}. {s.label || (s.config as { title?: string }).title || `Seite ${ri + 1}`}
                        </option>
                      );
                    });
                })()}
              </select>
            )}
          </div>
        ))}
        <button
          onClick={() =>
            onChange([
              ...cards,
              { key: `option${cards.length + 1}`, title: `Option ${cards.length + 1}` },
            ])
          }
          className="w-full text-xs text-indigo-600 border border-dashed border-indigo-300 rounded-lg py-1.5 hover:bg-indigo-50 transition-colors"
        >
          + Karte hinzufügen
        </button>
      </div>

      <IconLibrary
        open={iconLibOpen}
        onClose={() => { setIconLibOpen(false); setIconLibTarget(null); }}
        onSelect={(iconData) => {
          if (iconLibTarget !== null) {
            const updated = cards.map((c, i) =>
              i === iconLibTarget ? { ...c, imageUrl: iconData.url } : c
            );
            onChange(updated);
          }
          setIconLibOpen(false);
          setIconLibTarget(null);
          setExpandedIdx(null);
        }}
      />
    </div>
  );
}

// ─── Image choice editor ──────────────────────────────────────────────────────

interface ImageChoiceOption {
  value: string;
  label: string;
  imageUrl?: string;
  subtitle?: string;
  price?: number;
  maxPrice?: number;
  priceModifier?: "add" | "subtract";
  navigationAction?: { type: string; targetStepId?: string };
}

function ImageChoiceEditor({
  options,
  onChange,
  allSteps,
  currentStepId,
  showDescription,
  onShowDescriptionChange,
  pricingEnabled = false,
  pricingCurrency = "€",
}: {
  options: ImageChoiceOption[];
  onChange: (opts: ImageChoiceOption[]) => void;
  allSteps?: FlowStep[];
  currentStepId?: string;
  showDescription: boolean;
  onShowDescriptionChange: (v: boolean) => void;
  pricingEnabled?: boolean;
  pricingCurrency?: string;
}) {
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [iconLibOpen, setIconLibOpen] = useState(false);
  const [iconLibTarget, setIconLibTarget] = useState<number | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  async function handleImageUpload(idx: number, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) return;
      const data = await res.json();
      const updated = options.map((o, i) =>
        i === idx ? { ...o, imageUrl: data.url } : o
      );
      onChange(updated);
    } catch { /* ignore */ }
  }

  return (
    <div>
      {/* Header with toggle */}
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-gray-700">Optionen</label>
        <button
          onClick={() => onShowDescriptionChange(!showDescription)}
          className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-gray-700"
        >
          <span>Beschreibung anzeigen</span>
          <div className={`w-7 h-4 rounded-full transition-colors ${showDescription ? "bg-indigo-500" : "bg-gray-200"} relative`}>
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${showDescription ? "translate-x-3.5" : "translate-x-0.5"}`} />
          </div>
        </button>
      </div>

      <div className="space-y-1.5">
        {options.map((opt, idx) => (
          <div key={opt.value + idx}>
            {/* Compact row */}
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
              {/* Image thumbnail / picker toggle */}
              <button
                onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                className="w-7 h-7 rounded flex items-center justify-center border border-gray-200 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex-shrink-0 overflow-hidden"
                title="Bild hinzufügen"
              >
                {opt.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={opt.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </button>

              {/* Label input */}
              <input
                value={opt.label}
                onChange={(e) => {
                  const updated = options.map((o, i) =>
                    i === idx ? { ...o, label: e.target.value } : o
                  );
                  onChange(updated);
                }}
                placeholder={`Option ${idx + 1}`}
                className="flex-1 text-sm border-none outline-none bg-transparent text-gray-800 placeholder-gray-400"
              />

              {/* Delete */}
              <button
                onClick={() => onChange(options.filter((_, i) => i !== idx))}
                className="text-gray-300 hover:text-red-400 transition-colors text-xs flex-shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Description field (optional) */}
            {showDescription && (
              <input
                value={opt.subtitle ?? ""}
                onChange={(e) => {
                  const updated = options.map((o, i) =>
                    i === idx ? { ...o, subtitle: e.target.value } : o
                  );
                  onChange(updated);
                }}
                placeholder="Beschreibung (optional)"
                className="w-full mt-1 text-xs border border-gray-100 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 text-gray-500"
              />
            )}

            {/* Price field (when pricing enabled) */}
            {pricingEnabled && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-gray-400 shrink-0 w-8">Preis</span>
                <button
                  type="button"
                  onClick={() => onChange(options.map((o, i) => i === idx ? { ...o, priceModifier: (o.priceModifier ?? "add") === "add" ? "subtract" : "add" } : o))}
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 transition-colors ${(opt.priceModifier ?? "add") === "subtract" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}
                  title={(opt.priceModifier ?? "add") === "subtract" ? "Abzug" : "Aufschlag"}
                >
                  {(opt.priceModifier ?? "add") === "subtract" ? "−" : "+"}
                </button>
                <div className="relative flex-1">
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">{pricingCurrency}</span>
                  <input type="number" min={0} step={0.01}
                    value={opt.price ?? ""}
                    onChange={(e) => { const val = e.target.value === "" ? undefined : parseFloat(e.target.value); onChange(options.map((o, i) => i === idx ? { ...o, price: val } : o)); }}
                    placeholder="Von"
                    className="w-full text-[10px] border border-gray-200 rounded px-1.5 py-0.5 pl-5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
                <span className="text-[10px] text-gray-300 shrink-0">–</span>
                <div className="relative flex-1">
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">{pricingCurrency}</span>
                  <input type="number" min={0} step={0.01}
                    value={opt.maxPrice ?? ""}
                    onChange={(e) => { const val = e.target.value === "" ? undefined : parseFloat(e.target.value); onChange(options.map((o, i) => i === idx ? { ...o, maxPrice: val } : o)); }}
                    placeholder="Bis"
                    className="w-full text-[10px] border border-gray-200 rounded px-1.5 py-0.5 pl-5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
              </div>
            )}

            {/* Inline image picker — expands when thumbnail clicked */}
            {expandedIdx === idx && (
              <div className="mt-1 border border-gray-200 rounded-lg p-2 bg-gray-50 space-y-1.5">
                <input
                  ref={(el) => { fileInputRefs.current[idx] = el; }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload(idx, f);
                    e.target.value = "";
                    setExpandedIdx(null);
                  }}
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={() => fileInputRefs.current[idx]?.click()}
                    className="flex-1 h-8 border border-dashed border-gray-300 rounded text-xs text-gray-500 flex items-center justify-center gap-1 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Hochladen
                  </button>
                  <button
                    onClick={() => { setIconLibTarget(idx); setIconLibOpen(true); }}
                    className="flex-1 h-8 border border-dashed border-gray-300 rounded text-xs text-gray-500 flex items-center justify-center gap-1 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                    Bibliothek
                  </button>
                  {opt.imageUrl && (
                    <button
                      onClick={() => {
                        const updated = options.map((o, i) =>
                          i === idx ? { ...o, imageUrl: undefined } : o
                        );
                        onChange(updated);
                        setExpandedIdx(null);
                      }}
                      className="h-8 px-2 border border-dashed border-red-200 rounded text-xs text-red-400 hover:border-red-400 hover:text-red-500 transition-colors"
                    >
                      Entfernen
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Per-option navigation action */}
            <div className="flex items-center gap-1.5 mt-1 px-1">
              <label className="text-[10px] text-gray-400 shrink-0">Aktion:</label>
              <select
                value={opt.navigationAction?.type ?? "none"}
                onChange={(e) => {
                  const type = e.target.value;
                  const updated = options.map((o, i) =>
                    i === idx ? { ...o, navigationAction: { type, targetStepId: "" } } : o
                  );
                  onChange(updated);
                }}
                className="flex-1 text-[10px] border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
              >
                <option value="none">Keine Aktion</option>
                <option value="next">Nächste Seite</option>
                <option value="jump">Zur Seite springen</option>
              </select>
              {opt.navigationAction?.type === "jump" && allSteps && (
                <select
                  value={opt.navigationAction?.targetStepId ?? ""}
                  onChange={(e) => {
                    const updated = options.map((o, i) =>
                      i === idx ? { ...o, navigationAction: { type: "jump", targetStepId: e.target.value } } : o
                    );
                    onChange(updated);
                  }}
                  className="flex-1 text-[10px] border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                >
                  <option value="">Seite...</option>
                  {(() => {
                    const realList = allSteps.filter((s) => s.type !== "start" && s.type !== "end");
                    return realList
                      .filter((s) => s.id !== currentStepId)
                      .map((s) => {
                        const ri = realList.findIndex((rs) => rs.id === s.id);
                        return (
                          <option key={s.id} value={s.id}>
                            {ri + 1}. {s.label || (s.config as { title?: string }).title || `Seite ${ri + 1}`}
                          </option>
                        );
                      });
                  })()}
                </select>
              )}
            </div>
          </div>
        ))}

        <button
          onClick={() =>
            onChange([
              ...options,
              { value: `option${options.length + 1}`, label: `Option ${options.length + 1}` },
            ])
          }
          className="w-full text-sm text-gray-600 border border-gray-200 rounded-lg py-2 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5 mt-1"
        >
          <span className="text-gray-400">+</span> Hinzufügen
        </button>
      </div>

      <IconLibrary
        open={iconLibOpen}
        onClose={() => { setIconLibOpen(false); setIconLibTarget(null); }}
        onSelect={(iconData) => {
          if (iconLibTarget !== null) {
            const updated = options.map((o, i) =>
              i === iconLibTarget ? { ...o, imageUrl: iconData.url } : o
            );
            onChange(updated);
          }
          setIconLibOpen(false);
          setIconLibTarget(null);
        }}
      />
    </div>
  );
}

// ─── Pricing cards editor ─────────────────────────────────────────────────────

interface PricingCard {
  key: string;
  title: string;
  price?: string;
  features?: string[];
  highlighted?: boolean;
}

function PricingCardsEditor({
  cards,
  onChange,
}: {
  cards: PricingCard[];
  onChange: (cards: PricingCard[]) => void;
}) {
  const smallInput = "w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400";
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-2">Preispakete</label>
      <div className="space-y-3">
        {cards.map((card, idx) => (
          <div key={card.key} className={`border rounded-lg p-2 space-y-1.5 ${card.highlighted ? "border-indigo-400 bg-indigo-50/50" : "border-gray-200"}`}>
            <div className="flex gap-2">
              <input
                value={card.title}
                onChange={(e) => {
                  const updated = cards.map((c, i) => i === idx ? { ...c, title: e.target.value } : c);
                  onChange(updated);
                }}
                placeholder="Paketname"
                className={`flex-1 ${smallInput}`}
              />
              <button
                onClick={() => onChange(cards.filter((_, i) => i !== idx))}
                className="text-red-400 hover:text-red-600 text-xs"
              >✕</button>
            </div>
            <input
              value={card.price ?? ""}
              onChange={(e) => {
                const updated = cards.map((c, i) => i === idx ? { ...c, price: e.target.value } : c);
                onChange(updated);
              }}
              placeholder="Preis (z.B. 29€/Monat)"
              className={`${smallInput} font-medium`}
            />
            <textarea
              value={(card.features ?? []).join("\n")}
              onChange={(e) => {
                const features = e.target.value.split("\n").filter(Boolean);
                const updated = cards.map((c, i) => i === idx ? { ...c, features } : c);
                onChange(updated);
              }}
              placeholder="Features (eins pro Zeile)"
              rows={3}
              className={`${smallInput} resize-none`}
            />
            <label className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <input
                type="checkbox"
                checked={card.highlighted ?? false}
                onChange={(e) => {
                  const updated = cards.map((c, i) => i === idx ? { ...c, highlighted: e.target.checked } : c);
                  onChange(updated);
                }}
                className="rounded border-gray-300"
              />
              Hervorgehoben
            </label>
          </div>
        ))}
        <button
          onClick={() => onChange([...cards, { key: `plan${cards.length + 1}`, title: `Plan ${cards.length + 1}`, price: "", features: [] }])}
          className="w-full text-xs text-indigo-600 border border-dashed border-indigo-300 rounded-lg py-1.5 hover:bg-indigo-50 transition-colors"
        >
          + Paket hinzufügen
        </button>
      </div>
    </div>
  );
}

// ─── Accordion items editor ───────────────────────────────────────────────────

function AccordionItemsEditor({
  items,
  onChange,
}: {
  items: { title: string; defaultOpen?: boolean }[];
  onChange: (items: { title: string; defaultOpen?: boolean }[]) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-2">Abschnitte</label>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <input
              value={item.title}
              onChange={(e) => {
                const updated = items.map((it, i) => i === idx ? { ...it, title: e.target.value } : it);
                onChange(updated);
              }}
              placeholder="Abschnitt-Titel"
              className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <label className="flex items-center gap-1 text-[10px] text-gray-400 whitespace-nowrap">
              <input
                type="checkbox"
                checked={item.defaultOpen ?? false}
                onChange={(e) => {
                  const updated = items.map((it, i) => i === idx ? { ...it, defaultOpen: e.target.checked } : it);
                  onChange(updated);
                }}
                className="rounded border-gray-300"
              />
              Offen
            </label>
            <button
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
              className="text-red-400 hover:text-red-600 text-xs"
            >✕</button>
          </div>
        ))}
        <button
          onClick={() => onChange([...items, { title: `Abschnitt ${items.length + 1}`, defaultOpen: false }])}
          className="w-full text-xs text-indigo-600 border border-dashed border-indigo-300 rounded-lg py-1.5 hover:bg-indigo-50 transition-colors"
        >
          + Abschnitt hinzufügen
        </button>
      </div>
    </div>
  );
}

// ─── Payment amounts editor ───────────────────────────────────────────────────

function AmountsEditor({
  amounts,
  currency,
  onChange,
}: {
  amounts: number[];
  currency: string;
  onChange: (amounts: number[]) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-2">Beträge ({currency})</label>
      <div className="flex flex-wrap gap-1.5">
        {amounts.map((amount, idx) => (
          <div key={idx} className="flex items-center gap-1 bg-gray-100 rounded-full pl-2 pr-1 py-0.5">
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                const updated = amounts.map((a, i) => i === idx ? e.target.valueAsNumber || 0 : a);
                onChange(updated);
              }}
              className="w-16 text-xs bg-transparent border-none focus:outline-none text-right"
            />
            <button
              onClick={() => onChange(amounts.filter((_, i) => i !== idx))}
              className="text-gray-400 hover:text-red-500 text-[10px]"
            >✕</button>
          </div>
        ))}
      </div>
      <button
        onClick={() => onChange([...amounts, 0])}
        className="mt-2 w-full text-xs text-indigo-600 border border-dashed border-indigo-300 rounded-lg py-1.5 hover:bg-indigo-50 transition-colors"
      >
        + Betrag hinzufügen
      </button>
    </div>
  );
}

// ─── Icon Settings Inline ─────────────────────────────────────────────────────

const ICON_SIZE_OPTIONS = [
  { value: "", label: "Standard (1.75rem)" },
  { value: "1rem", label: "Klein (1rem)" },
  { value: "1.25rem", label: "Mittel-klein (1.25rem)" },
  { value: "1.75rem", label: "Normal (1.75rem)" },
  { value: "2.5rem", label: "Groß (2.5rem)" },
  { value: "3rem", label: "Sehr groß (3rem)" },
  { value: "4rem", label: "Extra groß (4rem)" },
];

function IconSettingsInline({
  styleOverrides,
  onOverrideChange,
}: {
  styleOverrides: Record<string, string>;
  onOverrideChange: (key: string, val: string) => void;
}) {
  const inputClass =
    "w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400";

  return (
    <div className="space-y-2 pt-2 border-t border-gray-100">
      <p className="text-xs font-medium text-gray-500">Icon-Einstellungen</p>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Ausrichtung</label>
        <div className="flex gap-1">
          {[
            { value: "left", label: "Links", icon: "⬛◻◻" },
            { value: "center", label: "Mitte", icon: "◻⬛◻" },
            { value: "right", label: "Rechts", icon: "◻◻⬛" },
          ].map((opt) => {
            const isActive = (styleOverrides.iconAlignment ?? "center") === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onOverrideChange("iconAlignment", opt.value)}
                title={opt.label}
                className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Icon-Größe</label>
        <select
          value={styleOverrides.iconSize ?? ""}
          onChange={(e) => onOverrideChange("iconSize", e.target.value)}
          className={inputClass}
        >
          {ICON_SIZE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Icon-Farbe</label>
        <input
          type="color"
          value={styleOverrides.iconColor || "#6366f1"}
          onChange={(e) => onOverrideChange("iconColor", e.target.value)}
          className="w-full h-8 rounded border border-gray-200 cursor-pointer"
        />
      </div>
    </div>
  );
}

// ─── Main Inspector Content ───────────────────────────────────────────────────

interface InspectorContentProps {
  step: FlowStep;
  onStepChange: (step: FlowStep) => void;
  /** ID of the component currently selected in the canvas */
  selectedComponentId: string | null;
  /** Called when the user selects/deselects a component inside the inspector */
  onComponentSelect: (id: string | null) => void;
  allSteps?: FlowStep[];
  pricingEnabled?: boolean;
  pricingCurrency?: string;
}

// ─── Contact Form Editor ─────────────────────────────────────────────────────

interface ContactFormCb { id: string; label: string; required: boolean }
interface ContactFormCfg {
  showFirstName?: boolean;
  showLastName?: boolean;
  showEmail?: boolean;
  showPhone?: boolean;
  showCompany?: boolean;
  showVatId?: boolean;
  showBillingAddress?: boolean;
  checkboxes?: ContactFormCb[];
}

function ContactFormEditor({
  config,
  onChange,
}: {
  config: ContactFormCfg;
  onChange: (key: string, val: unknown) => void;
}) {
  const cbs = config.checkboxes ?? [];

  function toggle(key: string) {
    onChange(key, !(config as Record<string, unknown>)[key]);
  }

  function addCheckbox() {
    const id = `cb_${Date.now()}`;
    onChange("checkboxes", [...cbs, { id, label: "Neues Feld", required: false }]);
  }

  function updateCb(idx: number, patch: Partial<ContactFormCb>) {
    onChange("checkboxes", cbs.map((cb, i) => i === idx ? { ...cb, ...patch } : cb));
  }

  function removeCb(idx: number) {
    onChange("checkboxes", cbs.filter((_, i) => i !== idx));
  }

  const Toggle2 = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${on ? "bg-indigo-500" : "bg-gray-200"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );

  const Row = ({ label, desc, field }: { label: string; desc?: string; field: string }) => (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-xs text-gray-700 font-medium">{label}</span>
        {desc && <p className="text-[10px] text-gray-400 mt-0.5">{desc}</p>}
      </div>
      <Toggle2 on={!!(config as Record<string, unknown>)[field]} onToggle={() => toggle(field)} />
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Felder</p>

      <div className="space-y-2">
        <Row label="Vorname" field="showFirstName" />
        <Row label="Nachname" field="showLastName" />
        <Row label="E-Mail Adresse" field="showEmail" />
        <Row label="Telefonnummer" desc="Mit Ländercode + Live-Validierung" field="showPhone" />
      </div>

      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide pt-1">Optionale Felder</p>

      <div className="space-y-2">
        <Row label="Unternehmen" field="showCompany" />
        <Row label="Umsatzsteuer-ID" desc="Format- und VIES-Prüfung" field="showVatId" />
        <Row label="Rechnungsadresse" desc="Mit Option für abweichende Lieferadresse" field="showBillingAddress" />
      </div>

      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide pt-1">Checkboxen</p>

      <div className="space-y-1.5">
        {cbs.map((cb, idx) => (
          <div key={cb.id} className="border border-gray-200 rounded-lg p-2 space-y-1.5 bg-white">
            <div className="flex items-center gap-1.5">
              <input
                value={cb.label}
                onChange={(e) => updateCb(idx, { label: e.target.value })}
                className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder="Checkbox-Text"
              />
              <button onClick={() => removeCb(idx)} className="text-gray-300 hover:text-red-400 text-xs shrink-0">✕</button>
            </div>
            <label className="flex items-center gap-1.5 text-[10px] text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={cb.required}
                onChange={(e) => updateCb(idx, { required: e.target.checked })}
                className="accent-indigo-500"
              />
              Pflichtfeld
            </label>
          </div>
        ))}
        <button
          onClick={addCheckbox}
          className="w-full text-xs text-gray-600 border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
        >
          <span className="text-gray-400">+</span> Checkbox hinzufügen
        </button>
      </div>
    </div>
  );
}

const COMPONENT_TYPE_LABELS: Record<string, string> = {
  heading: "Überschrift",
  paragraph: "Absatz",
  "text-input": "Textfeld",
  "text-area": "Textbereich",
  "email-input": "E-Mail",
  "phone-input": "Telefonnummer",
  "number-input": "Nummer",
  "date-picker": "Datum",
  "card-selector": "Karten-Auswahl",
  "radio-group": "Einfachauswahl",
  "checkbox-group": "Mehrfachauswahl",
  dropdown: "Dropdown",
  slider: "Schieberegler",
  rating: "Bewertung",
  "file-upload": "Datei-Upload",
  "image-block": "Bild",
  "image-choice": "Bildauswahl",
  "location-picker": "Adresse",
  "hidden-field": "Verstecktes Feld",
  "contact-form": "Kontaktformular",
};

export default function InspectorContent({
  step,
  onStepChange,
  selectedComponentId,
  onComponentSelect,
  allSteps,
  pricingEnabled = false,
  pricingCurrency = "€",
}: InspectorContentProps) {
  function updateStepConfig(key: string, value: unknown) {
    onStepChange({ ...step, config: { ...step.config, [key]: value } });
  }

  function updateLabel(label: string) {
    onStepChange({ ...step, label });
  }

  function removeComponent(componentId: string) {
    onStepChange({
      ...step,
      components: step.components.filter((c) => c.id !== componentId),
    });
    if (selectedComponentId === componentId) onComponentSelect(null);
  }

  function updateComponentConfig(componentId: string, key: string, value: unknown) {
    onStepChange({
      ...step,
      components: step.components.map((c) =>
        c.id === componentId ? { ...c, config: { ...c.config, [key]: value } } : c
      ),
    });
  }

  function updateComponentField(componentId: string, field: keyof StepComponent, value: unknown) {
    onStepChange({
      ...step,
      components: step.components.map((c) =>
        c.id === componentId ? { ...c, [field]: value } : c
      ),
    });
  }

  const selectedComponent = step.components.find((c) => c.id === selectedComponentId);

  const inputClass =
    "w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400";

  // ── Component Editor View ──────────────────────────────────────────────────
  if (selectedComponent) {
    return (
      <div className="flex flex-col">
        {/* Breadcrumb back to step */}
        <button
          onClick={() => onComponentSelect(null)}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs text-gray-500 hover:text-indigo-600 hover:bg-gray-50 border-b border-gray-100 transition-colors text-left"
        >
          <span>←</span>
          <span className="font-medium">{step.label}</span>
          <span className="text-gray-400">/</span>
          <span className="text-indigo-600 font-semibold">
            {COMPONENT_TYPE_LABELS[selectedComponent.componentType] ?? selectedComponent.componentType}
          </span>
        </button>

        {/* Component fields */}
        <div className="px-4 py-4 space-y-3">
          <ComponentEditor
            comp={selectedComponent}
            onConfigChange={(key, val) => updateComponentConfig(selectedComponent.id, key, val)}
            onFieldChange={(field, val) => updateComponentField(selectedComponent.id, field, val)}
            onMultiFieldChange={(changes) => onStepChange({
              ...step,
              components: step.components.map((c) =>
                c.id === selectedComponent.id ? { ...c, ...changes } : c
              ),
            })}
            allSteps={allSteps}
            currentStepId={step.id}
            pricingEnabled={pricingEnabled}
            pricingCurrency={pricingCurrency}
          />
          {/* Delete button */}
          <button
            onClick={() => removeComponent(selectedComponent.id)}
            className="w-full mt-2 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            Element entfernen
          </button>
        </div>
      </div>
    );
  }

  // ── Step Settings View ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-0 divide-y divide-gray-100">

      {/* ── Step Settings ── */}
      <div className="px-4 py-4 space-y-3">
        <p className="text-xs font-semibold text-gray-700">Seiten-Einstellungen</p>

        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Seitenname
            <span className="ml-1 text-gray-400">(Wird in der Seitenleiste und in der Navigation angezeigt)</span>
          </label>
          <input
            value={step.label ?? ""}
            onChange={(e) => updateLabel(e.target.value)}
            placeholder={`z.B. ${(step.config as { title?: string }).title || "Kontaktdaten"}`}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Seitentitel</label>
          <input
            value={(step.config as Record<string, unknown>)?.title as string ?? ""}
            onChange={(e) => updateStepConfig("title", e.target.value)}
            placeholder="Wird über den Feldern angezeigt"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Untertitel</label>
          <input
            value={(step.config as Record<string, unknown>)?.subtitle as string ?? ""}
            onChange={(e) => updateStepConfig("subtitle", e.target.value)}
            placeholder="Optionaler Beschreibungstext"
            className={inputClass}
          />
        </div>

      </div>

      {/* ── Components List ── */}
      <div className="px-4 py-4">
        <p className="text-xs font-semibold text-gray-700 mb-3">
          Elemente ({step.components?.length ?? 0})
        </p>

        {step.components?.length === 0 ? (
          <p className="text-xs text-gray-400 italic">
            Klicke im Canvas auf „+ Block", um Elemente hinzuzufügen.
          </p>
        ) : (
          <div className="space-y-1">
            {step.components.map((comp) => (
              <button
                key={comp.id}
                onClick={() => onComponentSelect(comp.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {comp.label || COMPONENT_TYPE_LABELS[comp.componentType] || comp.componentType}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {COMPONENT_TYPE_LABELS[comp.componentType] ?? comp.componentType}
                  </p>
                </div>
                <span className="text-gray-400 text-xs shrink-0">›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Visibility Condition Editor ─────────────────────────────────────────────

const CONDITION_TYPE_LABELS: Record<ConditionType, string> = {
  always: "Immer",
  equals: "ist gleich",
  not_equals: "ist nicht gleich",
  contains: "enthält",
  not_contains: "enthält nicht",
  gt: "größer als",
  lt: "kleiner als",
  gte: "größer oder gleich",
  lte: "kleiner oder gleich",
  regex: "entspricht Regex",
  is_empty: "ist leer",
  is_not_empty: "ist nicht leer",
};

const VALUE_NOT_NEEDED: ConditionType[] = ["always", "is_empty", "is_not_empty"];

function VisibilityEditor({
  conditions,
  logic,
  allSteps,
  currentStepId,
  onChange,
}: {
  conditions: ComponentVisibilityCondition[];
  logic: "AND" | "OR";
  allSteps?: FlowStep[];
  currentStepId?: string;
  onChange: (conditions: ComponentVisibilityCondition[], logic: "AND" | "OR") => void;
}) {
  // Collect all field keys from all steps (excluding current step fields — you set visibility based on earlier answers)
  const allFields: { fieldKey: string; label: string; stepLabel: string; componentType: string; cards?: { key: string; title: string }[] }[] = [];
  for (const step of allSteps ?? []) {
    if (step.type === "start" || step.type === "end") continue;
    for (const comp of step.components) {
      if (comp.fieldKey) {
        const cards = comp.componentType === "card-selector"
          ? ((comp.config as Record<string, unknown>)?.cards as { key: string; title: string }[] | undefined)
          : undefined;
        allFields.push({
          fieldKey: comp.fieldKey,
          label: comp.label || comp.fieldKey,
          stepLabel: step.label || step.id,
          componentType: comp.componentType,
          cards,
        });
      }
    }
  }

  function addCondition() {
    const newCond: ComponentVisibilityCondition = {
      id: crypto.randomUUID(),
      fieldKey: allFields[0]?.fieldKey ?? "",
      conditionType: "equals",
      conditionValue: "",
    };
    onChange([...conditions, newCond], logic);
  }

  function updateCondition(id: string, patch: Partial<ComponentVisibilityCondition>) {
    onChange(conditions.map(c => c.id === id ? { ...c, ...patch } : c), logic);
  }

  function removeCondition(id: string) {
    onChange(conditions.filter(c => c.id !== id), logic);
  }

  const inputClass =
    "text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400";

  return (
    <div className="space-y-2">
      {conditions.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Immer sichtbar — keine Bedingungen gesetzt.</p>
      ) : (
        <>
          {conditions.map((cond, idx) => {
            const fieldMeta = allFields.find(f => f.fieldKey === cond.fieldKey);
            const cardOptions = fieldMeta?.cards ?? [];
            return (
              <div key={cond.id} className="flex items-start gap-1.5">
                {conditions.length > 1 && (
                  <span className="text-xs text-gray-400 pt-1.5 w-8 shrink-0 text-right">
                    {idx === 0 ? "WENN" : logic === "AND" ? "UND" : "ODER"}
                  </span>
                )}
                {conditions.length === 1 && (
                  <span className="text-xs text-gray-400 pt-1.5 w-8 shrink-0 text-right">WENN</span>
                )}
                <div className="flex-1 flex flex-wrap gap-1 items-center">
                  <select
                    value={cond.fieldKey}
                    onChange={(e) => updateCondition(cond.id, { fieldKey: e.target.value, conditionValue: "" })}
                    className={`${inputClass} flex-1 min-w-0`}
                  >
                    <option value="">Feld wählen…</option>
                    {allFields.map((f) => (
                      <option key={f.fieldKey} value={f.fieldKey}>
                        {f.stepLabel}: {f.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={cond.conditionType}
                    onChange={(e) => updateCondition(cond.id, { conditionType: e.target.value as ConditionType })}
                    className={inputClass}
                  >
                    {(Object.keys(CONDITION_TYPE_LABELS) as ConditionType[])
                      .filter(t => t !== "always")
                      .map(t => (
                        <option key={t} value={t}>{CONDITION_TYPE_LABELS[t]}</option>
                      ))}
                  </select>
                  {!VALUE_NOT_NEEDED.includes(cond.conditionType) && (
                    cardOptions.length > 0 ? (
                      <select
                        value={cond.conditionValue ?? ""}
                        onChange={(e) => updateCondition(cond.id, { conditionValue: e.target.value })}
                        className={`${inputClass} w-32`}
                      >
                        <option value="">Wert wählen…</option>
                        {cardOptions.map((card) => (
                          <option key={card.key} value={card.key}>{card.title}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={cond.conditionValue ?? ""}
                        onChange={(e) => updateCondition(cond.id, { conditionValue: e.target.value })}
                        placeholder="Wert"
                        className={`${inputClass} w-24`}
                      />
                    )
                  )}
                </div>
                <button
                  onClick={() => removeCondition(cond.id)}
                  className="shrink-0 text-gray-400 hover:text-red-500 transition-colors pt-1"
                  title="Entfernen"
                >
                  ✕
                </button>
              </div>
            );
          })}
          {conditions.length >= 2 && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-gray-500">Verknüpfung:</span>
              <button
                onClick={() => onChange(conditions, "AND")}
                className={`text-xs px-2 py-0.5 rounded border transition-colors ${logic === "AND" ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-medium" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
              >
                UND (alle)
              </button>
              <button
                onClick={() => onChange(conditions, "OR")}
                className={`text-xs px-2 py-0.5 rounded border transition-colors ${logic === "OR" ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-medium" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
              >
                ODER (mindestens eine)
              </button>
            </div>
          )}
        </>
      )}
      <button
        onClick={addCondition}
        className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
      >
        + Bedingung hinzufügen
      </button>
    </div>
  );
}

// ─── Per-component expanded editor ───────────────────────────────────────────

function ComponentEditor({
  comp,
  onConfigChange,
  onFieldChange,
  onMultiFieldChange,
  allSteps,
  currentStepId,
  pricingEnabled = false,
  pricingCurrency = "€",
}: {
  comp: StepComponent;
  onConfigChange: (key: string, val: unknown) => void;
  onFieldChange: (field: keyof StepComponent, val: unknown) => void;
  onMultiFieldChange: (changes: Partial<StepComponent>) => void;
  allSteps?: FlowStep[];
  currentStepId?: string;
  pricingEnabled?: boolean;
  pricingCurrency?: string;
}) {
  const schemaDef = (COMPONENT_DEFINITIONS as Record<string, { configSchema: readonly ConfigSchemaField[] }>)[comp.componentType];
  const schema = schemaDef?.configSchema ?? [];

  const inputClass =
    "w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400";

  // For button components: auto-update the label text when the action type changes
  const ACTION_DEFAULT_LABELS: Record<string, string> = {
    next: "Weiter",
    previous: "Zurück",
    jump: "Zur Seite springen",
    url: "Link öffnen",
  };
  const handleConfigChange = (key: string, val: unknown) => {
    if (comp.componentType === "button" && key === "action") {
      const currentText = (comp.config.text as string) ?? "";
      const isDefaultLabel = Object.values(ACTION_DEFAULT_LABELS).includes(currentText) || currentText === "";
      if (isDefaultLabel) {
        onConfigChange("text", ACTION_DEFAULT_LABELS[val as string] ?? "Weiter");
      }
    }
    onConfigChange(key, val);
  };

  return (
    <div className="space-y-3">
      {/* Dynamic schema fields FIRST (text content, placeholder, etc.) */}
      {schema.map((field) => (
        <ConfigFieldEditor
          key={field.key}
          field={field}
          value={comp.config[field.key]}
          allConfig={comp.config}
          onChange={handleConfigChange}
          allSteps={allSteps}
          currentStepId={currentStepId}
        />
      ))}

      {/* Options editor for choice components */}
      {["radio-group", "dropdown"].includes(comp.componentType) && (
        <OptionsEditor
          options={(comp.config.options as { value: string; label: string }[]) ?? []}
          onChange={(opts) => onConfigChange("options", opts)}
          pricingEnabled={pricingEnabled}
          pricingCurrency={pricingCurrency}
          optionPrices={(comp.config.optionPrices as Record<string, number>) ?? {}}
          onOptionPricesChange={(prices) => onConfigChange("optionPrices", prices)}
          optionMaxPrices={(comp.config.optionMaxPrices as Record<string, number>) ?? {}}
          onOptionMaxPricesChange={(prices) => onConfigChange("optionMaxPrices", prices)}
          optionPriceModifiers={(comp.config.optionPriceModifiers as Record<string, "add" | "subtract">) ?? {}}
          onOptionPriceModifiersChange={(mods) => onConfigChange("optionPriceModifiers", mods)}
        />
      )}
      {comp.componentType === "checkbox-group" && (
        <CheckboxGroupEditor
          options={(comp.config.options as CheckboxOption[]) ?? []}
          onChange={(opts) => onConfigChange("options", opts)}
          pricingEnabled={pricingEnabled}
          pricingCurrency={pricingCurrency}
          optionPrices={(comp.config.optionPrices as Record<string, number>) ?? {}}
          onOptionPricesChange={(prices) => onConfigChange("optionPrices", prices)}
          optionMaxPrices={(comp.config.optionMaxPrices as Record<string, number>) ?? {}}
          onOptionMaxPricesChange={(prices) => onConfigChange("optionMaxPrices", prices)}
          optionPriceModifiers={(comp.config.optionPriceModifiers as Record<string, "add" | "subtract">) ?? {}}
          onOptionPriceModifiersChange={(mods) => onConfigChange("optionPriceModifiers", mods)}
        />
      )}

      {/* Image choice editor */}
      {comp.componentType === "image-choice" && (
        <>
          <ImageChoiceEditor
            options={(comp.config.options as ImageChoiceOption[]) ?? []}
            onChange={(opts) => onConfigChange("options", opts)}
            showDescription={(comp.config.showDescription as boolean) ?? false}
            onShowDescriptionChange={(v) => onConfigChange("showDescription", v)}
            allSteps={allSteps}
            currentStepId={currentStepId}
            pricingEnabled={pricingEnabled}
            pricingCurrency={pricingCurrency}
          />
          <IconSettingsInline
            styleOverrides={(comp.config.styleOverrides as Record<string, string>) ?? {}}
            onOverrideChange={(key, val) => {
              const existing = (comp.config.styleOverrides as Record<string, string>) ?? {};
              const updated = { ...existing };
              if (val === "") { delete updated[key]; } else { updated[key] = val; }
              onConfigChange("styleOverrides", Object.keys(updated).length > 0 ? updated : undefined);
            }}
          />
        </>
      )}

      {/* Cards editor for card-selector */}
      {comp.componentType === "card-selector" && (
        <>
          <CardsEditor
            cards={(comp.config.cards as CardItem[]) ?? []}
            onChange={(cards) => onConfigChange("cards", cards)}
            allSteps={allSteps}
            currentStepId={currentStepId}
            pricingEnabled={pricingEnabled}
            pricingCurrency={pricingCurrency}
          />
          <IconSettingsInline
            styleOverrides={(comp.config.styleOverrides as Record<string, string>) ?? {}}
            onOverrideChange={(key, val) => {
              const existing = (comp.config.styleOverrides as Record<string, string>) ?? {};
              const updated = { ...existing };
              if (val === "") { delete updated[key]; } else { updated[key] = val; }
              onConfigChange("styleOverrides", Object.keys(updated).length > 0 ? updated : undefined);
            }}
          />
        </>
      )}

      {/* Pricing cards editor */}
      {comp.componentType === "pricing-card" && (
        <PricingCardsEditor
          cards={(comp.config.cards as PricingCard[]) ?? []}
          onChange={(cards) => onConfigChange("cards", cards)}
        />
      )}

      {/* Accordion items editor */}
      {comp.componentType === "accordion-group" && (
        <AccordionItemsEditor
          items={(comp.config.items as { title: string; defaultOpen?: boolean }[]) ?? []}
          onChange={(items) => onConfigChange("items", items)}
        />
      )}

      {/* Payment amounts editor */}
      {comp.componentType === "payment-field" && (
        <AmountsEditor
          amounts={(comp.config.amounts as number[]) ?? []}
          currency={(comp.config.currency as string) ?? "EUR"}
          onChange={(amounts) => onConfigChange("amounts", amounts)}
        />
      )}

      {/* Contact form editor */}
      {comp.componentType === "contact-form" && (
        <ContactFormEditor
          config={comp.config as ContactFormCfg}
          onChange={onConfigChange}
        />
      )}

      {/* Sichtbarkeit */}
      <div className="border-t border-gray-100 pt-3 space-y-2">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Sichtbarkeit</p>
        <VisibilityEditor
          conditions={comp.visibilityConditions ?? []}
          logic={comp.visibilityLogic ?? "AND"}
          allSteps={allSteps}
          currentStepId={currentStepId}
          onChange={(conds, lgc) => {
            onMultiFieldChange({
              visibilityConditions: conds.length > 0 ? conds : undefined,
              visibilityLogic: lgc,
            });
          }}
        />
      </div>

      {/* Label + Feldschlüssel below (secondary) */}
      <div className="border-t border-gray-100 pt-3 space-y-3">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Technisch</p>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Label</label>
          <input
            value={comp.label ?? ""}
            onChange={(e) => onFieldChange("label", e.target.value)}
            placeholder="Feldbezeichnung"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Feldschlüssel</label>
          <input
            value={comp.fieldKey ?? ""}
            onChange={(e) => onFieldChange("fieldKey", e.target.value)}
            className={`${inputClass} font-mono`}
          />
        </div>
      </div>
    </div>
  );
}
