"use client";
import React, { useState, useCallback, useEffect, lazy, Suspense } from "react";
const STLViewerComponent = lazy(() => import("./STLViewerComponent"));
import { parsePhoneNumberWithError, isValidPhoneNumber, getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";
import type { StepComponent } from "@opensoftware/openflow-core";
import type { ResolvedTheme } from "./FlowRenderer";

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
                textAlign: "left",
                transition: "all 0.15s",
                boxShadow: cardStyle === "minimal" && sel ? `0 0 0 2px ${selectedColor}` : undefined,
              }}
            >
              {(card.imageUrl || card.icon) && (
                <div style={{ fontSize: iconSize, marginBottom: "0.5rem", color: iconColor, lineHeight: 1 }}>
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
                transition: "all 0.15s",
              }}
            >
              {opt.imageUrl && (
                <div style={{ height: overrides.iconSize || "8rem", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", padding: "0.5rem" }}>
                  {isSvgDataUrl(opt.imageUrl) ? renderColoredIcon(opt.imageUrl, overrides.iconColor, overrides.iconSize || "3rem") : <img src={opt.imageUrl} alt={opt.label} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />}
                </div>
              )}
              <div style={{ padding: "0.75rem", textAlign: "center" }}>
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
}

export function ComponentRenderer({
  component,
  value,
  error,
  onChange,
  primaryColor,
  theme,
}: ComponentRendererProps) {
  const overrides = resolveOverrides(component.config);
  const spacing = resolveSpacing(component.config);

  const baseStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: "0.625rem 0.875rem",
    border: `1px solid ${error ? theme.errorColor : overrides.borderColor || theme.borderColor}`,
    borderRadius: "0.5rem",
    fontSize: "0.9375rem",
    outline: "none",
    background: overrides.backgroundColor || theme.inputBackground,
    color: overrides.textColor || theme.textColor,
    boxSizing: "border-box",
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
        options?: Array<{ value: string; label: string }>;
        layout?: "vertical" | "horizontal" | "grid";
      };
      const arr = Array.isArray(value) ? (value as string[]) : [];
      const layout = config.layout || "vertical";
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
            {(config.options || []).map((opt) => (
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
            ))}
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
      const headingStyle: React.CSSProperties = applyTextOverrides({
        fontWeight: 700,
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
        textAlign: (config.alignment || overrides.textAlign || "left") as React.CSSProperties["textAlign"],
      }, overrides);
      return <div style={wrapStyle}><p style={pStyle}>{config.text || component.label}</p></div>;
    }

    case "Divider": {
      const dividerColor = overrides.dividerColor || overrides.borderColor || theme.borderColor;
      return (
        <div style={wrapStyle}>
          <hr style={{ border: "none", borderTop: `1px solid ${dividerColor}`, margin: "0.5rem 0" }} />
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

    case "FileUpload": {
      const config = component.config as { description?: string; maxFiles?: number; maxFileSizeMb?: number };
      return (
        <div style={wrapStyle}>
          {component.label && (
            <label style={labelStyle}>
              {component.label}
              {component.required && <span style={{ color: theme.errorColor }}> *</span>}
            </label>
          )}
          <div style={{
            border: `2px dashed ${overrides.borderColor || theme.borderColor}`,
            borderRadius: "0.75rem",
            padding: "1.5rem",
            textAlign: "center",
            color: theme.textMuted,
            fontSize: "0.875rem",
            background: overrides.backgroundColor || theme.surfaceColor,
          }}>
            <div style={{ marginBottom: "0.5rem" }}>📎 Datei hierher ziehen oder klicken</div>
            {config.description && <p style={{ fontSize: "0.75rem", color: theme.textMuted }}>{config.description}</p>}
            <p style={{ fontSize: "0.75rem", color: theme.textMuted, marginTop: "0.25rem" }}>
              Max. {config.maxFileSizeMb || 10} MB, bis zu {config.maxFiles || 3} Dateien
            </p>
          </div>
          {error && (
            <p style={{ color: theme.errorColor, fontSize: "0.8125rem", marginTop: "0.25rem" }}>{error}</p>
          )}
        </div>
      );
    }

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
      const btnPad = config.size === "small" ? "0.375rem 0.75rem" : config.size === "large" ? "0.875rem 2rem" : "0.625rem 1.5rem";
      const btnFont = config.size === "small" ? "0.8125rem" : config.size === "large" ? "1.0625rem" : "0.9375rem";

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
              transition: "all 0.15s",
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
      const btnPad = config.size === "small" ? "0.375rem 0.75rem" : config.size === "large" ? "0.875rem 2rem" : "0.625rem 1.5rem";
      const btnFont = config.size === "small" ? "0.8125rem" : config.size === "large" ? "1.0625rem" : "0.9375rem";

      return (
        <div style={wrapStyle}>
          <button
            type="button"
            onClick={() => onChange("submit")}
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
              transition: "all 0.15s",
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
