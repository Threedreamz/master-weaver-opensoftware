"use client";
import React, { useState, useCallback, useEffect, lazy, Suspense } from "react";
const STLViewerComponent = lazy(() => import("./STLViewerComponent"));
import { parsePhoneNumberWithError, isValidPhoneNumber, getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";
import type { StepComponent, DisplayRule } from "@opensoftware/openflow-core";
import { isSubFieldVisibleByRules } from "@opensoftware/openflow-core";
import type { ResolvedTheme } from "./FlowRenderer";
import { useRendererStore } from "./rendererStore";
import { calculatePrice, formatPrice, formatPriceRange } from "./priceCalculator";

// ─── Small color util: hex (#RGB / #RRGGBB / with alpha) + alpha → rgba() ──
// Falls back to the input unchanged if parsing fails so callers never crash.

function hexWithAlpha(hex: string, alpha: number): string {
  if (!hex || hex[0] !== "#") return hex;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6 && h.length !== 8) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return hex;
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function humanSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${i === 0 ? n.toFixed(0) : n.toFixed(1)} ${units[i]}`;
}

// ─── Inline SVG color override for data-URL icons ──────────────────────────

function decodeSvgDataUrl(src: string): string | null {
  try {
    if (src.startsWith("data:image/svg+xml,")) {
      return decodeURIComponent(src.replace("data:image/svg+xml,", ""));
    }
    if (src.startsWith("data:image/svg+xml;base64,")) {
      return atob(src.replace("data:image/svg+xml;base64,", ""));
    }
  } catch {}
  return null;
}

function renderColoredIcon(src: string, color: string | undefined, size: string): React.ReactNode {
  const raw = decodeSvgDataUrl(src);
  if (raw && raw.includes("<svg")) {
    let svg = raw;
    if (color) {
      svg = svg.replace(/stroke="[^"]*"/g, `stroke="${color}"`);
      svg = svg.replace(/fill="(?!none)[^"]*"/g, `fill="${color}"`);
    }
    if (size) {
      svg = svg.replace(/width="[^"]*"/, `width="${size}"`);
      svg = svg.replace(/height="[^"]*"/, `height="${size}"`);
    }
    return <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />;
  }
  return <img src={src} alt="" style={{ width: size, height: size, objectFit: "contain" }} />;
}

function isSvgDataUrl(url: string): boolean {
  return url.startsWith("data:image/svg+xml");
}

// ─── Style override resolution ──────────────────────────────────────────────

interface StyleOverrides {
  fontFamily?: string;
  fontSize?: string;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  letterSpacing?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  textAlign?: string;
  lineHeight?: string;
  textTransform?: string;
  iconSize?: string;
  iconColor?: string;
  iconAlignment?: string;
  dividerColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  labelColor?: string;
  placeholderColor?: string;
  selectedColor?: string;
  hoverColor?: string;
}

const FONT_SIZE_MAP: Record<string, string> = {
  xs: "0.75rem", sm: "0.875rem", base: "1rem", lg: "1.125rem",
  xl: "1.25rem", "2xl": "1.5rem", "3xl": "1.875rem", "4xl": "2.25rem",
};

const LINE_HEIGHT_MAP: Record<string, string> = {
  none: "1", tight: "1.25", snug: "1.375", normal: "1.5", relaxed: "1.625", loose: "2",
};

const LETTER_SPACING_MAP: Record<string, string> = {
  tighter: "-0.05em", tight: "-0.025em", normal: "0em", wide: "0.025em", wider: "0.05em", widest: "0.1em",
};

function resolveOverrides(config: Record<string, unknown>): StyleOverrides {
  return (config?.styleOverrides as StyleOverrides) ?? {};
}

function applyTextOverrides(base: React.CSSProperties, overrides: StyleOverrides): React.CSSProperties {
  const result = { ...base };
  if (overrides.fontFamily) result.fontFamily = overrides.fontFamily;
  if (overrides.fontSize) result.fontSize = FONT_SIZE_MAP[overrides.fontSize] ?? overrides.fontSize;
  if (overrides.textColor) result.color = overrides.textColor;
  if (overrides.backgroundColor) result.background = overrides.backgroundColor;
  if (overrides.borderColor) result.borderColor = overrides.borderColor;
  if (overrides.fontWeight) result.fontWeight = overrides.fontWeight;
  if (overrides.fontStyle) result.fontStyle = overrides.fontStyle as React.CSSProperties["fontStyle"];
  if (overrides.textDecoration) result.textDecoration = overrides.textDecoration;
  if (overrides.textAlign) result.textAlign = overrides.textAlign as React.CSSProperties["textAlign"];
  if (overrides.lineHeight) result.lineHeight = LINE_HEIGHT_MAP[overrides.lineHeight] ?? overrides.lineHeight;
  if (overrides.textTransform) result.textTransform = overrides.textTransform as React.CSSProperties["textTransform"];
  if (overrides.letterSpacing) result.letterSpacing = LETTER_SPACING_MAP[overrides.letterSpacing] ?? overrides.letterSpacing;
  return result;
}

function resolveColumns(columns: unknown, itemCount: number): string {
  const n = Number(columns);
  if (!n || n <= 0) {
    // Auto: adapt to item count and available space
    if (itemCount <= 2) return "repeat(2, 1fr)";
    if (itemCount <= 3) return "repeat(3, 1fr)";
    return "repeat(auto-fill, minmax(140px, 1fr))";
  }
  return `repeat(${Math.min(Math.max(n, 1), 12)}, 1fr)`;
}

function resolveSpacing(config: Record<string, unknown>): React.CSSProperties {
  const result: React.CSSProperties = {};
  const mt = config?.marginTop as string;
  const mb = config?.marginBottom as string;
  const width = config?.width as string;
  if (mt && mt !== "0") result.marginTop = `${Number(mt) * 0.25}rem`;
  if (mb && mb !== "0") result.marginBottom = `${Number(mb) * 0.25}rem`;
  if (width === "full") result.width = "100%";
  else if (width === "1/2") result.width = "50%";
  else if (width === "1/3") result.width = "33.333%";
  else if (width === "2/3") result.width = "66.667%";
  return result;
}

// ─── Contact Form (composite) ─────────────────────────────────────────────────

/** EU VAT ID format patterns — country prefix → regex for the part after the prefix. */
const EU_VAT_PATTERNS: Record<string, RegExp> = {
  AT: /^U\d{8}$/, BE: /^\d{10}$/, BG: /^\d{9,10}$/, CY: /^\d{8}[A-Z]$/,
  CZ: /^\d{8,10}$/, DE: /^\d{9}$/, DK: /^\d{8}$/, EE: /^\d{9}$/,
  EL: /^\d{9}$/, ES: /^[A-Z0-9]\d{7}[A-Z0-9]$/, FI: /^\d{8}$/, FR: /^[A-Z0-9]{2}\d{9}$/,
  HR: /^\d{11}$/, HU: /^\d{8}$/, IE: /^\d{7}[A-Z]{1,2}$/, IT: /^\d{11}$/,
  LT: /^\d{9}(\d{3})?$/, LU: /^\d{8}$/, LV: /^\d{11}$/, MT: /^\d{8}$/,
  NL: /^\d{9}B\d{2}$/, PL: /^\d{10}$/, PT: /^\d{9}$/, RO: /^\d{2,10}$/,
  SE: /^\d{12}$/, SI: /^\d{8}$/, SK: /^\d{10}$/,
};

const ADDRESS_COUNTRIES = [
  { code: "DE", name: "Deutschland" }, { code: "AT", name: "Österreich" },
  { code: "CH", name: "Schweiz" }, { code: "FR", name: "Frankreich" },
  { code: "IT", name: "Italien" }, { code: "ES", name: "Spanien" },
  { code: "NL", name: "Niederlande" }, { code: "BE", name: "Belgien" },
  { code: "PL", name: "Polen" }, { code: "SE", name: "Schweden" },
  { code: "DK", name: "Dänemark" }, { code: "NO", name: "Norwegen" },
  { code: "US", name: "USA" }, { code: "GB", name: "Großbritannien" },
];

function validateVatId(vatId: string): { valid: boolean; country: string | null; message: string } {
  const raw = vatId.trim().toUpperCase().replace(/[\s\-\.]/g, "");
  if (!raw || raw.length < 4) return { valid: false, country: null, message: "" };
  const prefix = raw.slice(0, 2);
  const rest = raw.slice(2);
  const pattern = EU_VAT_PATTERNS[prefix];
  if (!pattern) return { valid: false, country: null, message: "Unbekanntes Länderprefix" };
  return pattern.test(rest)
    ? { valid: true, country: prefix, message: "Format gültig" }
    : { valid: false, country: prefix, message: `Ungültiges Format für ${prefix}` };
}

function ShippingToggle({ checked, onChange, textColor, accentColor }: { checked: boolean; onChange: (v: boolean) => void; textColor: string; accentColor: string }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.8125rem", color: textColor, marginTop: "0.25rem" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor }} />
      <span>Lieferadresse weicht von Rechnungsadresse ab</span>
    </label>
  );
}

interface ContactFormConfig {
  showFirstName?: boolean;
  showLastName?: boolean;
  showEmail?: boolean;
  showPhone?: boolean;
  showCompany?: boolean;
  showVatId?: boolean;
  showBillingAddress?: boolean;
  checkboxes?: Array<{ id: string; label: string; required: boolean }>;
}

type CFValue = Record<string, unknown>;

function ContactFormRenderer({
  component,
  value,
  error,
  onChange,
  theme,
  overrides,
  inputStyle,
  stepId,
  displayRules,
  answers,
}: {
  component: StepComponent;
  value: CFValue;
  error?: string;
  onChange: (val: unknown) => void;
  theme: ResolvedTheme;
  overrides: StyleOverrides;
  inputStyle: React.CSSProperties;
  stepId?: string;
  displayRules?: DisplayRule[];
  answers?: Record<string, unknown>;
}) {
  const cfg = component.config as ContactFormConfig;
  const ruleVisible = (key: string) =>
    !stepId || !displayRules
      ? true
      : isSubFieldVisibleByRules(component.id, stepId, key, displayRules, answers ?? {});
  const up = (field: string, val: unknown) => onChange({ ...value, [field]: val });

  // Phone state
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>((value.phoneCountry as CountryCode) || "DE");
  const [phoneLocal, setPhoneLocal] = useState<string>((value.phoneLocal as string) || "");
  const [phoneState, setPhoneState] = useState<"idle" | "valid" | "invalid">("idle");

  const validatePhone = useCallback((num: string, cc: CountryCode) => {
    if (!num) { setPhoneState("idle"); up("phone", ""); up("phoneValid", false); return; }
    const full = `+${getCountryCallingCode(cc)}${num.replace(/\D/g, "")}`;
    try {
      const parsed = parsePhoneNumberWithError(full, cc);
      if (parsed && isValidPhoneNumber(full, cc)) {
        setPhoneState("valid");
        const formatted = parsed.formatInternational();
        up("phone", formatted); up("phoneValid", true); up("phoneLocal", num); up("phoneCountry", cc);
      } else {
        setPhoneState("invalid");
        up("phone", full); up("phoneValid", false);
      }
    } catch {
      setPhoneState("invalid");
      up("phone", full); up("phoneValid", false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, onChange]);

  // VAT state
  const [vatState, setVatState] = useState<{ valid: boolean; message: string }>({ valid: false, message: "" });
  const [vatChecking, setVatChecking] = useState(false);

  function handleVatChange(raw: string) {
    up("vatId", raw);
    if (raw.length > 3) {
      const result = validateVatId(raw);
      setVatState({ valid: result.valid, message: result.message });
      // Cross-check with billing country
      if (result.valid && result.country && value.billingCountry && result.country !== value.billingCountry) {
        setVatState({ valid: false, message: `VAT-Land (${result.country}) stimmt nicht mit Rechnungsland (${value.billingCountry}) überein` });
      }
    } else {
      setVatState({ valid: false, message: "" });
    }
  }

  async function checkVies() {
    const vatId = (value.vatId as string || "").trim().toUpperCase().replace(/[\s\-\.]/g, "");
    if (vatId.length < 4) return;
    const prefix = vatId.slice(0, 2);
    const number = vatId.slice(2);
    setVatChecking(true);
    try {
      const r = await fetch(`/api/vat-check?country=${prefix}&vat=${number}`);
      const data = await r.json() as { valid: boolean; name?: string; address?: string };
      if (data.valid) {
        setVatState({ valid: true, message: data.name ? `Gültig: ${data.name}` : "VIES: Gültig ✓" });
        up("vatIdVerified", true); up("vatCompanyName", data.name ?? "");
      } else {
        setVatState({ valid: false, message: "VIES: Nicht gefunden oder ungültig" });
        up("vatIdVerified", false);
      }
    } catch {
      setVatState({ valid: false, message: "VIES-Prüfung fehlgeschlagen" });
    }
    setVatChecking(false);
  }

  const fieldBorder = (hasError?: boolean, isValid?: boolean) =>
    hasError ? theme.errorColor : isValid ? "#22c55e" : (theme.borderColor ?? "#e5e7eb");

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.8125rem",
    fontWeight: 500,
    marginBottom: "0.25rem",
    color: overrides.textColor || theme.textColor,
  };
  const inp = (extra?: React.CSSProperties): React.CSSProperties => ({
    ...inputStyle,
    width: "100%",
    boxSizing: "border-box",
    ...extra,
  });

  const showFirst = cfg.showFirstName !== false && ruleVisible("firstName");
  const showLast = cfg.showLastName !== false && ruleVisible("lastName");
  const showEmail = cfg.showEmail !== false && ruleVisible("email");
  const showPhone = cfg.showPhone !== false && ruleVisible("phone");

  return (
    <div className="openflow-contact-form" style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
      {/* Name row */}
      {(showFirst || showLast) && (
        <div style={{ display: "grid", gridTemplateColumns: showFirst && showLast ? "1fr 1fr" : "1fr", gap: "0.75rem" }}>
          {showFirst && (
            <div>
              <label style={labelStyle}>Vorname</label>
              <input
                type="text"
                value={(value.firstName as string) || ""}
                onChange={(e) => up("firstName", e.target.value)}
                placeholder="Vorname"
                style={inp({ borderColor: fieldBorder() })}
              />
            </div>
          )}
          {showLast && (
            <div>
              <label style={labelStyle}>Nachname</label>
              <input
                type="text"
                value={(value.lastName as string) || ""}
                onChange={(e) => up("lastName", e.target.value)}
                placeholder="Nachname"
                style={inp({ borderColor: fieldBorder() })}
              />
            </div>
          )}
        </div>
      )}

      {/* Email */}
      {showEmail && (
        <div>
          <label style={labelStyle}>E-Mail Adresse</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: theme.textMuted ?? "#9ca3af", fontSize: "1rem", pointerEvents: "none" }}>✉</span>
            <input
              type="email"
              value={(value.email as string) || ""}
              onChange={(e) => up("email", e.target.value)}
              placeholder="E-Mail Adresse"
              style={inp({ paddingLeft: "2.25rem", borderColor: fieldBorder() })}
            />
          </div>
        </div>
      )}

      {/* Phone */}
      {showPhone && (
        <div>
          <label style={labelStyle}>Telefonnummer</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <select
              value={phoneCountry}
              onChange={(e) => { const cc = e.target.value as CountryCode; setPhoneCountry(cc); validatePhone(phoneLocal, cc); }}
              style={{ padding: "0 0.5rem", border: `1px solid ${fieldBorder(false, phoneState === "valid")}`, borderRadius: inputStyle.borderRadius ?? "0.5rem", background: theme.inputBackground, color: overrides.textColor || theme.textColor, flexShrink: 0, fontSize: "0.9rem", cursor: "pointer", minWidth: "5.5rem" }}
            >
              {(["DE","AT","CH","US","GB","FR","IT","ES","NL","PL","BE","PT","SE","DK","NO","FI"] as CountryCode[]).map((cc) => (
                <option key={cc} value={cc}>
                  {`${({"DE":"🇩🇪","AT":"🇦🇹","CH":"🇨🇭","US":"🇺🇸","GB":"🇬🇧","FR":"🇫🇷","IT":"🇮🇹","ES":"🇪🇸","NL":"🇳🇱","PL":"🇵🇱","BE":"🇧🇪","PT":"🇵🇹","SE":"🇸🇪","DK":"🇩🇰","NO":"🇳🇴","FI":"🇫🇮"} as Record<string,string>)[cc] ?? ""} +${String(getCountryCallingCode(cc))}`}
                </option>
              ))}
            </select>
            <div style={{ position: "relative", flex: 1 }}>
              <input
                type="tel"
                value={phoneLocal}
                onChange={(e) => { setPhoneLocal(e.target.value); validatePhone(e.target.value, phoneCountry); }}
                placeholder="Telefonnummer"
                style={inp({ borderColor: fieldBorder(phoneState === "invalid", phoneState === "valid"), paddingRight: phoneState !== "idle" ? "2rem" : undefined })}
              />
              {phoneState === "valid" && <span style={{ position: "absolute", right: "0.625rem", top: "50%", transform: "translateY(-50%)", color: "#22c55e" }}>✓</span>}
              {phoneState === "invalid" && <span style={{ position: "absolute", right: "0.625rem", top: "50%", transform: "translateY(-50%)", color: theme.errorColor }}>✗</span>}
            </div>
          </div>
          {phoneState === "invalid" && <p style={{ color: theme.errorColor, fontSize: "0.75rem", marginTop: "0.25rem" }}>Ungültige Telefonnummer</p>}
          {phoneState === "valid" && <p style={{ color: "#22c55e", fontSize: "0.75rem", marginTop: "0.25rem" }}>Gültige Telefonnummer ✓</p>}
        </div>
      )}

      {/* Company */}
      {cfg.showCompany && ruleVisible("company") && (
        <div>
          <label style={labelStyle}>Unternehmen</label>
          <input
            type="text"
            value={(value.company as string) || ""}
            onChange={(e) => up("company", e.target.value)}
            placeholder="Firmenname"
            style={inp({ borderColor: fieldBorder() })}
          />
        </div>
      )}

      {/* VAT ID */}
      {cfg.showVatId && ruleVisible("vatId") && (
        <div>
          <label style={labelStyle}>Umsatzsteuer-ID</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <input
                type="text"
                value={(value.vatId as string) || ""}
                onChange={(e) => handleVatChange(e.target.value)}
                placeholder="DE123456789"
                style={inp({ borderColor: fieldBorder(!vatState.valid && !!vatState.message, vatState.valid), paddingRight: vatState.message ? "2rem" : undefined, textTransform: "uppercase" })}
              />
              {vatState.message && vatState.valid && <span style={{ position: "absolute", right: "0.625rem", top: "50%", transform: "translateY(-50%)", color: "#22c55e" }}>✓</span>}
              {vatState.message && !vatState.valid && <span style={{ position: "absolute", right: "0.625rem", top: "50%", transform: "translateY(-50%)", color: theme.errorColor }}>✗</span>}
            </div>
            <button
              type="button"
              onClick={checkVies}
              disabled={vatChecking || !value.vatId}
              style={{ padding: "0 0.875rem", fontSize: "0.75rem", fontWeight: 600, background: theme.primaryColor, color: "#fff", border: "none", borderRadius: inputStyle.borderRadius ?? "0.5rem", cursor: "pointer", opacity: vatChecking || !value.vatId ? 0.5 : 1, whiteSpace: "nowrap" }}
            >
              {vatChecking ? "Prüfe…" : "VIES prüfen"}
            </button>
          </div>
          {vatState.message && (
            <p style={{ fontSize: "0.75rem", marginTop: "0.25rem", color: vatState.valid ? "#22c55e" : theme.errorColor }}>{vatState.message}</p>
          )}
        </div>
      )}

      {/* Billing address */}
      {cfg.showBillingAddress && ruleVisible("billingAddress") && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Rechnungsadresse</label>
          <input type="text" value={(value.billingStreet as string) || ""} onChange={(e) => up("billingStreet", e.target.value)} placeholder="Straße und Hausnummer" style={inp({ borderColor: fieldBorder() })} />
          <div style={{ display: "grid", gridTemplateColumns: "8rem 1fr", gap: "0.5rem" }}>
            <input type="text" value={(value.billingZip as string) || ""} onChange={(e) => up("billingZip", e.target.value)} placeholder="PLZ" style={inp({ borderColor: fieldBorder() })} />
            <input type="text" value={(value.billingCity as string) || ""} onChange={(e) => up("billingCity", e.target.value)} placeholder="Stadt" style={inp({ borderColor: fieldBorder() })} />
          </div>
          <select
            value={(value.billingCountry as string) || "DE"}
            onChange={(e) => { up("billingCountry", e.target.value); if (value.vatId) handleVatChange(value.vatId as string); }}
            style={{ ...inp(), color: overrides.textColor || theme.textColor, cursor: "pointer" }}
          >
            {ADDRESS_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>

          {/* Shipping address toggle */}
          <ShippingToggle
            checked={(value.shippingDifferent as boolean | undefined) ?? false}
            onChange={(v) => up("shippingDifferent", v)}
            textColor={overrides.textColor ?? theme.textColor}
            accentColor={theme.selectionColor}
          />

          {!!(value.shippingDifferent as boolean | undefined) && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", paddingTop: "0.375rem", borderTop: `1px solid ${theme.borderColor ?? "#e5e7eb"}` }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Lieferadresse</label>
              <input type="text" value={(value.shippingStreet as string) || ""} onChange={(e) => up("shippingStreet", e.target.value)} placeholder="Straße und Hausnummer" style={inp({ borderColor: fieldBorder() })} />
              <div style={{ display: "grid", gridTemplateColumns: "8rem 1fr", gap: "0.5rem" }}>
                <input type="text" value={(value.shippingZip as string) || ""} onChange={(e) => up("shippingZip", e.target.value)} placeholder="PLZ" style={inp({ borderColor: fieldBorder() })} />
                <input type="text" value={(value.shippingCity as string) || ""} onChange={(e) => up("shippingCity", e.target.value)} placeholder="Stadt" style={inp({ borderColor: fieldBorder() })} />
              </div>
              <select
                value={(value.shippingCountry as string) || "DE"}
                onChange={(e) => up("shippingCountry", e.target.value)}
                style={{ ...inp(), color: overrides.textColor || theme.textColor, cursor: "pointer" }}
              >
                {ADDRESS_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Configurable checkboxes */}
      {(cfg.checkboxes ?? []).filter((cb) => ruleVisible(`cb:${cb.id}`)).map((cb) => (
        <label key={cb.id} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", cursor: "pointer", fontSize: "0.875rem", color: overrides.textColor || theme.textColor, lineHeight: "1.4" }}>
          <input
            type="checkbox"
            checked={!!((value.checkboxes as Record<string, boolean> | undefined)?.[cb.id])}
            onChange={(e) => up("checkboxes", { ...(value.checkboxes as Record<string, boolean> || {}), [cb.id]: e.target.checked })}
            style={{ accentColor: theme.selectionColor, marginTop: "0.15rem", flexShrink: 0 }}
          />
          <span>{cb.label}{cb.required && <span style={{ color: theme.errorColor }}> *</span>}</span>
        </label>
      ))}

      {error && <p style={{ color: theme.errorColor, fontSize: "0.8125rem" }}>{error}</p>}
    </div>
  );
}

// ─── Phone Input with country code + live validation ─────────────────────────

const POPULAR_COUNTRIES: CountryCode[] = ["DE", "AT", "CH", "US", "GB", "FR", "IT", "ES", "NL", "PL", "BE", "PT", "SE", "DK", "NO", "FI"];

const COUNTRY_NAMES: Partial<Record<CountryCode, string>> = {
  DE: "Deutschland", AT: "Österreich", CH: "Schweiz", US: "USA", GB: "UK",
  FR: "Frankreich", IT: "Italien", ES: "Spanien", NL: "Niederlande", PL: "Polen",
  BE: "Belgien", PT: "Portugal", SE: "Schweden", DK: "Dänemark", NO: "Norwegen", FI: "Finnland",
};

const COUNTRY_FLAGS: Partial<Record<CountryCode, string>> = {
  DE: "🇩🇪", AT: "🇦🇹", CH: "🇨🇭", US: "🇺🇸", GB: "🇬🇧", FR: "🇫🇷",
  IT: "🇮🇹", ES: "🇪🇸", NL: "🇳🇱", PL: "🇵🇱", BE: "🇧🇪", PT: "🇵🇹",
  SE: "🇸🇪", DK: "🇩🇰", NO: "🇳🇴", FI: "🇫🇮",
};

function PhoneInputField({
  component,
  value,
  error,
  onChange,
  style,
  theme,
}: {
  component: StepComponent;
  value: string;
  error?: string;
  onChange: (val: string, valid: boolean) => void;
  style: React.CSSProperties;
  theme: ResolvedTheme;
}) {
  const [country, setCountry] = useState<CountryCode>("DE");
  const [localNumber, setLocalNumber] = useState(value || "");
  const [validationState, setValidationState] = useState<"idle" | "valid" | "invalid">("idle");
  const [validationMessage, setValidationMessage] = useState("");

  const validate = useCallback((num: string, cc: CountryCode) => {
    if (!num) { setValidationState("idle"); setValidationMessage(""); onChange("", false); return; }
    const full = `+${getCountryCallingCode(cc)}${num.replace(/\D/g, "")}`;
    try {
      const parsed = parsePhoneNumberWithError(full, cc);
      if (parsed && isValidPhoneNumber(full, cc)) {
        setValidationState("valid");
        setValidationMessage("");
        onChange(parsed.formatInternational(), true);
      } else {
        setValidationState("invalid");
        setValidationMessage("Ungültige Telefonnummer");
        onChange(full, false);
      }
    } catch {
      setValidationState("invalid");
      setValidationMessage("Ungültige Telefonnummer");
      onChange(full, false);
    }
  }, [onChange]);

  const borderColor = validationState === "valid"
    ? "#22c55e"
    : validationState === "invalid" || error
    ? theme.errorColor
    : theme.borderColor;

  return (
    <div>
      {component.label && (
        <label style={{ display: "block", fontWeight: 500, marginBottom: "0.375rem", fontSize: "0.9375rem" }}>
          {component.label}
          {component.required && <span style={{ color: theme.errorColor }}> *</span>}
        </label>
      )}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        {/* Country selector */}
        <select
          value={country}
          onChange={(e) => {
            const cc = e.target.value as CountryCode;
            setCountry(cc);
            validate(localNumber, cc);
          }}
          style={{
            padding: "0.625rem 0.5rem",
            border: `1px solid ${borderColor}`,
            borderRadius: "0.5rem",
            fontSize: "0.9375rem",
            background: theme.inputBackground,
            color: theme.textColor,
            flexShrink: 0,
            cursor: "pointer",
          }}
        >
          {POPULAR_COUNTRIES.map((cc) => (
            <option key={cc} value={cc}>
              {COUNTRY_FLAGS[cc]} +{getCountryCallingCode(cc)} {COUNTRY_NAMES[cc] ?? cc}
            </option>
          ))}
        </select>

        {/* Phone number input */}
        <div style={{ position: "relative", flex: 1 }}>
          <input
            type="tel"
            value={localNumber}
            onChange={(e) => {
              setLocalNumber(e.target.value);
              validate(e.target.value, country);
            }}
            placeholder={(component.config as { placeholder?: string }).placeholder || "Telefonnummer"}
            style={{ ...style, borderColor, paddingRight: validationState !== "idle" ? "2.5rem" : undefined }}
          />
          {/* Validation icon */}
          {validationState === "valid" && (
            <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#22c55e", fontSize: "1.1rem" }}>✓</span>
          )}
          {validationState === "invalid" && (
            <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", color: theme.errorColor, fontSize: "1.1rem" }}>✗</span>
          )}
        </div>
      </div>

      {/* Validation message */}
      {(validationState === "invalid" || error) && (
        <p style={{ color: theme.errorColor, fontSize: "0.8125rem", marginTop: "0.25rem" }}>
          {validationMessage || error}
        </p>
      )}
      {validationState === "valid" && (
        <p style={{ color: "#22c55e", fontSize: "0.8125rem", marginTop: "0.25rem" }}>
          Gültige Telefonnummer ✓
        </p>
      )}
    </div>
  );
}

// ─── Shake animation CSS ────────────────────────────────────────────────────

const OPENFLOW_SHAKE_CSS = `
@keyframes openflow-shake {
  0%, 100% { transform: translateX(0); }
  15% { transform: translateX(-6px); }
  30% { transform: translateX(6px); }
  45% { transform: translateX(-4px); }
  60% { transform: translateX(4px); }
  75% { transform: translateX(-2px); }
  90% { transform: translateX(2px); }
}
.openflow-shake { animation: openflow-shake 0.5s ease-in-out; }
`;

// ─── CardSelectorWidget (extracted for useState hooks) ──────────────────────

function CardSelectorWidget({
  component,
  value,
  error,
  onChange,
  primaryColor,
  overrides,
  theme,
  wrapStyle,
  labelStyle,
}: {
  component: StepComponent;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
  primaryColor: string;
  overrides: StyleOverrides;
  theme: ResolvedTheme;
  wrapStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
}) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (error) {
      setShaking(true);
      const t = setTimeout(() => setShaking(false), 600);
      return () => clearTimeout(t);
    }
  }, [error]);

  const config = component.config as {
    selectionMode?: "single" | "multiple";
    columns?: number;
    cards?: Array<{ key: string; title: string; subtitle?: string; icon?: string; imageUrl?: string }>;
    style?: "bordered" | "filled" | "minimal";
  };
  const selected = (value as string | string[]) || (config.selectionMode === "multiple" ? [] : "");
  const isSelected = (key: string) =>
    config.selectionMode === "multiple"
      ? Array.isArray(selected) && selected.includes(key)
      : selected === key;

  const handleSelect = (key: string) => {
    if (config.selectionMode === "multiple") {
      const arr = Array.isArray(selected) ? selected : [];
      onChange(isSelected(key) ? arr.filter((k) => k !== key) : [...arr, key]);
    } else {
      onChange(isSelected(key) ? "" : key);
    }
  };

  const cardStyle = config.style || "bordered";
  const iconSize = overrides.iconSize || "1.75rem";
  const iconColor = overrides.iconColor || primaryColor;
  const selectedColor = overrides.selectedColor || theme.selectionColor;
  const hoverColor = overrides.hoverColor;
  const contentAlign = (overrides.iconAlignment as React.CSSProperties["textAlign"]) ?? "center";
  const elevatedVariant = theme.cardVariant === "elevated";

  return (
    <div style={wrapStyle}>
      <style dangerouslySetInnerHTML={{ __html: OPENFLOW_SHAKE_CSS }} />
      {component.label && (
        <label style={{ ...labelStyle, marginBottom: "0.75rem" }}>
          {component.label}
          {component.required && <span style={{ color: theme.errorColor }}> *</span>}
        </label>
      )}
      <div
        className={shaking ? "openflow-shake" : undefined}
        style={{
          display: "grid",
          gridTemplateColumns: resolveColumns(config.columns, (config.cards || []).length),
          gap: "0.75rem",
        }}
      >
        {(config.cards || []).map((card) => {
          const sel = isSelected(card.key);
          const hovered = hoveredCard === card.key;
          const borderColor = sel
            ? selectedColor
            : hovered && hoverColor
            ? hoverColor
            : overrides.borderColor || theme.borderColor;
          const bg = sel
            ? `${selectedColor}15`
            : hovered && hoverColor
            ? `${hoverColor}10`
            : cardStyle === "filled"
            ? (overrides.backgroundColor || theme.surfaceColor)
            : theme.surfaceColor;
          const boxShadow = cardStyle === "minimal"
            ? (sel ? `0 0 0 2px ${selectedColor}` : undefined)
            : elevatedVariant
              ? (sel
                  ? `0 4px 12px ${hexWithAlpha(selectedColor, 0.18)}`
                  : "0 2px 6px rgba(0,0,0,0.06)")
              : undefined;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => handleSelect(card.key)}
              onMouseEnter={() => setHoveredCard(card.key)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                padding: "1.25rem",
                border: cardStyle === "minimal" ? "none" : `2px solid ${borderColor}`,
                borderRadius: "0.75rem",
                background: bg,
                cursor: "pointer",
                textAlign: contentAlign,
                transition: "transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease, background 150ms ease",
                boxShadow,
                transform: elevatedVariant && sel ? "translateY(-1px)" : undefined,
              }}
            >
              {(card.imageUrl || card.icon) && (
                <div style={{ fontSize: iconSize, marginBottom: "0.5rem", color: iconColor, lineHeight: 1, display: "flex", justifyContent: contentAlign === "center" ? "center" : contentAlign === "right" ? "flex-end" : "flex-start" }}>
                  {card.imageUrl ? (
                    isSvgDataUrl(card.imageUrl) ? renderColoredIcon(card.imageUrl, iconColor, iconSize) : <img src={card.imageUrl} alt="" style={{ width: iconSize, height: iconSize, objectFit: "contain" }} />
                  ) : (
                    card.icon
                  )}
                </div>
              )}
              <div style={{ fontWeight: 600, fontSize: "0.9375rem", color: overrides.textColor || theme.textColor }}>{card.title}</div>
              {card.subtitle && (
                <div style={{ fontSize: "0.8125rem", color: theme.textMuted, marginTop: "0.25rem" }}>
                  {card.subtitle}
                </div>
              )}
            </button>
          );
        })}
      </div>
      {error && (
        <p style={{ color: theme.errorColor, fontSize: "0.8125rem", marginTop: "0.5rem" }}>{error}</p>
      )}
    </div>
  );
}

// ─── ImageChoiceWidget (extracted for useState hooks) ───────────────────────

function ImageChoiceWidget({
  component,
  value,
  error,
  onChange,
  primaryColor,
  overrides,
  theme,
  wrapStyle,
  labelStyle,
}: {
  component: StepComponent;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
  primaryColor: string;
  overrides: StyleOverrides;
  theme: ResolvedTheme;
  wrapStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
}) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (error) {
      setShaking(true);
      const t = setTimeout(() => setShaking(false), 600);
      return () => clearTimeout(t);
    }
  }, [error]);

  const config = component.config as {
    selectionMode?: "single" | "multiple";
    columns?: number;
    options?: Array<{ value: string; label: string; subtitle?: string; subtitleColor?: string; imageUrl?: string }>;
  };
  const selected = (value as string | string[]) || (config.selectionMode === "multiple" ? [] : "");
  const isSelected = (key: string) =>
    config.selectionMode === "multiple"
      ? Array.isArray(selected) && selected.includes(key)
      : selected === key;

  const handleSelect = (key: string) => {
    if (config.selectionMode === "multiple") {
      const arr = Array.isArray(selected) ? selected : [];
      onChange(isSelected(key) ? arr.filter((k) => k !== key) : [...arr, key]);
    } else {
      onChange(isSelected(key) ? "" : key);
    }
  };

  const selectedColor = overrides.selectedColor || theme.selectionColor;
  const hoverColor = overrides.hoverColor;
  const elevatedVariant = theme.cardVariant === "elevated";

  return (
    <div style={wrapStyle}>
      <style dangerouslySetInnerHTML={{ __html: OPENFLOW_SHAKE_CSS }} />
      {component.label && (
        <label style={{ ...labelStyle, marginBottom: "0.75rem" }}>
          {component.label}
          {component.required && <span style={{ color: theme.errorColor }}> *</span>}
        </label>
      )}
      <div
        className={shaking ? "openflow-shake" : undefined}
        style={{
          display: "grid",
          gridTemplateColumns: resolveColumns(config.columns, (config.options || []).length),
          gap: "0.75rem",
        }}
      >
        {(config.options || []).map((opt) => {
          const sel = isSelected(opt.value);
          const hovered = hoveredCard === opt.value;
          const borderColor = sel
            ? selectedColor
            : hovered && hoverColor
            ? hoverColor
            : overrides.borderColor || theme.borderColor;
          const bg = sel
            ? `${selectedColor}15`
            : hovered && hoverColor
            ? `${hoverColor}10`
            : theme.surfaceColor;
          const boxShadow = elevatedVariant
            ? (sel
                ? `0 4px 12px ${hexWithAlpha(selectedColor, 0.18)}`
                : "0 2px 6px rgba(0,0,0,0.06)")
            : undefined;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              onMouseEnter={() => setHoveredCard(opt.value)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                border: `2px solid ${borderColor}`,
                borderRadius: "0.75rem",
                background: bg,
                cursor: "pointer",
                overflow: "hidden",
                transition: "transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease, background 150ms ease",
                boxShadow,
                transform: elevatedVariant && sel ? "translateY(-1px)" : undefined,
              }}
            >
              {opt.imageUrl && (
                <div style={{ height: overrides.iconSize || "8rem", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", padding: "0.5rem" }}>
                  {isSvgDataUrl(opt.imageUrl) ? renderColoredIcon(opt.imageUrl, overrides.iconColor, overrides.iconSize || "3rem") : <img src={opt.imageUrl} alt={opt.label} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />}
                </div>
              )}
              <div style={{ padding: "0.75rem", textAlign: (overrides.iconAlignment as React.CSSProperties["textAlign"]) ?? "center" }}>
                <div style={{ fontWeight: 500, fontSize: "0.875rem", color: overrides.textColor || theme.textColor }}>
                  {opt.label}
                </div>
                {opt.subtitle && (
                  <div style={{ fontSize: "0.8125rem", marginTop: "0.25rem", lineHeight: 1.4, color: opt.subtitleColor || theme.textMuted }}>
                    {opt.subtitle}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {error && (
        <p style={{ color: theme.errorColor, fontSize: "0.8125rem", marginTop: "0.5rem" }}>{error}</p>
      )}
    </div>
  );
}

// ─── RadioGroupWidget (extracted for useState shake hooks) ─────────────────

function RadioGroupWidget({
  component,
  value,
  error,
  onChange,
  primaryColor,
  overrides,
  theme,
  wrapStyle,
  labelStyle,
}: {
  component: StepComponent;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
  primaryColor: string;
  overrides: StyleOverrides;
  theme: ResolvedTheme;
  wrapStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
}) {
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (error) {
      setShaking(true);
      const t = setTimeout(() => setShaking(false), 600);
      return () => clearTimeout(t);
    }
  }, [error]);

  const config = component.config as {
    options?: Array<{ value: string; label: string }>;
    layout?: "vertical" | "horizontal" | "grid";
  };
  const layout = config.layout || "vertical";

  return (
    <div style={wrapStyle}>
      <style dangerouslySetInnerHTML={{ __html: OPENFLOW_SHAKE_CSS }} />
      {component.label && (
        <label style={{ ...labelStyle, marginBottom: "0.75rem" }}>
          {component.label}
          {component.required && <span style={{ color: theme.errorColor }}> *</span>}
        </label>
      )}
      <div
        className={shaking ? "openflow-shake" : undefined}
        style={{
          display: layout === "grid" ? "grid" : "flex",
          flexDirection: layout === "horizontal" ? "row" : "column",
          gridTemplateColumns: layout === "grid" ? "repeat(2, 1fr)" : undefined,
          gap: "0.5rem",
          flexWrap: layout === "horizontal" ? "wrap" : undefined,
        }}
      >
        {(config.options || []).map((opt) => (
          <label
            key={opt.value}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", color: overrides.textColor || theme.textColor }}
          >
            <input
              type="radio"
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              style={{ accentColor: theme.selectionColor }}
            />
            {opt.label}
          </label>
        ))}
      </div>
      {error && (
        <p style={{ color: theme.errorColor, fontSize: "0.8125rem", marginTop: "0.25rem" }}>{error}</p>
      )}
    </div>
  );
}

// ─── FileUploadWidget ───────────────────────────────────────────────────────

type UploadedFile = { id: string; url: string; name: string; size: number; type: string };

function FileUploadWidget({
  component,
  value,
  error,
  onChange,
  overrides,
  theme,
  wrapStyle,
  labelStyle,
}: {
  component: StepComponent;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
  overrides: StyleOverrides;
  theme: ResolvedTheme;
  wrapStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
}) {
  const config = component.config as {
    description?: string;
    maxFiles?: number;
    maxFileSizeMb?: number;
    acceptBundle?: string;
  };
  const ACCEPT_BUNDLE_MAP: Record<string, string> = {
    images: "image/*",
    images_pdf: "image/*,application/pdf",
    all_media: "image/*,video/*,application/pdf",
    all: "image/*,video/*,application/pdf,.dwg,.zip,application/zip",
  };
  const FORMAT_LABEL: Record<string, string> = {
    images: "jpg, png, gif, webp",
    images_pdf: "Bilder + PDF",
    all_media: "Bilder, Videos, PDF",
    all: "Bilder, Videos, PDF, DWG, ZIP u.v.m.",
  };
  const acceptBundle = config.acceptBundle ?? "images_pdf";
  const acceptStr = ACCEPT_BUNDLE_MAP[acceptBundle] ?? "image/*,application/pdf";
  const formatText = FORMAT_LABEL[acceptBundle] ?? "Bilder + PDF";
  const maxSizeMb = config.maxFileSizeMb ?? 10;
  const maxSize = maxSizeMb * 1024 * 1024;
  const multiple = (config.maxFiles ?? 3) > 1;

  const existing: UploadedFile[] = Array.isArray(value)
    ? (value as UploadedFile[]).filter((v) => v && typeof v === "object" && "url" in v)
    : [];

  const [uploading, setUploading] = useState<string[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function uploadOne(file: File): Promise<UploadedFile | null> {
    if (file.size > maxSize) {
      setLocalError(`"${file.name}" ist größer als ${maxSizeMb} MB.`);
      return null;
    }
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({ error: "Upload fehlgeschlagen" }))) as {
          error?: string;
        };
        setLocalError(err.error || "Upload fehlgeschlagen");
        return null;
      }
      return (await res.json()) as UploadedFile;
    } catch {
      setLocalError("Netzwerkfehler beim Upload");
      return null;
    }
  }

  async function handleFiles(files: FileList | File[] | null) {
    if (!files) return;
    setLocalError(null);
    const list = Array.from(files);
    setUploading((prev) => [...prev, ...list.map((f) => f.name)]);
    const results: UploadedFile[] = [];
    for (const f of list) {
      const uploaded = await uploadOne(f);
      if (uploaded) results.push(uploaded);
      setUploading((prev) => {
        const idx = prev.indexOf(f.name);
        if (idx === -1) return prev;
        const next = prev.slice();
        next.splice(idx, 1);
        return next;
      });
    }
    if (results.length > 0) {
      onChange([...existing, ...results]);
    }
  }

  function removeFile(id: string) {
    onChange(existing.filter((f) => f.id !== id));
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    void handleFiles(e.dataTransfer.files);
  }

  return (
    <div style={wrapStyle}>
      {component.label && (
        <label style={labelStyle}>
          {component.label}
          {component.required && <span style={{ color: theme.errorColor }}> *</span>}
        </label>
      )}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{
          display: "block",
          border: `2px dashed ${dragOver ? theme.primaryColor : overrides.borderColor || theme.borderColor}`,
          borderRadius: "0.75rem",
          padding: "1.5rem",
          textAlign: "center",
          color: theme.textMuted,
          fontSize: "0.875rem",
          background: dragOver
            ? hexWithAlpha(theme.primaryColor, 0.06)
            : overrides.backgroundColor || theme.surfaceColor,
          cursor: "pointer",
          transition: "background 150ms ease, border-color 150ms ease",
        }}
      >
        <input
          type="file"
          accept={acceptStr}
          multiple={multiple}
          style={{ display: "none" }}
          onChange={(e) => {
            const files = e.target.files;
            void handleFiles(files);
            // reset input so the same file can be re-selected after removal
            e.target.value = "";
          }}
        />
        <div style={{ marginBottom: "0.5rem" }}>📎 Datei hierher ziehen oder klicken</div>
        {config.description && (
          <p style={{ fontSize: "0.75rem", color: theme.textMuted }}>{config.description}</p>
        )}
        <p style={{ fontSize: "0.75rem", color: theme.textMuted, marginTop: "0.25rem" }}>
          {formatText} · Max. {maxSizeMb} MB, bis zu {config.maxFiles || 3} Dateien
        </p>
      </label>

      {/* Uploading spinners */}
      {uploading.length > 0 && (
        <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {uploading.map((name) => (
            <div
              key={name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.8125rem",
                color: theme.textMuted,
              }}
            >
              <span style={{
                display: "inline-block",
                width: "0.75rem",
                height: "0.75rem",
                borderRadius: "50%",
                border: `2px solid ${hexWithAlpha(theme.primaryColor, 0.3)}`,
                borderTopColor: theme.primaryColor,
                animation: "openflow-spin 700ms linear infinite",
              }} />
              <span>{name}</span>
            </div>
          ))}
          <style dangerouslySetInnerHTML={{ __html: `@keyframes openflow-spin { to { transform: rotate(360deg); } }` }} />
        </div>
      )}

      {/* Uploaded files list */}
      {existing.length > 0 && (
        <ul style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.25rem", padding: 0, listStyle: "none" }}>
          {existing.map((f) => (
            <li
              key={f.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.8125rem",
                padding: "0.375rem 0.5rem",
                background: hexWithAlpha(theme.primaryColor, 0.05),
                borderRadius: "0.375rem",
                border: `1px solid ${hexWithAlpha(theme.primaryColor, 0.15)}`,
                color: theme.textColor,
              }}
            >
              <span aria-hidden="true">📄</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
              <span style={{ color: theme.textMuted, fontSize: "0.75rem" }}>{humanSize(f.size)}</span>
              <span style={{ color: "#22c55e" }} aria-label="uploaded">✓</span>
              <button
                type="button"
                onClick={() => removeFile(f.id)}
                aria-label={`${f.name} entfernen`}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: theme.textMuted,
                  padding: "0 0.25rem",
                  fontSize: "1rem",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {(localError || error) && (
        <p style={{ color: theme.errorColor, fontSize: "0.8125rem", marginTop: "0.25rem" }}>
          {localError || error}
        </p>
      )}
    </div>
  );
}

// ─── PriceDisplayWidget ──────────────────────────────────────────────────────

function PriceDisplayWidget({
  component,
  theme,
  overrides,
  wrapStyle,
}: {
  component: StepComponent;
  theme: ResolvedTheme;
  overrides: StyleOverrides;
  wrapStyle: React.CSSProperties;
}) {
  const answers = useRendererStore((s) => s.answers);
  const flowDefinition = useRendererStore((s) => s.flowDefinition);
  const { total, maxTotal, breakdown } = calculatePrice(answers, flowDefinition);

  const pricing = flowDefinition?.settings?.pricingConfig;
  const currencySymbol = pricing?.currencySymbol ?? "€";
  const config = component.config as { label?: string; showBreakdown?: boolean; style?: string };
  const label = config.label || pricing?.label || "Geschätzter Preis";
  const style = config.style ?? "card";
  const showBreakdown = config.showBreakdown ?? true;
  const primaryColor = overrides.textColor || theme.primaryColor;

  const isRange = maxTotal !== undefined && maxTotal !== total;
  const priceStr = isRange ? formatPriceRange(total, maxTotal!, currencySymbol) : formatPrice(total, currencySymbol);
  const itemPriceStr = (item: { amount: number; maxAmount?: number }) =>
    item.maxAmount !== undefined && item.maxAmount !== item.amount
      ? formatPriceRange(item.amount, item.maxAmount, currencySymbol)
      : formatPrice(item.amount, currencySymbol);

  if (style === "inline") {
    return (
      <div style={{ ...wrapStyle, display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", background: `${theme.primaryColor}10`, borderRadius: "0.5rem", border: `1px solid ${theme.primaryColor}30` }}>
        <span style={{ fontSize: "0.875rem", color: theme.textMuted, flex: 1 }}>{label}</span>
        <span style={{ fontSize: "1.25rem", fontWeight: 700, color: theme.primaryColor }}>{priceStr}</span>
      </div>
    );
  }

  if (style === "banner") {
    return (
      <div style={{ ...wrapStyle, background: theme.primaryColor, borderRadius: "0.75rem", padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.875rem", color: "#ffffff", opacity: 0.85 }}>{label}</span>
        <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "#ffffff" }}>{priceStr}</span>
      </div>
    );
  }

  // Default: "card"
  return (
    <div style={wrapStyle}>
      <div style={{
        padding: "1.25rem",
        background: overrides.backgroundColor || theme.surfaceColor,
        borderRadius: "0.75rem",
        border: `2px solid ${theme.primaryColor}30`,
        textAlign: "center",
      }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", color: theme.textMuted, marginBottom: "0.375rem" }}>{label}</div>
        <div style={{ fontSize: isRange ? "1.5rem" : "2rem", fontWeight: 700, color: primaryColor, lineHeight: 1 }}>{priceStr}</div>
        {showBreakdown && breakdown.length > 0 && (
          <div style={{ marginTop: "0.875rem", paddingTop: "0.875rem", borderTop: `1px solid ${theme.borderColor}`, textAlign: "left" }}>
            {breakdown.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8125rem", color: theme.textMuted, marginBottom: i < breakdown.length - 1 ? "0.25rem" : 0 }}>
                <span>{item.label}</span>
                <span style={{ fontWeight: 500 }}>{itemPriceStr(item)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Normalize kebab-case componentType to PascalCase ──────────────────────
// Editor stores types as "image-choice", renderer switch cases use "ImageChoice"

function toPascalCase(str: string): string {
  return str.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");
}

interface ComponentRendererProps {
  component: StepComponent;
  value: unknown;
  error?: string;
  onChange: (value: unknown, valid?: boolean) => void;
  primaryColor: string;
  theme: ResolvedTheme;
  stepId?: string;
  displayRules?: DisplayRule[];
  answers?: Record<string, unknown>;
}

export function ComponentRenderer({
  component,
  value,
  error,
  onChange,
  primaryColor,
  theme,
  stepId,
  displayRules,
  answers,
}: ComponentRendererProps) {
  const overrides = resolveOverrides(component.config);
  const spacing = resolveSpacing(component.config);

  const inputVariant = theme.inputVariant ?? "bordered";
  const baseStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: "0.625rem 0.875rem",
    border:
      inputVariant === "underlined"
        ? "none"
        : `1px solid ${error ? theme.errorColor : overrides.borderColor || theme.borderColor}`,
    borderBottom:
      inputVariant === "underlined"
        ? `1px solid ${error ? theme.errorColor : overrides.borderColor || theme.borderColor}`
        : undefined,
    borderRadius: inputVariant === "underlined" ? 0 : "0.5rem",
    fontSize: "0.9375rem",
    outline: "none",
    background:
      overrides.backgroundColor ||
      (inputVariant === "filled" ? "#f9fafb" : theme.inputBackground),
    color: overrides.textColor || theme.textColor,
    boxSizing: "border-box",
    transition: "border-color 150ms ease, box-shadow 150ms ease",
  };

  const style = applyTextOverrides(baseStyle, overrides);

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontWeight: 500,
    marginBottom: "0.375rem",
    fontSize: "0.9375rem",
    color: overrides.labelColor || overrides.textColor || undefined,
  };
  if (overrides.fontFamily) labelStyle.fontFamily = overrides.fontFamily;

  const wrapStyle: React.CSSProperties = { ...spacing };
  const normalizedType = toPascalCase(component.componentType);

  switch (normalizedType) {
    case "PhoneInput":
      return (
        <div style={wrapStyle}>
          <PhoneInputField
            component={component}
            value={(value as string) || ""}
            error={error}
            onChange={(val, valid) => onChange(val, valid)}
            style={style}
            theme={theme}
          />
        </div>
      );

    case "TextInput":
    case "EmailInput":
      return (
        <div style={wrapStyle}>
          {component.label && (
            <label style={labelStyle}>
              {component.label}
              {component.required && <span style={{ color: theme.errorColor }}> *</span>}
            </label>
          )}
          <input
            className="openflow-input"
            type={component.componentType === "EmailInput" ? "email" : "text"}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={(component.config as { placeholder?: string }).placeholder}
            style={style}
          />
          {error && (
            <p style={{ color: theme.errorColor, fontSize: "0.8125rem", marginTop: "0.25rem" }}>{error}</p>
          )}
        </div>
      );

    case "TextArea":
      return (
        <div style={wrapStyle}>
          {component.label && (
            <label style={labelStyle}>
              {component.label}
              {component.required && <span style={{ color: theme.errorColor }}> *</span>}
            </label>
          )}
          <textarea
            className="openflow-input"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            rows={(component.config as { rows?: number }).rows || 4}
            placeholder={(component.config as { placeholder?: string }).placeholder}
            style={{ ...style, resize: "vertical" }}
          />
          {error && (
            <p style={{ color: theme.errorColor, fontSize: "0.8125rem", marginTop: "0.25rem" }}>{error}</p>
          )}
        </div>
      );

    case "NumberInput":
      return (
        <div style={wrapStyle}>
          {component.label && (
            <label style={labelStyle}>
              {component.label}
              {component.required && <span style={{ color: theme.errorColor }}> *</span>}
            </label>
          )}
          <input
            className="openflow-input"
            type="number"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            min={(component.config as { min?: number }).min}
            max={(component.config as { max?: number }).max}
            step={(component.config as { step?: number }).step}
            style={style}
          />
          {error && (
            <p style={{ color: theme.errorColor, fontSize: "0.8125rem", marginTop: "0.25rem" }}>{error}</p>
          )}
        </div>
      );

    case "DatePicker":
      return (
        <div style={wrapStyle}>
          {component.label && (
            <label style={labelStyle}>
              {component.label}
              {component.required && <span style={{ color: theme.errorColor }}> *</span>}
            </label>
          )}
          <input
            className="openflow-input"
            type={(component.config as { includeTime?: boolean }).includeTime ? "datetime-local" : "date"}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            style={style}
          />
          {error && (
            <p style={{ color: theme.errorColor, fontSize: "0.8125rem", marginTop: "0.25rem" }}>{error}</p>
          )}
        </div>
      );

    case "CardSelector":
      return (
        <CardSelectorWidget
          component={component}
          value={value}
          error={error}
          onChange={onChange}
          primaryColor={primaryColor}
          overrides={overrides}
          theme={theme}
          wrapStyle={wrapStyle}
          labelStyle={labelStyle}
        />
      );

    case "ImageChoice":
      return (
        <ImageChoiceWidget
          component={component}
          value={value}
          error={error}
          onChange={onChange}
          primaryColor={primaryColor}
          overrides={overrides}
          theme={theme}
          wrapStyle={wrapStyle}
          labelStyle={labelStyle}
        />
      );

    case "RadioGroup":
      return (
        <RadioGroupWidget
          component={component}
          value={value}
          error={error}
          onChange={onChange}
          primaryColor={primaryColor}
          overrides={overrides}
          theme={theme}
          wrapStyle={wrapStyle}
          labelStyle={labelStyle}
        />
      );

    case "CheckboxGroup": {
      const config = component.config as {
        options?: Array<{ value: string; label: string; isOther?: boolean }>;
        layout?: "vertical" | "horizontal" | "grid";
      };
      const arr = Array.isArray(value) ? (value as string[]) : [];
      const layout = config.layout || "vertical";
      // "Sonstiges" is checked when arr has "__other__" or "__other__:..."
      const otherEntry = arr.find((v) => v === "__other__" || v.startsWith("__other__:"));
      const otherChecked = !!otherEntry;
      const otherText = otherEntry?.startsWith("__other__:") ? otherEntry.slice("__other__:".length) : "";
      return (
        <div style={wrapStyle}>
          {component.label && (
            <label style={{ ...labelStyle, marginBottom: "0.75rem" }}>
              {component.label}
              {component.required && <span style={{ color: theme.errorColor }}> *</span>}
            </label>
          )}
          <div style={{
            display: layout === "grid" ? "grid" : "flex",
            flexDirection: layout === "horizontal" ? "row" : "column",
            gridTemplateColumns: layout === "grid" ? "repeat(2, 1fr)" : undefined,
            gap: "0.5rem",
            flexWrap: layout === "horizontal" ? "wrap" : undefined,
          }}>
            {(config.options || []).map((opt) => {
              if (opt.isOther || opt.value === "__other__") {
                return (
                  <div key="__other__">
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", color: overrides.textColor || theme.textColor }}>
                      <input
                        type="checkbox"
                        checked={otherChecked}
                        onChange={(e) => {
                          const filtered = arr.filter((v) => v !== "__other__" && !v.startsWith("__other__:"));
                          onChange(e.target.checked ? [...filtered, "__other__"] : filtered);
                        }}
                        style={{ accentColor: theme.selectionColor }}
                      />
                      {opt.label || "Sonstiges"}
                    </label>
                    {otherChecked && (
                      <input
                        type="text"
                        value={otherText}
                        onChange={(e) => {
                          const filtered = arr.filter((v) => v !== "__other__" && !v.startsWith("__other__:"));
                          onChange([...filtered, `__other__:${e.target.value}`]);
                        }}
                        placeholder="Bitte angeben…"
                        style={{
                          marginTop: "0.375rem",
                          marginLeft: "1.5rem",
                          width: "calc(100% - 1.5rem)",
                          padding: "0.375rem 0.75rem",
                          fontSize: "0.875rem",
                          border: `1px solid ${theme.borderColor ?? "#e5e7eb"}`,
                          borderRadius: "0.5rem",
                          outline: "none",
                          background: "transparent",
                          color: overrides.textColor || theme.textColor,
                        }}
                      />
                    )}
                  </div>
                );
              }
              return (
                <label
                  key={opt.value}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", color: overrides.textColor || theme.textColor }}
                >
                  <input
                    type="checkbox"
                    checked={arr.includes(opt.value)}
                    onChange={(e) => {
                      onChange(
                        e.target.checked
                          ? [...arr, opt.value]
                          : arr.filter((v) => v !== opt.value),
                      );
                    }}
                    style={{ accentColor: theme.selectionColor }}
                  />
                  {opt.label}
                </label>
              );
            })}
          </div>
          {error && (
            <p style={{ color: theme.errorColor, fontSize: "0.8125rem", marginTop: "0.25rem" }}>{error}</p>
          )}
        </div>
      );
    }

    case "Dropdown": {
      const config = component.config as {
        options?: Array<{ value: string; label: string }>;
        placeholder?: string;
      };
      return (
        <div style={wrapStyle}>
          {component.label && (
            <label style={labelStyle}>
              {component.label}
              {component.required && <span style={{ color: theme.errorColor }}> *</span>}
            </label>
          )}
          <select
            className="openflow-input"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            style={style}
          >
            <option value="">{config.placeholder || "Select..."}</option>
            {(config.options || []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {error && (
            <p style={{ color: theme.errorColor, fontSize: "0.8125rem", marginTop: "0.25rem" }}>{error}</p>
          )}
        </div>
      );
    }

    case "Heading": {
      const config = component.config as { text?: string; level?: number; alignment?: string };
      const level = Number(config.level) || 2;
      const text = config.text || component.label;
      const levelFontSize =
        level === 1 ? "2.25rem" : level === 2 ? "1.75rem" : level === 3 ? "1.375rem" : "1.125rem";
      const headingStyle: React.CSSProperties = applyTextOverrides({
        fontWeight: 700,
        fontSize: levelFontSize,
        letterSpacing: "-0.01em",
        marginBottom: "0.5rem",
        color: overrides.textColor || theme.textColor,
        textAlign: (config.alignment || overrides.textAlign || "left") as React.CSSProperties["textAlign"],
      }, overrides);
      if (level === 1) return <div style={wrapStyle}><h1 style={headingStyle}>{text}</h1></div>;
      if (level === 3) return <div style={wrapStyle}><h3 style={headingStyle}>{text}</h3></div>;
      if (level === 4) return <div style={wrapStyle}><h4 style={headingStyle}>{text}</h4></div>;
      return <div style={wrapStyle}><h2 style={headingStyle}>{text}</h2></div>;
    }

    case "Paragraph": {
      const config = component.config as { text?: string; alignment?: string };
      const pStyle: React.CSSProperties = applyTextOverrides({
        color: overrides.textColor || theme.textColor,
        lineHeight: 1.6,
        maxWidth: "65ch",
        textAlign: (config.alignment || overrides.textAlign || "left") as React.CSSProperties["textAlign"],
      }, overrides);
      return <div style={wrapStyle}><p style={pStyle}>{config.text || component.label}</p></div>;
    }

    case "Divider": {
      const dividerColor = overrides.dividerColor || overrides.borderColor;
      // If an explicit color override is present, keep the old solid look.
      // Otherwise use a subtle gradient for a nicer default.
      const dividerStyle: React.CSSProperties = dividerColor
        ? { border: "none", borderTop: `1px solid ${dividerColor}`, margin: "0.5rem 0" }
        : {
            border: "none",
            height: "1px",
            background: `linear-gradient(to right, transparent, ${theme.borderColor || "#e5e7eb"}, transparent)`,
            margin: "0.5rem 0",
          };
      return (
        <div style={wrapStyle}>
          <hr style={dividerStyle} />
        </div>
      );
    }

    case "ImageBlock": {
      const config = component.config as { src?: string; alt?: string; alignment?: string };
      if (!config.src) return <div style={wrapStyle}><div style={{ padding: "2rem", background: "#f9fafb", borderRadius: "0.5rem", textAlign: "center", color: theme.textMuted, fontSize: "0.875rem" }}>Bild-URL erforderlich</div></div>;
      return (
        <div style={{ ...wrapStyle, textAlign: (config.alignment || "center") as React.CSSProperties["textAlign"] }}>
          <img src={config.src} alt={config.alt || ""} style={{ maxWidth: "100%", borderRadius: "0.5rem" }} />
        </div>
      );
    }

    case "Rating": {
      const config = component.config as { max?: number; maxRating?: number; icon?: string; allowHalf?: boolean };
      const max = config.maxRating || config.max || 5;
      const iconType = config.icon || "star";
      const ratingChar = iconType === "heart" ? "♥" : iconType === "thumbsUp" ? "👍" : "★";
      const activeColor = overrides.iconColor || "#f59e0b";
      const iconSize = overrides.iconSize || "1.75rem";
      return (
        <div style={wrapStyle}>
          {component.label && (
            <label style={{ ...labelStyle, marginBottom: "0.5rem" }}>
              {component.label}
            </label>
          )}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {Array.from({ length: max }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onChange(i + 1)}
                style={{
                  fontSize: iconSize,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: (value as number) >= i + 1 ? activeColor : theme.borderColor,
                  transition: "color 0.15s",
                }}
              >
                {ratingChar}
              </button>
            ))}
          </div>
        </div>
      );
    }

    case "Slider": {
      const config = component.config as { min?: number; max?: number; step?: number; unit?: string; showValue?: boolean; progressColor?: string; trackColor?: string; thumbColor?: string };
      const min = config.min ?? 0;
      const max = config.max ?? 100;
      const step = config.step ?? 1;
      const currentValue = (value as number) ?? min;
      const sliderAccent = config.progressColor || overrides.iconColor || primaryColor;
      return (
        <div style={wrapStyle}>
          {component.label && (
            <label style={labelStyle}>
              {component.label}
              {component.required && <span style={{ color: theme.errorColor }}> *</span>}
            </label>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={currentValue}
              onChange={(e) => onChange(Number(e.target.value))}
              style={{ flex: 1, accentColor: sliderAccent }}
            />
            {config.showValue !== false && (
              <span style={{ fontSize: "0.875rem", fontWeight: 600, color: overrides.textColor || theme.textColor, minWidth: "3rem", textAlign: "right" }}>
                {currentValue}{config.unit || ""}
              </span>
            )}
          </div>
        </div>
      );
    }

    case "FileUpload":
      return (
        <FileUploadWidget
          component={component}
          value={value}
          error={error}
          onChange={onChange}
          overrides={overrides}
          theme={theme}
          wrapStyle={wrapStyle}
          labelStyle={labelStyle}
        />
      );

    case "SignaturePad": {
      const config = component.config as { penColor?: string; backgroundColor?: string; width?: number; height?: number };
      return (
        <div style={wrapStyle}>
          {component.label && (
            <label style={labelStyle}>
              {component.label}
              {component.required && <span style={{ color: theme.errorColor }}> *</span>}
            </label>
          )}
          <div style={{
            width: "100%",
            height: config.height || 200,
            background: config.backgroundColor || "#ffffff",
            border: `1px solid ${overrides.borderColor || theme.borderColor}`,
            borderRadius: "0.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: theme.textMuted,
            fontSize: "0.875rem",
          }}>
            ✍️ Unterschrift hier
          </div>
        </div>
      );
    }

    case "LocationPicker": {
      const config = component.config as { placeholder?: string };
      return (
        <div style={wrapStyle}>
          {component.label && (
            <label style={labelStyle}>
              {component.label}
              {component.required && <span style={{ color: theme.errorColor }}> *</span>}
            </label>
          )}
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "1rem" }}>📍</span>
            <input
              className="openflow-input"
              type="text"
              value={(value as string) || ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder={config.placeholder || "Adresse eingeben..."}
              style={{ ...style, paddingLeft: "2.25rem" }}
            />
          </div>
          {error && (
            <p style={{ color: theme.errorColor, fontSize: "0.8125rem", marginTop: "0.25rem" }}>{error}</p>
          )}
        </div>
      );
    }

    case "PaymentField": {
      const config = component.config as { currency?: string; amounts?: number[]; allowCustomAmount?: boolean };
      const currency = config.currency || "EUR";
      const currencySymbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency === "GBP" ? "£" : currency;
      return (
        <div style={wrapStyle}>
          {component.label && (
            <label style={{ ...labelStyle, marginBottom: "0.75rem" }}>
              {component.label}
              {component.required && <span style={{ color: theme.errorColor }}> *</span>}
            </label>
          )}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {(config.amounts || []).map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => onChange(amount)}
                style={{
                  padding: "0.625rem 1rem",
                  border: `2px solid ${value === amount ? primaryColor : overrides.borderColor || theme.borderColor}`,
                  borderRadius: "0.5rem",
                  background: value === amount ? `${primaryColor}15` : theme.surfaceColor,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.9375rem",
                  color: overrides.textColor || theme.textColor,
                }}
              >
                {(amount / 100).toFixed(0)}{currencySymbol}
              </button>
            ))}
          </div>
          {config.allowCustomAmount && (
            <div style={{ marginTop: "0.5rem" }}>
              <input
                type="number"
                placeholder={`Eigener Betrag (${currencySymbol})`}
                value={typeof value === "number" && !(config.amounts || []).includes(value as number) ? String((value as number) / 100) : ""}
                onChange={(e) => onChange(Math.round(Number(e.target.value) * 100))}
                style={style}
              />
            </div>
          )}
          {error && (
            <p style={{ color: theme.errorColor, fontSize: "0.8125rem", marginTop: "0.25rem" }}>{error}</p>
          )}
        </div>
      );
    }

    case "PricingCard": {
      const config = component.config as {
        columns?: number;
        cards?: Array<{ key: string; title: string; price?: string; features?: string[]; highlighted?: boolean }>;
        style?: "bordered" | "filled";
      };
      return (
        <div style={wrapStyle}>
          {component.label && (
            <label style={{ ...labelStyle, marginBottom: "0.75rem" }}>
              {component.label}
            </label>
          )}
          <div style={{ display: "grid", gridTemplateColumns: resolveColumns(config.columns, (config.cards || []).length), gap: "0.75rem" }}>
            {(config.cards || []).map((card) => {
              const sel = value === card.key;
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => onChange(card.key)}
                  style={{
                    padding: "1.25rem",
                    border: `2px solid ${card.highlighted || sel ? primaryColor : overrides.borderColor || theme.borderColor}`,
                    borderRadius: "0.75rem",
                    background: sel ? `${primaryColor}15` : card.highlighted ? `${primaryColor}08` : theme.surfaceColor,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "1rem", color: overrides.textColor || theme.textColor }}>{card.title}</div>
                  {card.price && (
                    <div style={{ fontSize: "1.25rem", fontWeight: 800, color: primaryColor, marginTop: "0.5rem" }}>{card.price}</div>
                  )}
                  {card.features && card.features.length > 0 && (
                    <ul style={{ listStyle: "none", padding: 0, marginTop: "0.75rem", fontSize: "0.8125rem", color: theme.textMuted }}>
                      {card.features.map((f, i) => (
                        <li key={i} style={{ padding: "0.25rem 0" }}>✓ {f}</li>
                      ))}
                    </ul>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case "AccordionGroup": {
      const config = component.config as { items?: Array<{ title: string; defaultOpen?: boolean }> };
      return (
        <div style={wrapStyle}>
          {(config.items || []).map((item, i) => (
            <details key={i} open={item.defaultOpen} style={{
              border: `1px solid ${overrides.borderColor || theme.borderColor}`,
              borderRadius: "0.5rem",
              marginBottom: "0.5rem",
              overflow: "hidden",
            }}>
              <summary style={{
                padding: "0.75rem 1rem",
                fontWeight: 600,
                cursor: "pointer",
                background: overrides.backgroundColor || theme.surfaceColor,
                color: overrides.textColor || theme.textColor,
                fontSize: "0.9375rem",
              }}>
                {item.title}
              </summary>
              <div style={{ padding: "0.75rem 1rem", borderTop: `1px solid ${overrides.borderColor || theme.borderColor}`, color: theme.textMuted, fontSize: "0.875rem" }}>
                Inhalt für „{item.title}"
              </div>
            </details>
          ))}
        </div>
      );
    }

    case "StepSummary": {
      const config = component.config as { showFieldLabels?: boolean; groupByStep?: boolean };
      return (
        <div style={wrapStyle}>
          <div style={{
            padding: "1.25rem",
            background: overrides.backgroundColor || "#f9fafb",
            borderRadius: "0.75rem",
            border: `1px solid ${overrides.borderColor || theme.borderColor}`,
          }}>
            <div style={{ fontWeight: 600, fontSize: "0.9375rem", marginBottom: "0.75rem", color: overrides.textColor || theme.textColor }}>
              Zusammenfassung
            </div>
            <div style={{ fontSize: "0.8125rem", color: theme.textMuted }}>
              Alle Antworten werden hier angezeigt
            </div>
          </div>
        </div>
      );
    }

    case "PriceDisplay":
      return <PriceDisplayWidget component={component} theme={theme} overrides={overrides} wrapStyle={wrapStyle} />;

    case "Button": {
      const config = component.config as {
        text?: string; variant?: string; action?: string; targetStepId?: string;
        externalUrl?: string; fullWidth?: boolean; size?: string;
        buttonColor?: string; buttonTextColor?: string; borderColor?: string; borderRadius?: string;
        iconRight?: string;
      };
      const btnColor = config.buttonColor || primaryColor;
      const isOutline = config.variant === "outline" || config.variant === "ghost";
      const btnTextColor = config.buttonTextColor || (isOutline ? btnColor : "#ffffff");
      const btnBorder = config.borderColor || btnColor;
      const btnRadius = config.borderRadius || theme.borderRadius;
      const btnPad = config.size === "small" ? "0.375rem 0.75rem" : config.size === "large" ? "1rem 2rem" : "0.75rem 1.25rem";
      const btnFont = config.size === "small" ? "0.8125rem" : config.size === "large" ? "1.0625rem" : "0.9375rem";
      const isPrimary = !isOutline;

      const handleClick = () => {
        if (config.action === "url" && config.externalUrl) {
          window.open(config.externalUrl, "_blank");
        } else {
          // next/previous/submit/jump handled by parent flow
          onChange(config.action || "next");
        }
      };

      return (
        <div style={wrapStyle}>
          <button
            type="button"
            onClick={handleClick}
            onMouseEnter={(e) => {
              if (isPrimary) {
                e.currentTarget.style.boxShadow = `0 4px 12px ${hexWithAlpha(btnColor, 0.4)}`;
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              if (isPrimary) {
                e.currentTarget.style.boxShadow = `0 2px 8px ${hexWithAlpha(btnColor, 0.3)}`;
                e.currentTarget.style.transform = "translateY(0)";
              }
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              width: config.fullWidth !== false ? "100%" : "auto",
              padding: btnPad,
              fontSize: btnFont,
              fontWeight: 600,
              color: btnTextColor,
              backgroundColor: isOutline ? "transparent" : btnColor,
              border: config.variant === "ghost" ? "none" : `2px solid ${btnBorder}`,
              borderRadius: btnRadius,
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow: isPrimary ? `0 2px 8px ${hexWithAlpha(btnColor, 0.3)}` : undefined,
            }}
          >
            {config.text || "Weiter"}
            {config.iconRight === "ArrowRight" && <span>→</span>}
          </button>
        </div>
      );
    }

    case "SubmitButton":
    case "submit-button": {
      const config = component.config as {
        text?: string; variant?: string; fullWidth?: boolean; size?: string;
        buttonColor?: string; buttonTextColor?: string; borderColor?: string; borderRadius?: string;
      };
      const btnColor = config.buttonColor || primaryColor;
      const isOutline = config.variant === "outline" || config.variant === "ghost";
      const btnTextColor = config.buttonTextColor || (isOutline ? btnColor : "#ffffff");
      const btnBorder = config.borderColor || btnColor;
      const btnRadius = config.borderRadius || theme.borderRadius;
      const btnPad = config.size === "small" ? "0.375rem 0.75rem" : config.size === "large" ? "1rem 2rem" : "0.75rem 1.25rem";
      const btnFont = config.size === "small" ? "0.8125rem" : config.size === "large" ? "1.0625rem" : "0.9375rem";
      const isPrimary = !isOutline;

      return (
        <div style={wrapStyle}>
          <button
            type="button"
            onClick={() => onChange("submit")}
            onMouseEnter={(e) => {
              if (isPrimary) {
                e.currentTarget.style.boxShadow = `0 4px 12px ${hexWithAlpha(btnColor, 0.4)}`;
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              if (isPrimary) {
                e.currentTarget.style.boxShadow = `0 2px 8px ${hexWithAlpha(btnColor, 0.3)}`;
                e.currentTarget.style.transform = "translateY(0)";
              }
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              width: config.fullWidth !== false ? "100%" : "auto",
              padding: btnPad,
              fontSize: btnFont,
              fontWeight: 600,
              color: btnTextColor,
              backgroundColor: isOutline ? "transparent" : btnColor,
              border: config.variant === "ghost" ? "none" : `2px solid ${btnBorder}`,
              borderRadius: btnRadius,
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow: isPrimary ? `0 2px 8px ${hexWithAlpha(btnColor, 0.3)}` : undefined,
            }}
          >
            {config.text || "Absenden"}
            <span style={{ fontSize: "1em" }}>✓</span>
          </button>
        </div>
      );
    }

    case "HiddenField":
      return null;

    case "ContactForm":
    case "contact-form": {
      return (
        <ContactFormRenderer
          component={component}
          value={(value as Record<string, unknown>) || {}}
          error={error}
          onChange={onChange}
          theme={theme}
          overrides={overrides}
          inputStyle={style}
          stepId={stepId}
          displayRules={displayRules}
          answers={answers}
        />
      );
    }

    case "StlViewer": {
      const stlCfg = component.config as {
        fileUrl?: string;
        backgroundColor?: string;
        modelColor?: string;
        autoRotate?: boolean;
        showGrid?: boolean;
        caption?: string;
        height?: number;
      };
      return (
        <div style={wrapStyle} className="w-full">
          {component.label && (
            <label
              style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500, color: overrides.textColor || theme.textColor }}
            >
              {component.label}
            </label>
          )}
          <Suspense fallback={
            <div style={{ height: stlCfg.height ?? 400, background: stlCfg.backgroundColor ?? "#f1f5f9", borderRadius: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>3D Viewer lädt…</span>
            </div>
          }>
            <STLViewerComponent
              fileUrl={stlCfg.fileUrl ?? ""}
              backgroundColor={stlCfg.backgroundColor}
              modelColor={stlCfg.modelColor}
              autoRotate={stlCfg.autoRotate ?? false}
              showGrid={stlCfg.showGrid ?? true}
              caption={stlCfg.caption}
              height={stlCfg.height ?? 400}
            />
          </Suspense>
        </div>
      );
    }

    default:
      return (
        <div
          style={{
            ...wrapStyle,
            padding: "1rem",
            background: theme.surfaceColor,
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
            color: theme.textMuted,
          }}
        >
          Component: {component.componentType} (field: {component.fieldKey})
        </div>
      );
  }
}
