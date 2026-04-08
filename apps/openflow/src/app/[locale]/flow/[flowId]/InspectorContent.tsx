"use client";

import { useState, useRef } from "react";
import type { FlowStep, StepComponent, ConfigSchemaField } from "@opensoftware/openflow-core";
import { COMPONENT_DEFINITIONS } from "@opensoftware/openflow-core";
import IconLibrary from "./IconLibrary";

// ─── Dynamic config field renderer ───────────────────────────────────────────

function ConfigFieldEditor({
  field,
  value,
  allConfig,
  onChange,
}: {
  field: ConfigSchemaField;
  value: unknown;
  allConfig: Record<string, unknown>;
  onChange: (key: string, val: unknown) => void;
}) {
  // Conditional visibility
  if (field.condition) {
    if (allConfig[field.condition.field] !== field.condition.value) return null;
  }

  const inputClass =
    "w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400";

  switch (field.type) {
    case "text":
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
}: {
  options: { value: string; label: string }[];
  onChange: (opts: { value: string; label: string }[]) => void;
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
    </div>
  );
}

// ─── Cards editor (card-selector) ────────────────────────────────────────────

function CardsEditor({
  cards,
  onChange,
}: {
  cards: { key: string; title: string; subtitle?: string }[];
  onChange: (cards: { key: string; title: string; subtitle?: string }[]) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-2">Karten</label>
      <div className="space-y-2">
        {cards.map((card, idx) => (
          <div key={card.key} className="flex gap-2 items-start">
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
                className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
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
                className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 text-gray-500"
              />
            </div>
            <button
              onClick={() => onChange(cards.filter((_, i) => i !== idx))}
              className="text-red-400 hover:text-red-600 text-xs mt-1"
            >
              ✕
            </button>
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
    </div>
  );
}

// ─── Image choice editor ──────────────────────────────────────────────────────

interface ImageChoiceOption {
  value: string;
  label: string;
  imageUrl?: string;
}

function ImageChoiceEditor({
  options,
  onChange,
}: {
  options: ImageChoiceOption[];
  onChange: (opts: ImageChoiceOption[]) => void;
}) {
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [iconLibOpen, setIconLibOpen] = useState(false);
  const [iconLibTarget, setIconLibTarget] = useState<number | null>(null);

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
      <label className="block text-xs text-gray-500 mb-2">Auswahloptionen</label>
      <div className="space-y-3">
        {options.map((opt, idx) => (
          <div key={opt.value + idx} className="border border-gray-200 rounded-lg p-2 space-y-2">
            {/* Image preview / upload */}
            <div className="relative">
              {opt.imageUrl ? (
                <div className="relative group">
                  <img
                    src={opt.imageUrl}
                    alt={opt.label}
                    className="w-full h-20 object-cover rounded bg-gray-100"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <button
                    onClick={() => {
                      const updated = options.map((o, i) =>
                        i === idx ? { ...o, imageUrl: undefined } : o
                      );
                      onChange(updated);
                    }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <input
                    ref={(el) => { fileInputRefs.current[idx] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImageUpload(idx, f);
                      e.target.value = "";
                    }}
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => fileInputRefs.current[idx]?.click()}
                      className="flex-1 h-16 border border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors text-xs gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      Hochladen
                    </button>
                    <button
                      onClick={() => { setIconLibTarget(idx); setIconLibOpen(true); }}
                      className="h-16 px-3 border border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors text-[10px] gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                      Bibliothek
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Label + Value */}
            <div className="flex gap-2">
              <input
                value={opt.label}
                onChange={(e) => {
                  const updated = options.map((o, i) =>
                    i === idx ? { ...o, label: e.target.value } : o
                  );
                  onChange(updated);
                }}
                placeholder="Label"
                className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <button
                onClick={() => onChange(options.filter((_, i) => i !== idx))}
                className="text-red-400 hover:text-red-600 text-xs px-1"
              >
                ✕
              </button>
            </div>

            {/* Image URL fallback */}
            <input
              value={opt.imageUrl ?? ""}
              onChange={(e) => {
                const updated = options.map((o, i) =>
                  i === idx ? { ...o, imageUrl: e.target.value || undefined } : o
                );
                onChange(updated);
              }}
              placeholder="oder Bild-URL eingeben"
              className="w-full text-[10px] border border-gray-100 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 text-gray-400"
            />
          </div>
        ))}
        <button
          onClick={() =>
            onChange([
              ...options,
              { value: `option${options.length + 1}`, label: `Option ${options.length + 1}` },
            ])
          }
          className="w-full text-xs text-indigo-600 border border-dashed border-indigo-300 rounded-lg py-1.5 hover:bg-indigo-50 transition-colors"
        >
          + Auswahl hinzufügen
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

// ─── Main Inspector Content ───────────────────────────────────────────────────

interface InspectorContentProps {
  step: FlowStep;
  onStepChange: (step: FlowStep) => void;
  /** ID of the component currently selected in the canvas */
  selectedComponentId: string | null;
  /** Called when the user selects/deselects a component inside the inspector */
  onComponentSelect: (id: string | null) => void;
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
};

export default function InspectorContent({
  step,
  onStepChange,
  selectedComponentId,
  onComponentSelect,
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
          <label className="block text-xs text-gray-500 mb-1">Label</label>
          <input
            value={step.label}
            onChange={(e) => updateLabel(e.target.value)}
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

        <div>
          <label className="block text-xs text-gray-500 mb-1">„Weiter"-Button Text</label>
          <input
            value={(step.config as Record<string, unknown>)?.nextButtonText as string ?? ""}
            onChange={(e) => updateStepConfig("nextButtonText", e.target.value)}
            placeholder="Weiter"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">„Zurück"-Button Text</label>
          <input
            value={(step.config as Record<string, unknown>)?.backButtonText as string ?? ""}
            onChange={(e) => updateStepConfig("backButtonText", e.target.value)}
            placeholder="Zurück"
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

// ─── Per-component expanded editor ───────────────────────────────────────────

function ComponentEditor({
  comp,
  onConfigChange,
  onFieldChange,
}: {
  comp: StepComponent;
  onConfigChange: (key: string, val: unknown) => void;
  onFieldChange: (field: keyof StepComponent, val: unknown) => void;
}) {
  const schemaDef = (COMPONENT_DEFINITIONS as Record<string, { configSchema: readonly ConfigSchemaField[] }>)[comp.componentType];
  const schema = schemaDef?.configSchema ?? [];

  const inputClass =
    "w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400";

  return (
    <div className="space-y-3">
      {/* Dynamic schema fields FIRST (text content, placeholder, etc.) */}
      {schema.map((field) => (
        <ConfigFieldEditor
          key={field.key}
          field={field}
          value={comp.config[field.key]}
          allConfig={comp.config}
          onChange={onConfigChange}
        />
      ))}

      {/* Options editor for choice components */}
      {["radio-group", "checkbox-group", "dropdown"].includes(comp.componentType) && (
        <OptionsEditor
          options={(comp.config.options as { value: string; label: string }[]) ?? []}
          onChange={(opts) => onConfigChange("options", opts)}
        />
      )}

      {/* Image choice editor */}
      {comp.componentType === "image-choice" && (
        <ImageChoiceEditor
          options={(comp.config.options as ImageChoiceOption[]) ?? []}
          onChange={(opts) => onConfigChange("options", opts)}
        />
      )}

      {/* Cards editor for card-selector */}
      {comp.componentType === "card-selector" && (
        <CardsEditor
          cards={(comp.config.cards as { key: string; title: string; subtitle?: string }[]) ?? []}
          onChange={(cards) => onConfigChange("cards", cards)}
        />
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
