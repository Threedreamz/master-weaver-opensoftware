"use client";
import React, { useState, useCallback, lazy, Suspense } from "react";
const STLViewerComponent = lazy(() => import("./STLViewerComponent"));
import { parsePhoneNumberWithError, isValidPhoneNumber, getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";
import type { StepComponent } from "@opensoftware/openflow-core";
import type { ResolvedTheme } from "./FlowRenderer";

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

  switch (component.componentType) {
    case "PhoneInput":
      return (
        <PhoneInputField
          component={component}
          value={(value as string) || ""}
          error={error}
          onChange={(val, valid) => onChange(val, valid)}
          style={style}
          theme={theme}
        />
      );

    case "TextInput":
    case "EmailInput":
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

    case "RadioGroup": {
      const config = component.config as {
        options?: Array<{ value: string; label: string }>;
        layout?: "vertical" | "horizontal" | "grid";
      };
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
                  type="radio"
                  checked={value === opt.value}
                  onChange={() => onChange(opt.value)}
                  style={{ accentColor: primaryColor }}
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
                  style={{ accentColor: primaryColor }}
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

    case "stl-viewer": {
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
        <div className="w-full">
          {component.label && (
            <label
              style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500, color: theme.textColor }}
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
