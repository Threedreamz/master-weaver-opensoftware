"use client";

import { useState, useCallback, useEffect, useRef, lazy, Suspense } from "react";
import {
  Smartphone,
  Tablet,
  Monitor,
  Palette,
  Layers,
  GitBranch,
  Code,
  Webhook,
  RotateCcw,
  RotateCw,
  ChevronUp,
  ChevronDown,
  Plus,
  Paintbrush,
  Copy,
  Clipboard,
  CopyPlus,
  LayoutGrid,
  Pencil,
  Play,
  Send,
  MoreHorizontal,
  Type,
  TextCursorInput,
  Mail,
  Phone,
  Hash,
  Calendar,
  CreditCard,
  CircleDot,
  CheckSquare,
  ChevronDownIcon,
  SlidersHorizontal,
  EyeOff,
  Image,
  AlignLeft,
  HelpCircle,
  PanelLeftClose,
  Search,
  X,
  Heading,
  Upload,
  Star,
  MapPin,
  Link as LinkIcon,
  Loader,
  List,
  ArrowRight,
  Check,
  ArrowLeft,
  ExternalLink,
  MousePointer,
  ShieldCheck,
  Sparkles,
  Box,
  GripVertical,
  Trash2,
  BadgeEuro,
  ClipboardList,
  Building2,
  Flag,
} from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useEditorStore } from "@/stores/editorStore";
import EmbedDialog from "../EmbedDialog";
import DesignPanel from "../DesignPanel";
import InspectorPanel from "../InspectorPanel";
import WebhooksPanel from "../WebhooksPanel";
import NotificationsPanel from "../NotificationsPanel";
import CodePanel from "../CodePanel";
import RulesPanel from "../RulesPanel";
import DisplayRulesPanel from "../DisplayRulesPanel";
import { PricingPanel } from "../PricingPanel";
import QAPanel from "../QAPanel";
import AIAssistant from "../AIAssistant";
import AIChatPanel from "../AIChatPanel";
import PlanEditDialog from "../PlanEditDialog";
import type { FlowOperation } from "@/types/ai-edit";
import { COMPONENT_DEFINITIONS } from "@opensoftware/openflow-core";
import type {
  FlowDefinition,
  FlowEdge,
  FlowStep,
  FlowTheme,
  FlowSettings,
  StepComponent,
} from "@opensoftware/openflow-core";

const STLViewerComponent = lazy(() => import("@opensoftware/openflow-renderer/stl-viewer"));
import { FlowRenderer, useRendererStore, calculatePrice, formatPrice, formatPriceRange } from "@opensoftware/openflow-renderer";

// ─── Inline SVG renderer (decodes data-URLs to allow color override) ─────────

function ColoredSvg({ src, color, size, className }: { src: string; color?: string; size?: string; className?: string }) {
  const svgMarkup = (() => {
    try {
      let raw = "";
      if (src.startsWith("data:image/svg+xml,")) {
        raw = decodeURIComponent(src.replace("data:image/svg+xml,", ""));
      } else if (src.startsWith("data:image/svg+xml;base64,")) {
        raw = atob(src.replace("data:image/svg+xml;base64,", ""));
      }
      if (!raw || !raw.includes("<svg")) return null;

      // Override stroke/fill color
      if (color) {
        raw = raw.replace(/stroke="[^"]*"/g, `stroke="${color}"`);
        raw = raw.replace(/fill="(?!none)[^"]*"/g, `fill="${color}"`);
      }
      // Override size via width/height attributes
      if (size) {
        raw = raw.replace(/width="[^"]*"/, `width="${size}"`);
        raw = raw.replace(/height="[^"]*"/, `height="${size}"`);
      }
      return raw;
    } catch {
      return null;
    }
  })();

  if (!svgMarkup) {
    // Fallback: render as img (non-SVG or parse error)
    return <img src={src} alt="" className={className} style={{ width: size, height: size, objectFit: "contain" }} />;
  }

  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}

function isSvgDataUrl(url: string): boolean {
  return url.startsWith("data:image/svg+xml");
}

// ─── Sidebar Tab Types ────────────────────────────────────────────────────────

type SidebarTab = "editor" | "regeln" | "design" | "code" | "integrationen" | "preise";

// ─── Default Theme ────────────────────────────────────────────────────────────

const DEFAULT_THEME: FlowTheme = {
  primaryColor: "#6366f1",
  backgroundColor: "#ffffff",
  textColor: "#111827",
  cardBackgroundColor: "#f9fafb",
  borderRadius: "0.75rem",
  fontFamily: "Inter",
  headingFont: "Inter",
  bodyFont: "Inter",
  headingColor: "#111827",
  borderColor: "#e5e7eb",
  borderWidth: "1px",
  transitionStyle: "fade",
  selectionColor: "#6366f1",
};

// ─── Component Maps ──────────────────────────────────────────────────────────

const COMPONENT_ICON_MAP: Record<string, typeof Type> = {
  "text-input": TextCursorInput,
  "text-area": AlignLeft,
  "email-input": Mail,
  "phone-input": Phone,
  "number-input": Hash,
  "date-picker": Calendar,
  "card-selector": CreditCard,
  "radio-group": CircleDot,
  "checkbox-group": CheckSquare,
  dropdown: ChevronDownIcon,
  heading: Type,
  paragraph: AlignLeft,
  "image-block": Image,
  "image-choice": Image,
  slider: SlidersHorizontal,
  rating: Star,
  "file-upload": Upload,
  "location-picker": MapPin,
  "hidden-field": EyeOff,
  "stl-viewer": Box,
  "pricing-card": CreditCard,
  "accordion-group": ChevronDownIcon,
  "payment-field": CreditCard,
  "submit-button": Check,
  "button": MousePointer,
};

const COMPONENT_LABEL_MAP: Record<string, string> = {
  "text-input": "Textfeld",
  "text-area": "Textbereich",
  "email-input": "E-Mail",
  "phone-input": "Telefon",
  "number-input": "Nummer",
  "date-picker": "Datum",
  "card-selector": "Card Selector",
  "radio-group": "Auswahl",
  "checkbox-group": "Mehrfachauswahl",
  dropdown: "Dropdown",
  heading: "Überschrift",
  paragraph: "Absatz",
  "image-block": "Bild",
  "image-choice": "Bildauswahl",
  slider: "Schieberegler",
  rating: "Bewertung",
  "file-upload": "Datei-Upload",
  "location-picker": "Adresse",
  "hidden-field": "Verstecktes Feld",
  "stl-viewer": "3D Viewer",
  "pricing-card": "Preiskarte",
  "accordion-group": "Akkordeon",
  "payment-field": "Zahlung",
  "submit-button": "Absenden-Button",
  "button": "Button",
  "contact-form": "Form",
};

const COMPONENT_COLOR_MAP: Record<string, string> = {
  "text-input": "#6366f1",
  "text-area": "#6366f1",
  "email-input": "#6366f1",
  "phone-input": "#6366f1",
  "number-input": "#6366f1",
  "date-picker": "#6366f1",
  "card-selector": "#f59e0b",
  "radio-group": "#f59e0b",
  "checkbox-group": "#f59e0b",
  dropdown: "#f59e0b",
  heading: "#10b981",
  paragraph: "#10b981",
  "image-block": "#10b981",
  slider: "#8b5cf6",
  rating: "#f59e0b",
  "file-upload": "#6366f1",
  "image-choice": "#10b981",
  "location-picker": "#6366f1",
  "hidden-field": "#6b7280",
  "stl-viewer": "#6366f1",
  "pricing-card": "#f59e0b",
  "accordion-group": "#8b5cf6",
  "payment-field": "#10b981",
  "submit-button": "#16a34a",
  "button": "#6366f1",
  "contact-form": "#6366f1",
};

// ─── Component Palette Categories (Heyflow-style) ────────────────────────────

const PALETTE_CATEGORIES = [
  {
    label: "Text",
    items: [
      { type: "heading", label: "Überschrift", icon: Heading },
      { type: "paragraph", label: "Text", icon: Type },
    ],
  },
  {
    label: "Eingabe",
    items: [
      { type: "checkbox-group", label: "Mehrfachauswahl", icon: CheckSquare },
      { type: "image-choice", label: "Bildauswahl", icon: Image },
      { type: "text-input", label: "Eingabefeld", icon: TextCursorInput },
      { type: "phone-input", label: "Telefonnummer", icon: Phone },
      { type: "date-picker", label: "Datumsauswahl", icon: Calendar },
      { type: "text-area", label: "Textfeld", icon: AlignLeft },
      { type: "radio-group", label: "Einfache Checkbox", icon: CircleDot },
      { type: "dropdown", label: "Auswahl", icon: ChevronDownIcon },
      { type: "rating", label: "Skala", icon: Star },
      { type: "rating", label: "Icon-Bewertung", icon: Star },
      { type: "slider", label: "Schieberegler", icon: SlidersHorizontal },
      { type: "file-upload", label: "Hochladen", icon: Upload },
      { type: "contact-form", label: "Form", icon: ClipboardList },
      { type: "location-picker", label: "Adresse & Karte", icon: MapPin },
    ],
  },
  {
    label: "Medien",
    items: [
      { type: "image-block", label: "Bild", icon: Image },
      { type: "stl-viewer", label: "3D Viewer", icon: Box },
    ],
  },
  {
    label: "Navigation",
    items: [
      { type: "hidden-field", label: "Links", icon: LinkIcon },
      { type: "hidden-field", label: "Lader", icon: Loader },
      { type: "hidden-field", label: "Liste Lader", icon: List },
    ],
  },
  {
    label: "Buttons",
    items: [
      { type: "button", label: "Weiter Button", icon: ArrowRight },
      { type: "submit-button", label: "Absenden Button", icon: Check },
      { type: "button", label: "Zurück Button", icon: ArrowLeft },
      { type: "button", label: "Link Button", icon: ExternalLink },
      { type: "button", label: "Universal Button", icon: MousePointer },
    ],
  },
];

// ─── WYSIWYG Block Renderer ──────────────────────────────────────────────────

function BlockPreview({
  comp,
  isSelected,
  index,
  total,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
  theme,
  previewMode = false,
  pricingConfig,
}: {
  comp: StepComponent;
  isSelected: boolean;
  index: number;
  total: number;
  onSelect: () => void;
  onMove: (dir: "up" | "down") => void;
  onDuplicate: () => void;
  onDelete: () => void;
  theme: FlowTheme;
  previewMode?: boolean;
  pricingConfig?: FlowSettings["pricingConfig"];
}) {
  const blockLabel =
    COMPONENT_LABEL_MAP[comp.componentType] ?? comp.componentType;
  const blockColor = COMPONENT_COLOR_MAP[comp.componentType] ?? "#6366f1";
  const config = comp.config as Record<string, unknown>;

  // Apply margin spacing (same formula as ComponentRenderer.resolveSpacing)
  const _mt = config?.marginTop as string;
  const _mb = config?.marginBottom as string;
  const spacingStyle: React.CSSProperties = {
    ...(_mt && _mt !== "0" ? { marginTop: `${Number(_mt) * 0.25}rem` } : {}),
    ...(_mb && _mb !== "0" ? { marginBottom: `${Number(_mb) * 0.25}rem` } : {}),
  };

  const styleOverrides = (config.styleOverrides as Record<string, string>) ?? {};
  const fontSizeMap: Record<string, string> = {
    xs: "0.75rem", sm: "0.875rem", base: "1rem", lg: "1.125rem",
    xl: "1.25rem", "2xl": "1.5rem", "3xl": "1.875rem", "4xl": "2.25rem",
  };
  const letterSpacingMap: Record<string, string> = {
    tighter: "-0.05em", tight: "-0.025em", normal: "0em",
    wide: "0.025em", wider: "0.05em", widest: "0.1em",
  };
  const lineHeightMap: Record<string, string> = {
    none: "1", tight: "1.25", snug: "1.375", normal: "1.5", relaxed: "1.625", loose: "2",
  };
  const isHeading = comp.componentType === "heading";
  const overrideStyle: React.CSSProperties = {
    // Theme defaults (can be overridden by styleOverrides)
    color: isHeading ? theme.headingColor : theme.textColor,
    fontFamily: isHeading ? (theme.headingFont || theme.fontFamily) : theme.bodyFont || theme.fontFamily,
    // StyleOverrides (per-component overrides)
    ...(styleOverrides.fontFamily ? { fontFamily: styleOverrides.fontFamily } : {}),
    ...(styleOverrides.fontSize ? { fontSize: fontSizeMap[styleOverrides.fontSize] ?? styleOverrides.fontSize } : {}),
    ...(styleOverrides.textColor ? { color: styleOverrides.textColor } : {}),
    ...(styleOverrides.backgroundColor ? { backgroundColor: styleOverrides.backgroundColor } : {}),
    ...(styleOverrides.borderColor ? { borderColor: styleOverrides.borderColor } : {}),
    ...(styleOverrides.letterSpacing ? { letterSpacing: letterSpacingMap[styleOverrides.letterSpacing] ?? styleOverrides.letterSpacing } : {}),
    ...(styleOverrides.fontWeight ? { fontWeight: styleOverrides.fontWeight } : {}),
    ...(styleOverrides.fontStyle ? { fontStyle: styleOverrides.fontStyle } : {}),
    ...(styleOverrides.textDecoration ? { textDecoration: styleOverrides.textDecoration } : {}),
    ...(styleOverrides.textAlign ? { textAlign: styleOverrides.textAlign as React.CSSProperties["textAlign"] } : {}),
    ...(styleOverrides.lineHeight ? { lineHeight: lineHeightMap[styleOverrides.lineHeight] ?? styleOverrides.lineHeight } : {}),
    ...(styleOverrides.textTransform ? { textTransform: styleOverrides.textTransform as React.CSSProperties["textTransform"] } : {}),
  };

  function renderContent() {
    switch (comp.componentType) {
      case "heading": {
        const hLevel = Number(config.level) || 2;
        const defaultFontSizes: Record<number, string> = { 1: "2.25rem", 2: "1.5rem", 3: "1.25rem", 4: "1.0625rem" };
        const headingStyle: React.CSSProperties = {
          ...overrideStyle,
          fontWeight: (overrideStyle.fontWeight as string | number) ?? 700,
          ...(overrideStyle.fontSize ? {} : { fontSize: defaultFontSizes[hLevel] }),
        };
        const headingText = (config.text as string) || comp.label || "Überschrift";
        if (hLevel === 1) return <h1 style={headingStyle}>{headingText}</h1>;
        if (hLevel === 3) return <h3 style={headingStyle}>{headingText}</h3>;
        if (hLevel === 4) return <h4 style={headingStyle}>{headingText}</h4>;
        return <h2 style={headingStyle}>{headingText}</h2>;
      }
      case "paragraph": {
        const paraStyle: React.CSSProperties = {
          ...overrideStyle,
          lineHeight: overrideStyle.lineHeight ?? "1.625",
        };
        return (
          <p style={paraStyle}>
            {(config.text as string) || comp.label || "Absatztext hier eingeben..."}
          </p>
        );
      }
      case "text-input":
        return (
          <div>
            {comp.label && (
              <label className="block text-sm font-medium mb-1" style={{ color: styleOverrides.labelColor || styleOverrides.textColor || undefined }}>
                {comp.label}
              </label>
            )}
            <div className="h-10 rounded-lg border flex items-center px-3" style={{ borderColor: styleOverrides.borderColor || "#d1d5db", background: styleOverrides.backgroundColor || "#f9fafb" }}>
              <span className="text-sm text-gray-400">
                {(config.placeholder as string) || "Text eingeben..."}
              </span>
            </div>
          </div>
        );
      case "email-input":
        return (
          <div>
            {comp.label && (
              <label className="block text-sm font-medium mb-1" style={{ color: styleOverrides.labelColor || styleOverrides.textColor || undefined }}>
                {comp.label}
              </label>
            )}
            <div className="h-10 rounded-lg border flex items-center px-3 gap-2" style={{ borderColor: styleOverrides.borderColor || "#d1d5db", background: styleOverrides.backgroundColor || "#f9fafb" }}>
              <Mail size={14} className="text-gray-400" />
              <span className="text-sm text-gray-400">
                {(config.placeholder as string) || "email@beispiel.de"}
              </span>
            </div>
          </div>
        );
      case "phone-input":
        return (
          <div>
            {comp.label && (
              <label className="block text-sm font-medium mb-1" style={{ color: styleOverrides.labelColor || styleOverrides.textColor || undefined }}>
                {comp.label}
              </label>
            )}
            <div className="h-10 rounded-lg border flex items-center px-3 gap-2" style={{ borderColor: styleOverrides.borderColor || "#d1d5db", background: styleOverrides.backgroundColor || "#f9fafb" }}>
              <Phone size={14} className="text-gray-400" />
              <span className="text-sm text-gray-400">
                {(config.placeholder as string) || "+49 ..."}
              </span>
            </div>
          </div>
        );
      case "number-input":
        return (
          <div>
            {comp.label && (
              <label className="block text-sm font-medium mb-1" style={{ color: styleOverrides.labelColor || styleOverrides.textColor || undefined }}>
                {comp.label}
              </label>
            )}
            <div className="h-10 rounded-lg border flex items-center px-3 gap-2" style={{ borderColor: styleOverrides.borderColor || "#d1d5db", background: styleOverrides.backgroundColor || "#f9fafb" }}>
              <Hash size={14} className="text-gray-400" />
              <span className="text-sm text-gray-400">
                {(config.placeholder as string) || "0"}
              </span>
            </div>
          </div>
        );
      case "text-area":
        return (
          <div>
            {comp.label && (
              <label className="block text-sm font-medium mb-1" style={{ color: styleOverrides.labelColor || styleOverrides.textColor || undefined }}>
                {comp.label}
              </label>
            )}
            <div className="h-24 rounded-lg border flex items-start px-3 pt-2" style={{ borderColor: styleOverrides.borderColor || "#d1d5db", background: styleOverrides.backgroundColor || "#f9fafb" }}>
              <span className="text-sm text-gray-400">
                {(config.placeholder as string) || "Längerer Text..."}
              </span>
            </div>
          </div>
        );
      case "date-picker":
        return (
          <div>
            {comp.label && (
              <label className="block text-sm font-medium mb-1" style={{ color: styleOverrides.labelColor || styleOverrides.textColor || undefined }}>
                {comp.label}
              </label>
            )}
            <div className="h-10 rounded-lg border flex items-center px-3 gap-2" style={{ borderColor: styleOverrides.borderColor || "#d1d5db", background: styleOverrides.backgroundColor || "#f9fafb" }}>
              <Calendar size={14} className="text-gray-400" />
              <span className="text-sm text-gray-400">{(config.format as string) || "TT.MM.JJJJ"}</span>
            </div>
          </div>
        );
      case "card-selector": {
        const cards = (config.cards as Array<{ key: string; title: string; subtitle?: string; imageUrl?: string; icon?: string }>) ?? [
          { key: "1", title: "Option A" },
          { key: "2", title: "Option B" },
        ];
        const cardCols = Number(config.columns) || 0;
        const cardStyle = (config.style as string) || "bordered";
        const iconSize = styleOverrides.iconSize || "1.75rem";
        const iconColor = styleOverrides.iconColor || theme.primaryColor;
        const cardAlign = (styleOverrides.iconAlignment as string) ?? "center";
        const cardAlignClass = cardAlign === "right" ? "text-right" : cardAlign === "left" ? "text-left" : "text-center";
        const imgMargin = cardAlign === "right" ? "0 0 0.5rem auto" : cardAlign === "left" ? "0 auto 0.5rem 0" : "0 auto 0.5rem";
        const gridCols = cardCols > 0 ? cardCols : (cards.length <= 2 ? 2 : cards.length <= 3 ? 3 : 2);
        return (
          <div>
            {comp.label && (
              <label className="block text-sm font-medium mb-2" style={{ color: styleOverrides.labelColor || undefined }}>
                {comp.label}
              </label>
            )}
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(gridCols, 6)}, 1fr)` }}>
              {cards.map((card) => (
                <div
                  key={card.key}
                  className={`rounded-lg p-3 transition-colors ${cardAlignClass} ${
                    cardStyle === "minimal" ? "hover:bg-gray-50" :
                    cardStyle === "filled" ? "bg-gray-50 hover:bg-gray-100" :
                    "border border-gray-200 bg-white hover:border-gray-400"
                  }`}
                  style={{ borderColor: cardStyle === "bordered" ? (styleOverrides.borderColor || undefined) : undefined }}
                >
                  {card.imageUrl ? (
                    isSvgDataUrl(card.imageUrl) ? (
                      <div className="mb-2" style={{ display: "flex", justifyContent: cardAlign === "right" ? "flex-end" : cardAlign === "left" ? "flex-start" : "center" }}><ColoredSvg src={card.imageUrl} color={iconColor} size={iconSize} /></div>
                    ) : (
                      <img src={card.imageUrl} alt="" style={{ width: iconSize, height: iconSize, objectFit: "contain", margin: imgMargin }} />
                    )
                  ) : (
                    <div className="rounded-full mb-2" style={{ width: iconSize, height: iconSize, backgroundColor: `${iconColor}20`, marginLeft: cardAlign === "center" ? "auto" : cardAlign === "right" ? "auto" : "0", marginRight: cardAlign === "center" ? "auto" : cardAlign === "left" ? "auto" : "0" }} />
                  )}
                  <p className="text-xs font-medium text-gray-700">
                    {card.title}
                  </p>
                  {card.subtitle && (
                    <p className="text-[10px] text-gray-400 mt-0.5">{card.subtitle}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      }
      case "radio-group": {
        const options =
          (config.options as Array<{ value: string; label: string }>) ?? [
            { value: "a", label: "Option A" },
            { value: "b", label: "Option B" },
          ];
        const radioLayout = (config.layout as string) || "vertical";
        return (
          <div>
            {comp.label && (
              <label className="block text-sm font-medium mb-2" style={{ color: styleOverrides.labelColor || undefined }}>
                {comp.label}
              </label>
            )}
            <div className={
              radioLayout === "horizontal" ? "flex flex-wrap gap-4" :
              radioLayout === "grid" ? "grid grid-cols-2 gap-2" :
              "space-y-2"
            }>
              {options.map((opt) => (
                <div key={opt.value} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: styleOverrides.borderColor || theme.borderColor || "#d1d5db" }} />
                  <span className="text-sm" style={{ color: styleOverrides.textColor || undefined }}>{opt.label}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }
      case "checkbox-group": {
        const options =
          (config.options as Array<{ value: string; label: string }>) ?? [
            { value: "a", label: "Option A" },
            { value: "b", label: "Option B" },
          ];
        const checkLayout = (config.layout as string) || "vertical";
        return (
          <div>
            {comp.label && (
              <label className="block text-sm font-medium mb-2" style={{ color: styleOverrides.labelColor || undefined }}>
                {comp.label}
              </label>
            )}
            <div className={
              checkLayout === "horizontal" ? "flex flex-wrap gap-4" :
              checkLayout === "grid" ? "grid grid-cols-2 gap-2" :
              "space-y-2"
            }>
              {options.map((opt) => (
                <div key={opt.value} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border-2" style={{ borderColor: styleOverrides.borderColor || theme.borderColor || "#d1d5db" }} />
                  <span className="text-sm" style={{ color: styleOverrides.textColor || undefined }}>{opt.label}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }
      case "dropdown":
        return (
          <div>
            {comp.label && (
              <label className="block text-sm font-medium mb-1" style={{ color: styleOverrides.labelColor || styleOverrides.textColor || undefined }}>
                {comp.label}
              </label>
            )}
            <div className="h-10 rounded-lg border flex items-center justify-between px-3" style={{ borderColor: styleOverrides.borderColor || "#d1d5db", background: styleOverrides.backgroundColor || "#f9fafb" }}>
              <span className="text-sm text-gray-400">
                {(config.placeholder as string) || "Auswählen..."}
              </span>
              <ChevronDownIcon size={14} className="text-gray-400" />
            </div>
          </div>
        );
      case "slider": {
        const min = (config.min as number) ?? 0;
        const max = (config.max as number) ?? 100;
        const unit = (config.unit as string) ?? "";
        const mid = Math.round((min + max) / 2);
        return (
          <div>
            {comp.label && (
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {comp.label}
              </label>
            )}
            <div className="h-2 rounded-full bg-gray-200 relative mb-2">
              <div className="absolute left-0 top-0 h-full w-1/2 rounded-full bg-[#4C5FD5]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#4C5FD5] shadow" />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>{min}{unit}</span>
              <span className="font-medium text-gray-600">{mid}{unit}</span>
              <span>{max}{unit}</span>
            </div>
          </div>
        );
      }
      case "rating": {
        const maxRating = (config.maxRating as number) ?? 5;
        const icon = (config.icon as string) ?? "star";
        return (
          <div>
            {comp.label && (
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {comp.label}
              </label>
            )}
            <div className="flex gap-1">
              {Array.from({ length: maxRating }).map((_, i) => (
                <Star
                  key={i}
                  size={24}
                  className={i < Math.ceil(maxRating / 2) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
                />
              ))}
            </div>
          </div>
        );
      }
      case "file-upload":
        return (
          <div>
            {comp.label && (
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {comp.label}
              </label>
            )}
            <div className="flex flex-col items-center justify-center h-24 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 gap-1">
              <Upload size={20} className="text-gray-400" />
              <p className="text-xs text-gray-500">
                {(config.buttonText as string) || "Datei hochladen"}
              </p>
              {config.acceptedTypes && (
                <p className="text-[10px] text-gray-400">{config.acceptedTypes as string}</p>
              )}
            </div>
          </div>
        );
      case "image-choice": {
        const imgOptions = (config.options as Array<{ value: string; label: string; imageUrl?: string; subtitle?: string; description?: string }>) ?? [];
        const imgCols = parseInt(String(config.columns ?? "2"), 10) || 2;
        const showDesc = (config.showDescription as boolean) ?? false;
        const styleOvr = (config.styleOverrides as Record<string, string>) ?? {};
        const iconSizeRaw = styleOvr.iconSize || "";
        // Auto-adjust card image height based on column count
        const imgH = imgCols <= 1 ? "h-32" : imgCols <= 2 ? "h-20" : imgCols <= 3 ? "h-16" : "h-12";
        return (
          <div>
            {comp.label && (
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {comp.label}
              </label>
            )}
            {imgOptions.length === 0 ? (
              <div className="py-6 text-center border-2 border-dashed border-gray-200 rounded-lg">
                <Image size={24} className="text-gray-300 mx-auto mb-1" />
                <p className="text-xs text-gray-400">Keine Optionen — im Inspektor hinzufügen</p>
              </div>
            ) : (
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${imgCols}, 1fr)` }}>
                {imgOptions.map((opt) => {
                  const isSvg = opt.imageUrl ? isSvgDataUrl(opt.imageUrl) : false;
                  // Effective display size: user-set iconSize, otherwise column-based default
                  const iconDisplaySize = iconSizeRaw || (imgCols <= 1 ? "4rem" : imgCols <= 2 ? "2.5rem" : imgCols <= 3 ? "2rem" : "1.5rem");
                  return (
                    <div key={opt.value} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                      {opt.imageUrl && (
                        <div
                          className="bg-gray-100 flex items-center justify-center"
                          style={{ minHeight: iconDisplaySize, padding: "0.5rem" }}
                        >
                          {isSvg ? (
                            <ColoredSvg
                              src={opt.imageUrl}
                              color={styleOvr.iconColor || undefined}
                              size={iconDisplaySize}
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={opt.imageUrl}
                              alt={opt.label}
                              style={{ width: iconDisplaySize, height: iconDisplaySize, objectFit: "contain" }}
                            />
                          )}
                        </div>
                      )}
                      <p className="text-xs font-medium text-gray-700 text-center px-2 pt-2 pb-1">{opt.label}</p>
                      {showDesc && (opt.subtitle || opt.description) && (
                        <p className="text-[10px] text-gray-400 text-center px-2 pb-2">{opt.subtitle || opt.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }
      case "image-block":
        return (
          <div>
            {(config.src as string) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.src as string}
                alt={(config.alt as string) || ""}
                className="w-full rounded-lg object-cover max-h-48"
              />
            ) : (
              <div className="flex items-center justify-center h-32 rounded-lg border border-dashed border-gray-300 bg-gray-50">
                <div className="text-center">
                  <Image size={24} className="mx-auto text-gray-300 mb-1" />
                  <p className="text-xs text-gray-400">{(config.alt as string) || "Bild"}</p>
                </div>
              </div>
            )}
          </div>
        );
      case "location-picker":
        return (
          <div>
            {comp.label && (
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {comp.label}
              </label>
            )}
            <div className="h-10 rounded-lg border border-gray-300 bg-gray-50 flex items-center px-3 gap-2">
              <MapPin size={14} className="text-gray-400" />
              <span className="text-sm text-gray-400">
                {(config.placeholder as string) || "Adresse eingeben..."}
              </span>
            </div>
            <div className="mt-2 h-24 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200">
              <p className="text-xs text-gray-400">Karte</p>
            </div>
          </div>
        );
      case "divider":
        return (
          <div className="py-2 flex items-center gap-3">
            <div className="flex-1 border-t" style={{ borderColor: theme.borderColor }} />
            {config.text && (
              <span className="text-xs text-gray-400 shrink-0">{config.text as string}</span>
            )}
            <div className="flex-1 border-t" style={{ borderColor: theme.borderColor }} />
          </div>
        );
      case "signature-pad":
        return (
          <div>
            {comp.label && (
              <label className="block text-sm font-medium text-gray-700 mb-1">{comp.label}</label>
            )}
            <div
              className="h-28 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center gap-1"
            >
              <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
                <path d="M4 14 Q8 6 12 10 Q16 14 20 6 Q24 2 28 8" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" fill="none"/>
              </svg>
              <p className="text-xs text-gray-400">Unterschrift</p>
            </div>
          </div>
        );
      case "two-column": {
        return (
          <div className="grid grid-cols-2 gap-3">
            <div className="min-h-16 rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center">
              <span className="text-xs text-gray-400">Spalte 1</span>
            </div>
            <div className="min-h-16 rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center">
              <span className="text-xs text-gray-400">Spalte 2</span>
            </div>
          </div>
        );
      }
      case "step-summary": {
        return (
          <div className="space-y-1.5">
            {comp.label && (
              <p className="text-xs font-semibold text-gray-700 mb-2">{comp.label}</p>
            )}
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between text-xs py-1 border-b border-gray-100">
                <span className="text-gray-500">Feld {i}</span>
                <span className="text-gray-400 italic">Antwort</span>
              </div>
            ))}
          </div>
        );
      }
      case "accordion-group": {
        const items = (config.items as Array<{ title: string }>) ?? [
          { title: "Abschnitt 1" },
          { title: "Abschnitt 2" },
        ];
        return (
          <div className="space-y-1">
            {items.map((item, i) => (
              <div key={i} className="border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm font-medium text-gray-700">{item.title}</span>
                  <ChevronDown size={14} className="text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        );
      }
      case "payment-field":
        return (
          <div>
            {comp.label && (
              <label className="block text-sm font-medium text-gray-700 mb-2">{comp.label}</label>
            )}
            <div className="flex gap-2 flex-wrap">
              {[(config.amounts as number[]) ?? [10, 25, 50]].flat().map((amount) => (
                <div key={amount} className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700">
                  {config.currency as string || "€"}{amount}
                </div>
              ))}
            </div>
            <div className="mt-2 h-10 rounded-lg border border-gray-300 bg-gray-50 flex items-center px-3">
              <span className="text-sm text-gray-400">Kartennummer ···· ···· ···· ····</span>
            </div>
          </div>
        );
      case "hidden-field":
        return (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 border border-dashed border-gray-300">
            <EyeOff size={14} className="text-gray-400" />
            <span className="text-xs text-gray-400">
              Verstecktes Feld: {comp.fieldKey}
            </span>
          </div>
        );
      case "stl-viewer": {
        const stlUrl = config.fileUrl as string | undefined;
        const stlCaption = config.caption as string | undefined;
        const stlHeight = (config.height as number | undefined) ?? 400;
        const stlAutoRotate = (config.autoRotate as boolean) ?? false;
        const stlBgColor = (config.backgroundColor as string) || "#f1f5f9";
        const stlModelColor = (config.modelColor as string) || "#6366f1";
        const stlShowGrid = (config.showGrid as boolean) ?? true;

        if (!stlUrl) {
          return (
            <div
              className="rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50 flex flex-col items-center justify-center gap-3"
              style={{ height: Math.min(stlHeight, 300) }}
            >
              <Box size={32} className="text-indigo-300" />
              <span className="text-sm text-indigo-400">Keine STL-Datei angegeben</span>
              <span className="text-xs text-indigo-300">Lade eine Datei im Inspektor hoch</span>
            </div>
          );
        }

        return (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ height: stlHeight }}
          >
            <Suspense
              fallback={
                <div
                  className="rounded-xl bg-indigo-50 flex items-center justify-center"
                  style={{ height: stlHeight }}
                >
                  <div className="flex items-center gap-2 text-indigo-400">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-sm">3D-Modell wird geladen…</span>
                  </div>
                </div>
              }
            >
              <STLViewerComponent
                fileUrl={stlUrl}
                backgroundColor={stlBgColor}
                modelColor={stlModelColor}
                autoRotate={stlAutoRotate}
                showGrid={stlShowGrid}
                caption={stlCaption}
                height={stlHeight}
              />
            </Suspense>
          </div>
        );
      }
      case "submit-button": {
        const sbText = (config.text as string) || "Absenden";
        const sbBg = (config.buttonColor as string) || "#16a34a";
        const sbRadius = (config.borderRadius as string) || theme.borderRadius || "0.5rem";
        return (
          <div
            className={`h-10 rounded-lg flex items-center justify-center px-3 gap-1.5 ${config.fullWidth !== false ? "w-full" : "w-auto"}`}
            style={{ backgroundColor: sbBg, borderRadius: sbRadius }}
          >
            <span className="text-sm font-semibold text-white">{sbText}</span>
            <span className="text-white text-sm">✓</span>
          </div>
        );
      }
      case "button": {
        const btnText = (config.text as string) || "Weiter";
        const btnAction = (config.action as string) || "next";
        const btnBg = (config.buttonColor as string) || theme.primaryColor || "#6366f1";
        const btnRadius = (config.borderRadius as string) || theme.borderRadius || "0.5rem";
        return (
          <div
            className={`h-10 rounded-lg flex items-center justify-center px-4 gap-1.5 ${config.fullWidth !== false ? "w-full" : "w-auto"}`}
            style={{ backgroundColor: btnBg, borderRadius: btnRadius }}
          >
            {btnAction === "previous" && <ArrowLeft size={14} className="text-white" />}
            <span className="text-sm font-semibold text-white">{btnText}</span>
            {btnAction !== "previous" && <ArrowRight size={14} className="text-white" />}
          </div>
        );
      }
      case "price-display": {
        const priceLabel = (config.label as string) || "Geschätzter Preis";
        const pc = pricingConfig;
        const hasRangeRules = (pc?.basePriceRules ?? []).some(
          (r) => r.maxPrice !== undefined && r.maxPrice > r.price
        );
        return (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-center">
            <p className="text-xs text-indigo-500 font-medium">{priceLabel}</p>
            <p className="text-lg font-bold text-indigo-700 mt-0.5">
              {hasRangeRules ? `${pc?.currencySymbol ?? "€"} — – ${pc?.currencySymbol ?? "€"} —` : "— —"}
            </p>
            <p className="text-[10px] text-indigo-400 mt-1">
              {hasRangeRules ? "Preisspanne wird live berechnet" : "Preis wird live berechnet"}
            </p>
          </div>
        );
      }
      case "contact-form": {
        const cf = config as {
          showFirstName?: boolean; showLastName?: boolean;
          showEmail?: boolean; showPhone?: boolean;
          showCompany?: boolean; showVatId?: boolean;
          showBillingAddress?: boolean;
          checkboxes?: Array<{ id: string; label: string; required: boolean }>;
        };
        const inputCls = "h-9 rounded-lg border border-gray-200 bg-gray-50 flex items-center px-3 gap-2";
        const labelCls = "text-xs font-medium text-gray-500 mb-0.5";
        const field = (label: string, placeholder: string, icon?: React.ReactNode) => (
          <div>
            <p className={labelCls}>{label}</p>
            <div className={inputCls}>
              {icon}
              <span className="text-sm text-gray-400">{placeholder}</span>
            </div>
          </div>
        );
        return (
          <div className="space-y-2.5">
            {/* Vorname + Nachname */}
            {(cf.showFirstName !== false || cf.showLastName !== false) && (
              <div className={`grid gap-2 ${cf.showFirstName !== false && cf.showLastName !== false ? "grid-cols-2" : "grid-cols-1"}`}>
                {cf.showFirstName !== false && field("Vorname", "Max")}
                {cf.showLastName !== false && field("Nachname", "Mustermann")}
              </div>
            )}
            {cf.showEmail !== false && field("E-Mail Adresse", "max@beispiel.de", <Mail size={13} className="text-gray-400 shrink-0" />)}
            {cf.showPhone !== false && (
              <div>
                <p className={labelCls}>Telefonnummer</p>
                <div className={inputCls}>
                  <Flag size={13} className="text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-300">+49</span>
                  <span className="text-sm text-gray-400">150 1234567</span>
                </div>
              </div>
            )}
            {cf.showCompany && field("Unternehmen", "Muster GmbH", <Building2 size={13} className="text-gray-400 shrink-0" />)}
            {cf.showVatId && field("Umsatzsteuer-ID", "DE123456789")}
            {cf.showBillingAddress && (
              <div className="space-y-2">
                <p className={labelCls}>Rechnungsadresse</p>
                {field("Straße & Hausnummer", "Musterstraße 1")}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className={labelCls}>PLZ</p>
                    <div className={inputCls}><span className="text-sm text-gray-400">12345</span></div>
                  </div>
                  <div className="col-span-2">
                    <p className={labelCls}>Ort</p>
                    <div className={inputCls}><span className="text-sm text-gray-400">Berlin</span></div>
                  </div>
                </div>
              </div>
            )}
            {(cf.checkboxes ?? []).length > 0 && (
              <div className="space-y-1.5 pt-1">
                {(cf.checkboxes ?? []).map((cb) => (
                  <div key={cb.id} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border border-gray-300 bg-white shrink-0" />
                    <span className="text-sm text-gray-500">{cb.label || "Checkbox"}{cb.required && <span className="text-red-400 ml-0.5">*</span>}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
      default:
        return (
          <div className="h-10 rounded-lg border border-gray-200 bg-gray-50 flex items-center px-3">
            <span className="text-sm text-gray-400">{blockLabel}</span>
          </div>
        );
    }
  }

  // Which component types can trigger navigation in preview mode
  const isPreviewClickable = previewMode && (
    comp.componentType === "button" ||
    comp.componentType === "submit-button" ||
    comp.componentType === "image-choice" ||
    comp.componentType === "card-selector" ||
    comp.componentType === "radio-group" ||
    comp.componentType === "rating" ||
    comp.componentType === "slider" ||
    !!(comp.config as Record<string, unknown>)?.navigationAction
  );

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`relative group rounded-lg transition-all ${
        previewMode
          ? isPreviewClickable ? "cursor-pointer" : "cursor-default"
          : `cursor-pointer ${
              isSelected
                ? "ring-2 ring-[#4C5FD5] ring-offset-2"
                : "hover:ring-1 hover:ring-gray-300 hover:ring-offset-1"
            }`
      }`}
      style={spacingStyle}
    >
      {/* Selection label badge — edit mode only */}
      {!previewMode && isSelected && (
        <div
          className="absolute -top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold text-white z-10"
          style={{ backgroundColor: blockColor }}
        >
          {blockLabel}
        </div>
      )}

      {/* Visibility condition indicator — always visible in edit mode */}
      {!previewMode && (comp.visibilityConditions?.length ?? 0) > 0 && (
        <div
          className="absolute -top-3 left-3 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 z-10"
          style={isSelected ? { left: "auto", marginLeft: "4px" } : {}}
          title={`Bedingt sichtbar (${comp.visibilityConditions!.length} Bedingung${comp.visibilityConditions!.length !== 1 ? "en" : ""})`}
        >
          <EyeOff size={10} />
          <span>{comp.visibilityConditions!.length}</span>
        </div>
      )}

      {/* Mini toolbar — edit mode only */}
      {!previewMode && isSelected && (
        <div className="absolute -top-3 right-3 flex items-center gap-0.5 bg-white border border-gray-200 rounded shadow-sm px-1 py-0.5 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); onMove("up"); }}
            disabled={index === 0}
            className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-20 text-gray-500"
            title="Nach oben"
          >
            <ChevronUp size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMove("down"); }}
            disabled={index === total - 1}
            className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-20 text-gray-500"
            title="Nach unten"
          >
            <ChevronDown size={12} />
          </button>
          <div className="w-px h-3 bg-gray-200 mx-0.5" />
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="p-0.5 rounded hover:bg-blue-50 text-gray-500 hover:text-blue-600"
            title="Duplizieren (Ctrl+D)"
          >
            <CopyPlus size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-0.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-500"
            title="Löschen"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div className="px-4 py-3" style={overrideStyle}>{renderContent()}</div>
    </div>
  );
}

// ─── Insert Button (between blocks) ──────────────────────────────────────────

function InsertButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex items-center justify-center py-1 opacity-0 group-hover/canvas:opacity-100 hover:!opacity-100 transition-opacity">
      <button
        onClick={onClick}
        className="w-6 h-6 rounded-full bg-[#4C5FD5] text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}

// ─── Main Build Editor Component ─────────────────────────────────────────────

export default function BuildEditorPage() {
  const params = useParams();
  const flowId = params.flowId as string;
  const locale = params.locale as string;

  const {
    flow,
    selectedNodeId,
    isDirty,
    isSaving,
    history,
    redoStack,
    setFlow,
    selectNode,
    markDirty,
    markSaved,
    pushHistory,
    undo,
    redo,
  } = useEditorStore();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [flowName, setFlowName] = useState("");
  const [flowData, setFlowData] = useState<FlowDefinition | null>(null);
  const [viewportMode, setViewportMode] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [embedOpen, setEmbedOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] =
    useState<SidebarTab>("editor");
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [pagesSubTab, setPagesSubTab] = useState<"seiten" | "ebenen">(
    "seiten"
  );
  const [blockPickerOpen, setBlockPickerOpen] = useState(false);
  const [blockPickerSearch, setBlockPickerSearch] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [insertPickerIndex, setInsertPickerIndex] = useState<number | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showQAPanel, setShowQAPanel] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [renamingStepId, setRenamingStepId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [dragStepId, setDragStepId] = useState<string | null>(null);
  const [dragOverStepId, setDragOverStepId] = useState<string | null>(null);
  const [inspectorWidth, setInspectorWidth] = useState(340);
  const isResizingInspector = useRef(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(340);
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const isResizingSidebar = useRef(false);
  const sidebarResizeStartX = useRef(0);
  const sidebarResizeStartWidth = useRef(220);

  // Helper: push history before marking dirty
  const markDirtyWithHistory = useCallback(() => {
    if (flowData) {
      pushHistory(flowData);
    }
    markDirty();
  }, [flowData, pushHistory, markDirty]);

  // Undo/Redo handlers
  const handleUndo = useCallback(() => {
    const prev = undo();
    if (prev) {
      setFlowData(prev);
      setFlow(prev);
    }
  }, [undo, setFlow]);

  const handleRedo = useCallback(() => {
    const next = redo();
    if (next) {
      setFlowData(next);
      setFlow(next);
    }
  }, [redo, setFlow]);

  // ── Autosave (5 seconds after last change, debounced) ─────────────────────
  useEffect(() => {
    if (!isDirty || !flowData) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      setAutosaveStatus("saving");
      try {
        await fetch(`/api/flows/${flowId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: flowName,
            settings: JSON.stringify(flowData.settings),
            displayRules: JSON.stringify(flowData.displayRules ?? []),
            ...(flowData.aiPlan !== undefined ? { aiPlan: flowData.aiPlan } : {}),
            ...(flowData.aiBriefing !== undefined ? { aiBriefing: flowData.aiBriefing } : {}),
          }),
        });
        for (const step of flowData.steps) {
          await fetch(`/api/flows/${flowId}/steps/${step.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ label: step.label, config: JSON.stringify(step.config), positionX: step.positionX, positionY: step.positionY }),
          });
          for (const comp of step.components ?? []) {
            await fetch(`/api/flows/${flowId}/steps/${step.id}/components/${comp.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ label: comp.label, fieldKey: comp.fieldKey, config: JSON.stringify(comp.config), sortOrder: comp.sortOrder, required: comp.required ?? false }),
            });
          }
        }
        markSaved();
        setLastSavedAt(new Date());
        setAutosaveStatus("saved");
        setTimeout(() => setAutosaveStatus("idle"), 3000);
      } catch {
        setAutosaveStatus("idle");
      }
    }, 5000);
    return () => { if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current); };
  }, [isDirty, flowData, flowId, flowName, markSaved]);

  // Keyboard shortcuts
  // Panel resize mouse handlers (inspector + sidebar)
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (isResizingInspector.current) {
        const delta = resizeStartX.current - e.clientX; // drag left = wider
        setInspectorWidth(Math.max(280, Math.min(620, resizeStartWidth.current + delta)));
      }
      if (isResizingSidebar.current) {
        const delta = e.clientX - sidebarResizeStartX.current; // drag right = wider
        setSidebarWidth(Math.max(160, Math.min(480, sidebarResizeStartWidth.current + delta)));
      }
    }
    function onMouseUp() {
      isResizingInspector.current = false;
      isResizingSidebar.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }
      // Ctrl+D: duplicate selected block
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        if (selectedNodeId && selectedBlockId) {
          handleDuplicateComponent(selectedNodeId, selectedBlockId);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleUndo, handleRedo, selectedNodeId, selectedBlockId]);

  // Move component up/down
  function handleMoveComponent(
    stepId: string,
    componentId: string,
    direction: "up" | "down"
  ) {
    if (flowData) pushHistory(flowData);
    setFlowData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        steps: prev.steps.map((s) => {
          if (s.id !== stepId) return s;
          const comps = [...(s.components ?? [])].sort(
            (a, b) => a.sortOrder - b.sortOrder
          );
          const idx = comps.findIndex((c) => c.id === componentId);
          if (idx < 0) return s;
          const swapIdx = direction === "up" ? idx - 1 : idx + 1;
          if (swapIdx < 0 || swapIdx >= comps.length) return s;
          const updated = comps.map((c, i) => {
            if (i === idx) return { ...c, sortOrder: comps[swapIdx]!.sortOrder };
            if (i === swapIdx) return { ...c, sortOrder: comps[idx]!.sortOrder };
            return c;
          });
          return { ...s, components: updated };
        }),
      };
    });
    markDirty();
  }

  // Duplicate component
  function handleDuplicateComponent(stepId: string, componentId: string) {
    if (!flowData) return;
    if (flowData) pushHistory(flowData);
    setFlowData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        steps: prev.steps.map((s) => {
          if (s.id !== stepId) return s;
          const sorted = [...(s.components ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
          const idx = sorted.findIndex((c) => c.id === componentId);
          if (idx < 0) return s;
          const original = sorted[idx]!;
          const newComp: StepComponent = {
            ...JSON.parse(JSON.stringify(original)),
            id: crypto.randomUUID(),
            fieldKey: `${original.fieldKey}_copy_${Date.now()}`,
            sortOrder: original.sortOrder + 0.5,
          };
          const updated = [...sorted, newComp]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((c, i) => ({ ...c, sortOrder: i }));
          return { ...s, components: updated };
        }),
      };
    });
    markDirty();
  }

  // Delete component
  function handleDeleteComponent(stepId: string, componentId: string) {
    if (flowData) pushHistory(flowData);
    setFlowData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        steps: prev.steps.map((s) => {
          if (s.id !== stepId) return s;
          return { ...s, components: (s.components ?? []).filter((c) => c.id !== componentId) };
        }),
      };
    });
    if (selectedBlockId === componentId) setSelectedBlockId(null);
    markDirty();
  }

  // Delete step/page
  function handleDeleteStep(stepId: string) {
    if (!flowData) return;
    const visibleSteps = flowData.steps.filter((s) => s.type !== "start" && s.type !== "end");
    if (visibleSteps.length <= 1) return; // keep at least one page
    pushHistory(flowData);
    setFlowData((prev) => {
      if (!prev) return prev;
      const newSteps = prev.steps.filter((s) => s.id !== stepId);
      // Re-normalize sortOrder
      let order = 0;
      const normalized = newSteps.map((s) =>
        s.type === "start" || s.type === "end" ? s : { ...s, sortOrder: order++ }
      );
      return { ...prev, steps: normalized };
    });
    if (selectedNodeId === stepId) selectNode(null);
    markDirty();
  }

  // Duplicate step/page — inserts right after the source step
  function handleDuplicateStep(stepId: string) {
    if (!flowData) return;
    pushHistory(flowData);
    const original = flowData.steps.find((s) => s.id === stepId);
    if (!original) return;
    const newId = crypto.randomUUID();
    const sourceLabel = original.label || (original.config as { title?: string }).title || "";
    const dupStep: FlowStep = {
      ...JSON.parse(JSON.stringify(original)),
      id: newId,
      label: sourceLabel ? `${sourceLabel} (Kopie)` : "",
      positionX: original.positionX + 50,
      positionY: original.positionY + 50,
      components: (original.components ?? []).map((c) => ({
        ...JSON.parse(JSON.stringify(c)),
        id: crypto.randomUUID(),
        stepId: newId,
        fieldKey: `${c.fieldKey}_copy`,
      })),
    };
    setFlowData((prev) => {
      if (!prev) return prev;
      // Insert immediately after the source step in the array
      const srcIdx = prev.steps.findIndex((s) => s.id === stepId);
      const newSteps = [...prev.steps];
      newSteps.splice(srcIdx + 1, 0, dupStep);
      // Re-normalize sortOrder for all non-placeholder steps
      let order = 0;
      const normalized = newSteps.map((s) =>
        s.type === "start" || s.type === "end" ? s : { ...s, sortOrder: order++ }
      );
      return { ...prev, steps: normalized };
    });
    selectNode(newId);
    markDirty();
  }

  // Move step — drag-and-drop reorder in sidebar
  function handleMoveStep(fromId: string, toId: string) {
    if (fromId === toId || !flowData) return;
    pushHistory(flowData);
    setFlowData((prev) => {
      if (!prev) return prev;
      const steps = [...prev.steps];
      const fromIdx = steps.findIndex((s) => s.id === fromId);
      const toIdx = steps.findIndex((s) => s.id === toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = steps.splice(fromIdx, 1);
      steps.splice(toIdx, 0, moved!);
      // Re-normalize sortOrder
      let order = 0;
      const normalized = steps.map((s) =>
        s.type === "start" || s.type === "end" ? s : { ...s, sortOrder: order++ }
      );
      return { ...prev, steps: normalized };
    });
    markDirty();
  }

  // Load flow data
  const loadFlow = useCallback(async () => {
    try {
      const res = await fetch(`/api/flows/${flowId}`);
      if (!res.ok) throw new Error("Flow not found");
      const data = await res.json();

      const flowDef: FlowDefinition = {
        id: data.id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        status: data.status,
        settings: data.settings
          ? typeof data.settings === "string"
            ? JSON.parse(data.settings)
            : data.settings
          : {
              theme: { ...DEFAULT_THEME },
              showProgressBar: true,
              progressBarStyle: "dots" as const,
              submitButtonText: "Submit",
              successMessage: "Thank you!",
            },
        steps: (data.steps ?? []).map((s: FlowStep) => ({
          ...s,
          config: s.config
            ? typeof s.config === "string"
              ? JSON.parse(s.config as unknown as string)
              : s.config
            : {
                title: s.label,
                layout: "single-column",
                showProgress: true,
              },
          components: (s.components ?? []).map((c: StepComponent) => ({
            ...c,
            config:
              typeof c.config === "string"
                ? JSON.parse(c.config as unknown as string)
                : c.config,
            validation: c.validation
              ? typeof c.validation === "string"
                ? JSON.parse(c.validation as unknown as string)
                : c.validation
              : undefined,
            visibilityConditions: c.visibilityConditions
              ? typeof c.visibilityConditions === "string"
                ? JSON.parse(c.visibilityConditions as unknown as string)
                : c.visibilityConditions
              : undefined,
          })),
        })),
        edges: data.edges ?? [],
        startStepId:
          data.steps?.find((s: FlowStep) => s.type === "start")?.id ?? "",
        displayRules: data.displayRules
          ? typeof data.displayRules === "string"
            ? JSON.parse(data.displayRules)
            : data.displayRules
          : [],
        aiPlan: data.aiPlan ?? undefined,
        aiBriefing: data.aiBriefing ?? undefined,
      };

      setFlowData(flowDef);
      setFlow(flowDef);
      setFlowName(flowDef.name);
      useEditorStore.setState({ isDirty: false, isSaving: false });

      // Auto-select first step
      const firstStep = flowDef.steps.find(
        (s) => s.type !== "start" && s.type !== "end"
      );
      if (firstStep) selectNode(firstStep.id);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load flow"
      );
    } finally {
      setIsLoading(false);
    }
  }, [flowId, setFlow, selectNode]);

  useEffect(() => {
    loadFlow();
  }, [loadFlow]);

  // Save handler — full sync: POST new entities, PATCH existing, DELETE removed
  async function handleSave() {
    if (!flowData) return;
    setSaveError(null);
    useEditorStore.setState({ isSaving: true });

    try {
      // 1. Fetch current DB state to know what already exists
      const dbRes = await fetch(`/api/flows/${flowId}`);
      if (!dbRes.ok) throw new Error("Failed to fetch current flow state");
      const dbFlow = await dbRes.json() as {
        steps?: Array<{ id: string; components?: Array<{ id: string }> }>;
        edges?: Array<{ id: string }>;
      };

      const dbStepIds = new Set((dbFlow.steps ?? []).map((s) => s.id));
      const dbCompIds = new Set(
        (dbFlow.steps ?? []).flatMap((s) => (s.components ?? []).map((c) => c.id))
      );

      // 2. Save flow metadata
      const flowRes = await fetch(`/api/flows/${flowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: flowName,
          settings: JSON.stringify(flowData.settings),
          displayRules: JSON.stringify(flowData.displayRules ?? []),
          ...(flowData.aiPlan !== undefined ? { aiPlan: flowData.aiPlan } : {}),
          ...(flowData.aiBriefing !== undefined ? { aiBriefing: flowData.aiBriefing } : {}),
        }),
      });
      if (!flowRes.ok) throw new Error("Failed to save flow");

      // 3. Delete steps removed from local state
      const localStepIds = new Set(flowData.steps.map((s) => s.id));
      for (const dbStepId of dbStepIds) {
        if (!localStepIds.has(dbStepId)) {
          await fetch(`/api/flows/${flowId}/steps/${dbStepId}`, { method: "DELETE" });
        }
      }

      // 4. Delete components removed from local state
      const localCompIds = new Set(
        flowData.steps.flatMap((s) => (s.components ?? []).map((c) => c.id))
      );
      for (const step of dbFlow.steps ?? []) {
        for (const comp of step.components ?? []) {
          if (!localCompIds.has(comp.id)) {
            await fetch(
              `/api/flows/${flowId}/steps/${step.id}/components/${comp.id}`,
              { method: "DELETE" }
            );
          }
        }
      }

      // 5. Create or update steps and their components
      for (const step of flowData.steps) {
        if (dbStepIds.has(step.id)) {
          // PATCH existing step
          const res = await fetch(`/api/flows/${flowId}/steps/${step.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              label: step.label,
              positionX: step.positionX,
              positionY: step.positionY,
              config: JSON.stringify(step.config),
              sortOrder: step.sortOrder,
            }),
          });
          if (!res.ok) throw new Error(`Failed to update step ${step.id}`);
        } else {
          // POST new step — pass the client-generated id so future PATCHes work
          const res = await fetch(`/api/flows/${flowId}/steps`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: step.id,
              type: step.type,
              label: step.label,
              positionX: step.positionX,
              positionY: step.positionY,
              config: JSON.stringify(step.config),
              sortOrder: step.sortOrder,
            }),
          });
          if (!res.ok) throw new Error(`Failed to create step ${step.id}`);
        }

        // 6. Create or update components for this step
        for (const comp of step.components ?? []) {
          if (dbCompIds.has(comp.id)) {
            // PATCH existing component
            const res = await fetch(
              `/api/flows/${flowId}/steps/${step.id}/components/${comp.id}`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  label: comp.label,
                  fieldKey: comp.fieldKey,
                  config: JSON.stringify(comp.config),
                  sortOrder: comp.sortOrder,
                  required: comp.required ?? false,
                  visibilityConditions: comp.visibilityConditions
                    ? JSON.stringify(comp.visibilityConditions)
                    : null,
                  visibilityLogic: comp.visibilityLogic ?? "AND",
                }),
              }
            );
            if (!res.ok) throw new Error(`Failed to update component ${comp.id}`);
          } else {
            // POST new component — pass client id
            const res = await fetch(
              `/api/flows/${flowId}/steps/${step.id}/components`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: comp.id,
                  componentType: comp.componentType,
                  fieldKey: comp.fieldKey,
                  label: comp.label,
                  config: JSON.stringify(comp.config),
                  sortOrder: comp.sortOrder,
                  required: comp.required ?? false,
                  visibilityConditions: comp.visibilityConditions
                    ? JSON.stringify(comp.visibilityConditions)
                    : null,
                  visibilityLogic: comp.visibilityLogic ?? "AND",
                }),
              }
            );
            if (!res.ok) throw new Error(`Failed to create component ${comp.id}`);
          }
        }
      }

      // 7. Sync edges — delete all DB edges then re-create from local state
      const dbEdgeIds = new Set((dbFlow.edges ?? []).map((e) => e.id));
      for (const dbEdgeId of dbEdgeIds) {
        await fetch(`/api/flows/${flowId}/edges?edgeId=${dbEdgeId}`, { method: "DELETE" });
      }
      for (const edge of flowData.edges) {
        const res = await fetch(`/api/flows/${flowId}/edges`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceStepId: edge.sourceStepId,
            targetStepId: edge.targetStepId,
            conditionType: edge.conditionType,
            conditionFieldKey: edge.conditionFieldKey ?? undefined,
            conditionValue: edge.conditionValue ?? undefined,
            label: edge.label ?? undefined,
            priority: edge.priority ?? 0,
          }),
        });
      }

      markSaved();
      setLastSavedAt(new Date());
      setAutosaveStatus("saved");
      setTimeout(() => setAutosaveStatus("idle"), 3000);
    } catch (err) {
      console.error("Save failed:", err);
      setSaveError("Speichern fehlgeschlagen. Bitte erneut versuchen.");
      setAutosaveStatus("idle");
      useEditorStore.setState({ isSaving: false });
    }
  }

  // AI Operations executor — applies a list of FlowOperations from the AI chat sequentially
  async function applyAIOperations(ops: FlowOperation[]): Promise<void> {
    if (!flowData) throw new Error("Kein Flow geladen");

    // Push undo snapshot before applying
    pushHistory(flowData);

    let updatedFlow = { ...flowData };

    for (const op of ops) {
      if (op.type === "add_step") {
        const newStep = {
          id: crypto.randomUUID(),
          flowId,
          type: (op.stepType ?? "step") as "step",
          label: op.label,
          positionX: 300 + updatedFlow.steps.length * 220,
          positionY: 100,
          config: (op.config ?? { title: op.label, layout: "single-column", showProgress: true }) as unknown as import("@opensoftware/openflow-core").StepConfig,
          components: [] as import("@opensoftware/openflow-core").StepComponent[],
          sortOrder: updatedFlow.steps.filter(s => s.type === "step").length,
        };
        const res = await fetch(`/api/flows/${flowId}/steps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...newStep, config: JSON.stringify(newStep.config) }),
        });
        if (!res.ok) throw new Error(`add_step fehlgeschlagen`);
        const created = await res.json();
        updatedFlow = { ...updatedFlow, steps: [...updatedFlow.steps, { ...newStep, id: created.id ?? newStep.id } as import("@opensoftware/openflow-core").FlowStep] };

      } else if (op.type === "delete_step") {
        const res = await fetch(`/api/flows/${flowId}/steps/${op.stepId}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`delete_step fehlgeschlagen`);
        updatedFlow = { ...updatedFlow, steps: updatedFlow.steps.filter(s => s.id !== op.stepId) };

      } else if (op.type === "update_step") {
        const step = updatedFlow.steps.find(s => s.id === op.stepId);
        if (!step) throw new Error(`Seite ${op.stepId} nicht gefunden`);
        const updatedStep = {
          ...step,
          ...(op.changes.label ? { label: op.changes.label } : {}),
          config: op.changes.config ? { ...(step.config as unknown as Record<string, unknown>), ...op.changes.config } as unknown as import("@opensoftware/openflow-core").StepConfig : step.config,
        };
        const res = await fetch(`/api/flows/${flowId}/steps/${op.stepId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: updatedStep.label,
            config: JSON.stringify(updatedStep.config),
          }),
        });
        if (!res.ok) throw new Error(`update_step fehlgeschlagen`);
        updatedFlow = { ...updatedFlow, steps: updatedFlow.steps.map(s => s.id === op.stepId ? updatedStep : s) };

      } else if (op.type === "add_component") {
        const step = updatedFlow.steps.find(s => s.id === op.stepId);
        if (!step) throw new Error(`Seite ${op.stepId} nicht gefunden`);
        const newComp = {
          id: crypto.randomUUID(),
          stepId: op.stepId,
          componentType: op.component.componentType,
          fieldKey: op.component.fieldKey,
          label: op.component.label ?? op.component.fieldKey,
          required: op.component.required ?? false,
          config: op.component.config ?? {},
          validation: undefined,
          sortOrder: step.components.length,
          visibilityConditions: undefined,
          visibilityLogic: "AND" as const,
        };
        const res = await fetch(`/api/flows/${flowId}/steps/${op.stepId}/components`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...newComp, config: JSON.stringify(newComp.config) }),
        });
        if (!res.ok) throw new Error(`add_component fehlgeschlagen`);
        const created = await res.json();
        const finalComp = { ...newComp, id: created.id ?? newComp.id };
        updatedFlow = {
          ...updatedFlow,
          steps: updatedFlow.steps.map(s =>
            s.id === op.stepId ? { ...s, components: [...s.components, finalComp] } : s
          ),
        };

      } else if (op.type === "update_component") {
        const step = updatedFlow.steps.find(s => s.id === op.stepId);
        const comp = step?.components.find(c => c.id === op.componentId);
        if (!comp) throw new Error(`Komponente ${op.componentId} nicht gefunden`);
        const updatedComp = {
          ...comp,
          ...(op.changes.label !== undefined ? { label: op.changes.label } : {}),
          ...(op.changes.fieldKey !== undefined ? { fieldKey: op.changes.fieldKey } : {}),
          ...(op.changes.required !== undefined ? { required: op.changes.required } : {}),
          config: op.changes.config ? { ...comp.config, ...op.changes.config } : comp.config,
        };
        const res = await fetch(`/api/flows/${flowId}/steps/${op.stepId}/components/${op.componentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: updatedComp.label,
            fieldKey: updatedComp.fieldKey,
            required: updatedComp.required,
            config: JSON.stringify(updatedComp.config),
          }),
        });
        if (!res.ok) throw new Error(`update_component fehlgeschlagen`);
        updatedFlow = {
          ...updatedFlow,
          steps: updatedFlow.steps.map(s =>
            s.id === op.stepId
              ? { ...s, components: s.components.map(c => c.id === op.componentId ? updatedComp : c) }
              : s
          ),
        };

      } else if (op.type === "delete_component") {
        const res = await fetch(`/api/flows/${flowId}/steps/${op.stepId}/components/${op.componentId}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`delete_component fehlgeschlagen`);
        updatedFlow = {
          ...updatedFlow,
          steps: updatedFlow.steps.map(s =>
            s.id === op.stepId ? { ...s, components: s.components.filter(c => c.id !== op.componentId) } : s
          ),
        };

      } else if (op.type === "add_edge") {
        const res = await fetch(`/api/flows/${flowId}/edges`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceStepId: op.sourceStepId,
            targetStepId: op.targetStepId,
            conditionType: op.conditionType ?? "always",
            conditionFieldKey: op.conditionFieldKey,
            conditionValue: op.conditionValue,
            priority: op.priority ?? 0,
          }),
        });
        if (!res.ok) throw new Error(`add_edge fehlgeschlagen`);
        const created = await res.json();
        updatedFlow = { ...updatedFlow, edges: [...updatedFlow.edges, created] };

      } else if (op.type === "update_edge") {
        const res = await fetch(`/api/flows/${flowId}/edges`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: op.edgeId, ...op.changes }),
        });
        if (!res.ok) throw new Error(`update_edge fehlgeschlagen`);
        updatedFlow = {
          ...updatedFlow,
          edges: updatedFlow.edges.map(e => e.id === op.edgeId ? { ...e, ...op.changes } as import("@opensoftware/openflow-core").FlowEdge : e),
        };

      } else if (op.type === "delete_edge") {
        const res = await fetch(`/api/flows/${flowId}/edges?edgeId=${op.edgeId}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`delete_edge fehlgeschlagen`);
        updatedFlow = { ...updatedFlow, edges: updatedFlow.edges.filter(e => e.id !== op.edgeId) };

      } else if (op.type === "update_settings") {
        updatedFlow = { ...updatedFlow, settings: { ...updatedFlow.settings, ...op.changes } as typeof updatedFlow.settings };
      }
    }

    setFlowData(updatedFlow);
    setFlow(updatedFlow);
    markDirtyWithHistory();
  }

  // Publish handler
  async function handlePublish() {
    try {
      const res = await fetch(`/api/flows/${flowId}/publish`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Publish failed");
      setFlowData((prev) =>
        prev ? { ...prev, status: "published" } : prev
      );
    } catch (err) {
      console.error("Publish failed:", err);
    }
  }

  // Theme change
  function handleThemeChange(newTheme: FlowTheme) {
    setFlowData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        settings: { ...prev.settings, theme: newTheme },
      };
    });
    markDirtyWithHistory();
  }

  // Add block
  function handleAddBlock(componentType: string, atIndex?: number) {
    const targetStepId = selectedNodeId;
    if (!targetStepId || !flowData) return;

    const step = flowData.steps.find((s) => s.id === targetStepId);
    const existingComps = step?.components ?? [];
    const sortOrder =
      atIndex !== undefined ? atIndex : existingComps.length;

    const compDef = (COMPONENT_DEFINITIONS as Record<string, { defaultConfig?: Record<string, unknown> }>)[componentType];
    const newComponent: StepComponent = {
      id: crypto.randomUUID(),
      stepId: targetStepId,
      componentType,
      fieldKey: `${componentType.replace(/-/g, "_")}_${Date.now()}`,
      config: compDef?.defaultConfig ? { ...compDef.defaultConfig } : {},
      sortOrder,
      required: false,
    };

    setFlowData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        steps: prev.steps.map((s) => {
          if (s.id !== targetStepId) return s;
          let comps = [...(s.components ?? [])];
          if (atIndex !== undefined) {
            // Shift sort orders of existing components at/after this index
            comps = comps.map((c) =>
              c.sortOrder >= atIndex
                ? { ...c, sortOrder: c.sortOrder + 1 }
                : c
            );
          }
          return { ...s, components: [...comps, newComponent] };
        }),
      };
    });
    markDirtyWithHistory();
    setBlockPickerOpen(false);
    setBlockPickerSearch("");
    setInsertPickerIndex(null);
    setSelectedBlockId(newComponent.id);
  }

  // Add new step/page
  function handleAddStep() {
    if (!flowData) return;
    const stepSteps = flowData.steps.filter(
      (s) => s.type !== "start" && s.type !== "end"
    );
    const newStep: FlowStep = {
      id: crypto.randomUUID(),
      flowId,
      type: "step",
      label: "",
      positionX: 300,
      positionY: (stepSteps.length + 1) * 180 + 50,
      config: {
        title: "",
        layout: "single-column",
        showProgress: true,
      },
      components: [],
      sortOrder: stepSteps.length,
    };
    setFlowData((prev) => {
      if (!prev) return prev;
      return { ...prev, steps: [...prev.steps, newStep] };
    });
    selectNode(newStep.id);
    markDirtyWithHistory();
  }

  // Step label change
  function handleStepLabelChange(stepId: string, label: string) {
    setFlowData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        steps: prev.steps.map((s) =>
          s.id === stepId ? { ...s, label } : s
        ),
      };
    });
    markDirtyWithHistory();
  }

  const selectedStep = flowData?.steps.find((s) => s.id === selectedNodeId);
  const currentTheme: FlowTheme = {
    ...DEFAULT_THEME,
    ...(flowData?.settings?.theme ?? {}),
  };

  const sortedComponents = selectedStep
    ? [...(selectedStep.components ?? [])].sort(
        (a, b) => a.sortOrder - b.sortOrder
      )
    : [];

  // ─── Loading / Error States ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#4C5FD5] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Flow-Editor wird geladen...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-2">
            Fehler beim Laden des Flows
          </p>
          <p className="text-sm text-gray-500 mb-4">{loadError}</p>
          <Link
            href={`/${locale}/admin/flows`}
            className="text-sm text-[#4C5FD5] hover:underline"
          >
            Zurueck zu Flows
          </Link>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Icon Sidebar (48px) ── */}
      <div className="w-12 shrink-0 bg-[#1a1a2e] flex flex-col items-center py-3 gap-1">
        {/* + Block button */}
        <button
          onClick={() => {
            setBlockPickerOpen(!blockPickerOpen);
            setBlockPickerSearch("");
          }}
          disabled={!selectedNodeId}
          className={`w-9 h-9 rounded-lg text-white flex items-center justify-center mb-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            blockPickerOpen
              ? "bg-red-500 hover:bg-red-600"
              : "bg-[#4C5FD5] hover:bg-[#3d4fc0]"
          }`}
          title={blockPickerOpen ? "Schließen" : "+ Block"}
        >
          {blockPickerOpen ? <X size={18} /> : <Plus size={18} />}
        </button>

        {/* Editor */}
        <SidebarIconButton
          icon={Layers}
          label="Editor"
          isActive={activeSidebarTab === "editor"}
          onClick={() => setActiveSidebarTab("editor")}
        />
        {/* Regeln */}
        <SidebarIconButton
          icon={GitBranch}
          label="Regeln"
          isActive={activeSidebarTab === "regeln"}
          onClick={() => setActiveSidebarTab("regeln")}
        />
        {/* Design */}
        <SidebarIconButton
          icon={Palette}
          label="Design"
          isActive={activeSidebarTab === "design"}
          onClick={() => setActiveSidebarTab("design")}
        />
        {/* Code */}
        <SidebarIconButton
          icon={Code}
          label="Code"
          isActive={activeSidebarTab === "code"}
          onClick={() => setActiveSidebarTab("code")}
        />
        {/* Preise */}
        <SidebarIconButton
          icon={BadgeEuro}
          label="Preise"
          isActive={activeSidebarTab === "preise"}
          onClick={() => setActiveSidebarTab("preise")}
        />

        {/* KI */}
        <SidebarIconButton
          icon={Sparkles}
          label="KI"
          isActive={showAIPanel}
          onClick={() => setShowAIPanel((v) => !v)}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Hilfe */}
        <SidebarIconButton
          icon={HelpCircle}
          label="Hilfe"
          isActive={false}
          onClick={() => {}}
        />
        {/* Einklappen */}
        <SidebarIconButton
          icon={PanelLeftClose}
          label="Einklappen"
          isActive={false}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* ── Pages Panel — resizable ── */}
      {!sidebarCollapsed && (
        <div className="relative shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden" style={{ width: sidebarWidth }}>
          {/* Drag handle — right edge */}
          <div
            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 group"
            onMouseDown={(e) => {
              isResizingSidebar.current = true;
              sidebarResizeStartX.current = e.clientX;
              sidebarResizeStartWidth.current = sidebarWidth;
              document.body.style.cursor = "col-resize";
              document.body.style.userSelect = "none";
              e.preventDefault();
            }}
          >
            <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-transparent group-hover:bg-indigo-400 transition-colors" />
          </div>
          {/* ── Flow name ── */}
          <div className="px-3 py-2 border-b border-gray-100 shrink-0">
            <input
              value={flowName}
              onChange={(e) => { setFlowName(e.target.value); markDirty(); }}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
              className="w-full text-sm font-semibold text-gray-800 bg-transparent border border-transparent rounded px-1 py-0.5 hover:border-gray-200 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300 transition-colors truncate"
              placeholder="Flow-Titel"
              title="Flow-Titel bearbeiten"
            />
          </div>

          {/* ── Block Palette (replaces panel when open) ── */}
          {blockPickerOpen && selectedNodeId ? (
            <div className="flex flex-col h-full">
              {/* Close header */}
              <button
                onClick={() => {
                  setBlockPickerOpen(false);
                  setBlockPickerSearch("");
                }}
                className="flex items-center gap-2 px-3 py-2.5 bg-gray-900 text-white text-xs font-semibold shrink-0 hover:bg-gray-800 transition-colors"
              >
                <X size={14} />
                Schließen
              </button>

              {/* Search field */}
              <div className="px-3 py-2 shrink-0 border-b border-gray-200">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={blockPickerSearch}
                    onChange={(e) => setBlockPickerSearch(e.target.value)}
                    placeholder="Suchen"
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-[#4C5FD5] focus:bg-white transition-colors"
                    autoFocus
                  />
                </div>
              </div>

              {/* Categorized block list */}
              <div className="flex-1 overflow-y-auto px-2 pb-3">
                {PALETTE_CATEGORIES.map((cat) => {
                  const filteredItems = cat.items.filter((item) =>
                    item.label.toLowerCase().includes(blockPickerSearch.toLowerCase())
                  );
                  if (filteredItems.length === 0) return null;
                  return (
                    <div key={cat.label}>
                      <p className="text-xs uppercase text-gray-400 mt-4 mb-2 px-1 font-semibold tracking-wide">
                        {cat.label}
                      </p>
                      {filteredItems.map((item, idx) => {
                        const ItemIcon = item.icon;
                        return (
                          <button
                            key={`${item.type}-${idx}`}
                            onClick={() =>
                              handleAddBlock(
                                item.type,
                                insertPickerIndex ?? undefined
                              )
                            }
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded hover:bg-gray-100 transition-colors text-left"
                          >
                            <ItemIcon size={16} className="text-gray-500 shrink-0" />
                            <span className="text-sm text-gray-700">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
          <>
          {activeSidebarTab === "editor" && (
            <>
              {/* Sub-tabs: Seiten / Ebenen */}
              <div className="flex border-b border-gray-200 shrink-0">
                <button
                  onClick={() => setPagesSubTab("seiten")}
                  className={`flex-1 px-3 py-2.5 text-xs font-semibold transition-colors relative ${
                    pagesSubTab === "seiten"
                      ? "text-[#4C5FD5]"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Seiten
                  {pagesSubTab === "seiten" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4C5FD5]" />
                  )}
                </button>
                <button
                  onClick={() => setPagesSubTab("ebenen")}
                  className={`flex-1 px-3 py-2.5 text-xs font-semibold transition-colors relative ${
                    pagesSubTab === "ebenen"
                      ? "text-[#4C5FD5]"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Ebenen
                  {pagesSubTab === "ebenen" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4C5FD5]" />
                  )}
                </button>
              </div>

              {/* Pages sub-tab */}
              {pagesSubTab === "seiten" && (
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                  {flowData?.steps
                    .filter((s) => s.type !== "start" && s.type !== "end")
                    .map((step, idx) => {
                      const isActive = selectedNodeId === step.id;
                      const comps = step.components ?? [];
                      return (
                        <div
                          key={step.id}
                          draggable
                          onDragStart={() => setDragStepId(step.id)}
                          onDragOver={(e) => { e.preventDefault(); setDragOverStepId(step.id); }}
                          onDragEnd={() => { setDragStepId(null); setDragOverStepId(null); }}
                          onDrop={(e) => { e.preventDefault(); if (dragStepId) handleMoveStep(dragStepId, step.id); setDragStepId(null); setDragOverStepId(null); }}
                          className={`group/step relative rounded-xl border-2 transition-all overflow-hidden ${
                            isActive
                              ? "border-[#4C5FD5] shadow-md"
                              : dragOverStepId === step.id && dragStepId !== step.id
                              ? "border-indigo-300 shadow-md bg-indigo-50/20"
                              : "border-gray-200 hover:border-gray-300 shadow-sm"
                          } ${dragStepId === step.id ? "opacity-50" : ""}`}
                        >
                          {/* Thumbnail — scaled BlockPreview */}
                          <button
                            onClick={() => {
                              selectNode(step.id);
                              setSelectedBlockId(null);
                              if (isPreviewMode) {
                                useRendererStore.getState().goToStep(step.id);
                              }
                            }}
                            className="w-full text-left"
                          >
                            <div className="relative bg-white overflow-hidden" style={{ height: "120px" }}>
                              {/* Scaled page content — scale(0.46) maps ~420px form width into ~194px container */}
                              <div
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  transform: "scale(0.46)",
                                  transformOrigin: "top left",
                                  width: "218%",
                                  padding: "12px 16px",
                                  pointerEvents: "none",
                                  background: currentTheme.backgroundColor,
                                }}
                              >
                                {(step.config as { title?: string }).title && (
                                  <div className="font-bold text-gray-800 mb-2 truncate" style={{ fontSize: "1.125rem", color: currentTheme.headingColor }}>
                                    {(step.config as { title?: string }).title}
                                  </div>
                                )}
                                {comps.length === 0 ? (
                                  <p className="text-gray-300 italic mt-8 text-center" style={{ fontSize: "0.875rem" }}>Leere Seite</p>
                                ) : (
                                  comps.slice(0, 8).map((comp, ci) => (
                                    <BlockPreview
                                      key={comp.id}
                                      comp={comp}
                                      isSelected={false}
                                      index={ci}
                                      total={comps.length}
                                      onSelect={() => {}}
                                      onMove={() => {}}
                                      onDuplicate={() => {}}
                                      onDelete={() => {}}
                                      theme={currentTheme}
                                      previewMode={true}
                                    />
                                  ))
                                )}
                              </div>
                              {/* Page number badge */}
                              <div
                                className={`absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold z-10 ${
                                  isActive ? "bg-[#4C5FD5] text-white" : "bg-gray-300 text-white"
                                }`}
                              >
                                {idx + 1}
                              </div>
                            </div>
                          </button>
                          {/* Step name footer — separate from button so it can be edited inline */}
                          <div
                            className="px-2 py-1.5 bg-gray-50 border-t border-gray-100 cursor-pointer"
                            onClick={() => { selectNode(step.id); setSelectedBlockId(null); }}
                          >
                            {renamingStepId === step.id ? (
                              <input
                                autoFocus
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onBlur={() => {
                                  setFlowData((prev) =>
                                    prev
                                      ? { ...prev, steps: prev.steps.map((s) => s.id === step.id ? { ...s, label: renameValue } : s) }
                                      : prev
                                  );
                                  markDirtyWithHistory();
                                  setRenamingStepId(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") e.currentTarget.blur();
                                  if (e.key === "Escape") setRenamingStepId(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full text-[11px] font-semibold bg-transparent border-b border-indigo-400 outline-none text-gray-700"
                                placeholder={(step.config as { title?: string }).title || `Seite ${idx + 1}`}
                              />
                            ) : (
                              <div className="flex items-center gap-1 group/name">
                                <GripVertical size={10} className="text-gray-300 group-hover/step:text-gray-400 shrink-0 cursor-grab active:cursor-grabbing" />
                                <p className={`text-[11px] font-semibold truncate flex-1 ${isActive ? "text-[#4C5FD5]" : step.label ? "text-gray-700" : "text-gray-400 italic"}`}>
                                  {step.label || (step.config as { title?: string }).title || `Seite ${idx + 1}`}
                                </p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRenamingStepId(step.id);
                                    setRenameValue(step.label || "");
                                  }}
                                  className="opacity-0 group-hover/step:opacity-100 text-gray-400 hover:text-indigo-500 transition-opacity shrink-0"
                                  title="Umbenennen"
                                >
                                  <Pencil size={9} />
                                </button>
                              </div>
                            )}
                            <p className="text-[9px] text-gray-400">
                              {comps.length} Block{comps.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                          {/* Duplicate + Delete step buttons */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDuplicateStep(step.id); }}
                            className="absolute top-1 right-7 opacity-0 group-hover/step:opacity-100 transition-opacity w-5 h-5 rounded bg-white/80 border border-gray-200 flex items-center justify-center hover:bg-blue-50 hover:border-blue-300"
                            title="Seite duplizieren"
                          >
                            <CopyPlus size={10} className="text-gray-500" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteStep(step.id); }}
                            className="absolute top-1 right-1 opacity-0 group-hover/step:opacity-100 transition-opacity w-5 h-5 rounded bg-white/80 border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:border-red-300"
                            title="Seite löschen"
                          >
                            <Trash2 size={10} className="text-gray-500 hover:text-red-500" />
                          </button>
                        </div>
                      );
                    })}

                  {/* Add page button */}
                  <button
                    onClick={handleAddStep}
                    className="w-full py-2 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:border-[#4C5FD5] hover:text-[#4C5FD5] hover:bg-blue-50/50 transition-colors"
                  >
                    + Seite hinzufuegen
                  </button>
                </div>
              )}

              {/* Layers sub-tab */}
              {pagesSubTab === "ebenen" && (
                <div className="flex-1 overflow-y-auto px-3 py-3">
                  {selectedStep ? (
                    <>
                      <div className="px-1 py-1 mb-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {selectedStep.label} - Ebenen
                        </p>
                      </div>
                      {sortedComponents.length === 0 ? (
                        <p className="text-xs text-gray-400 italic py-3">
                          Keine Komponenten in diesem Schritt.
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {sortedComponents.map((comp, idx) => {
                            const IconComp =
                              COMPONENT_ICON_MAP[comp.componentType] ?? Type;
                            const blockColor =
                              COMPONENT_COLOR_MAP[comp.componentType] ??
                              "#6366f1";
                            return (
                              <div
                                key={comp.id}
                                onClick={() => setSelectedBlockId(comp.id)}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                                  selectedBlockId === comp.id
                                    ? "border-[#4C5FD5] bg-blue-50"
                                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
                                }`}
                              >
                                <span
                                  className="shrink-0 w-5 h-5 rounded flex items-center justify-center"
                                  style={{
                                    backgroundColor: `${blockColor}15`,
                                    color: blockColor,
                                  }}
                                >
                                  <IconComp size={11} />
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-800 truncate">
                                    {comp.label ||
                                      COMPONENT_LABEL_MAP[
                                        comp.componentType
                                      ] ||
                                      comp.componentType}
                                  </p>
                                  <p className="text-[10px] text-gray-400 truncate">
                                    {comp.fieldKey}
                                  </p>
                                </div>
                                <div className="flex flex-col gap-0.5 shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveComponent(
                                        selectedStep.id,
                                        comp.id,
                                        "up"
                                      );
                                    }}
                                    disabled={idx === 0}
                                    className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-20"
                                  >
                                    <ChevronUp size={12} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveComponent(
                                        selectedStep.id,
                                        comp.id,
                                        "down"
                                      );
                                    }}
                                    disabled={
                                      idx === sortedComponents.length - 1
                                    }
                                    className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-20"
                                  >
                                    <ChevronDown size={12} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 italic py-3">
                      Waehle einen Schritt, um seine Ebenen zu sehen.
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {activeSidebarTab === "design" && (
            <div className="flex-1 overflow-y-auto">
              <DesignPanel theme={currentTheme} onChange={handleThemeChange} />
            </div>
          )}

          {activeSidebarTab === "regeln" && flowData && (
            <div className="flex-1 overflow-y-auto">
              <RulesPanel
                flowData={flowData}
                onEdgesChange={(newEdges: FlowEdge[]) => {
                  setFlowData((prev) =>
                    prev ? { ...prev, edges: newEdges } : prev
                  );
                  markDirtyWithHistory();
                }}
              />
              <div className="border-t border-gray-200" />
              <DisplayRulesPanel
                flowData={flowData}
                onChange={(rules) => {
                  setFlowData((prev) =>
                    prev ? { ...prev, displayRules: rules } : prev
                  );
                  markDirtyWithHistory();
                }}
              />
            </div>
          )}

          {activeSidebarTab === "code" && flowData?.settings && (
            <div className="flex-1 overflow-y-auto">
              <CodePanel
                settings={flowData.settings}
                onChange={(partial) => {
                  setFlowData((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      settings: { ...prev.settings, ...partial },
                    };
                  });
                  markDirtyWithHistory();
                }}
              />
            </div>
          )}

          {activeSidebarTab === "preise" && flowData?.settings && (
            <div className="flex-1 overflow-y-auto">
              <PricingPanel
                settings={flowData.settings}
                onChange={(partial) => {
                  setFlowData((prev) => {
                    if (!prev) return prev;
                    return { ...prev, settings: { ...prev.settings, ...partial } };
                  });
                  markDirtyWithHistory();
                }}
              />
            </div>
          )}

          {activeSidebarTab === "integrationen" && (
            <div className="flex-1 overflow-y-auto">
              <WebhooksPanel flowId={flowId} />
              <div className="border-t border-gray-200" />
              <NotificationsPanel flowId={flowId} />
            </div>
          )}

          </>
          )}
        </div>
      )}

      {/* ── WYSIWYG Canvas ── */}
      <div
        className="flex-1 bg-[#f5f5f5] overflow-auto relative group/canvas"
        onClick={() => !isPreviewMode && setSelectedBlockId(null)}
      >
        {/* Preview Mode Banner */}
        {isPreviewMode && (
          <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-2 bg-indigo-600 text-white text-xs font-medium">
            <span className="flex items-center gap-2">
              <Play size={13} />
              Vorschaumodus – Navigation und Logik sind live testbar
            </span>
            <button
              onClick={() => setIsPreviewMode(false)}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-white/20 hover:bg-white/30 transition-colors"
            >
              <Pencil size={12} />
              Bearbeiten
            </button>
          </div>
        )}

        {/* Canvas content */}
        <div className="flex items-start justify-center py-8 min-h-full">
          {isPreviewMode && flowData ? (
            /* ── Preview Mode: uses the real FlowRenderer for 1:1 runtime parity ──
               Validation, shake animations, and navigation are all handled by the
               same component used in production — no custom duplicate logic needed. */
            <div
              className={
                viewportMode === "mobile" ? "w-[375px]" : viewportMode === "tablet" ? "w-[768px]" : "w-full max-w-2xl"
              }
            >
              <FlowRenderer
                key={flowData.id}
                flow={flowData}
                initialStepId={selectedNodeId ?? undefined}
                theme={{
                  primaryColor: currentTheme.primaryColor,
                  backgroundColor: currentTheme.backgroundColor,
                  borderRadius: currentTheme.borderRadius,
                  textColor: currentTheme.textColor,
                  borderColor: currentTheme.borderColor,
                  selectionColor: currentTheme.selectionColor,
                }}
              />
            </div>
          ) : (
          <div
            className={`rounded-lg shadow-sm border ${
              viewportMode === "mobile" ? "w-[375px]" : viewportMode === "tablet" ? "w-[768px]" : "w-full max-w-2xl"
            }`}
            style={{
              backgroundColor: currentTheme.backgroundColor,
              borderColor: currentTheme.borderColor,
              fontFamily: currentTheme.bodyFont || currentTheme.fontFamily,
              color: currentTheme.textColor,
            }}
          >
            {/* Content area */}
            {selectedStep ? (
              <div className="px-6 py-6 space-y-1">
                {/* Price badge — shown in edit mode when pricing enabled and not hidden for this step */}
                {flowData?.settings?.pricingConfig?.enabled &&
                  !(selectedStep.config as Record<string, unknown>)?.hidePriceDisplay && (() => {
                    const pc = flowData.settings!.pricingConfig!;
                    const sym = pc.currencySymbol ?? "€";
                    const hasRangeRules = (pc.basePriceRules ?? []).some(
                      (r) => r.maxPrice !== undefined && r.maxPrice > r.price
                    );
                    const priceLabel = hasRangeRules
                      ? `${sym} — – ${sym} —`
                      : formatPrice(pc.basePrice ?? 0, sym);
                    return (
                      <div className="flex justify-end mb-2">
                        <div
                          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs"
                          style={{
                            background: `${currentTheme.primaryColor}18`,
                            border: `1px solid ${currentTheme.primaryColor}35`,
                          }}
                        >
                          <span className="text-gray-500 font-medium">{pc.label ?? "Geschätzter Preis"}</span>
                          <span className="font-bold" style={{ color: currentTheme.primaryColor }}>
                            {priceLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })()
                }

                {/* Step title / subtitle live preview */}
                {(selectedStep.config?.title || selectedStep.config?.subtitle) && (
                  <div className="mb-5 pb-4 border-b" style={{ borderColor: currentTheme.borderColor }}>
                    {selectedStep.config?.title && (
                      <h1
                        className="text-2xl font-bold"
                        style={{ color: currentTheme.headingColor, fontFamily: currentTheme.headingFont || currentTheme.fontFamily }}
                      >
                        {selectedStep.config.title as string}
                      </h1>
                    )}
                    {selectedStep.config?.subtitle && (
                      <p className="text-sm mt-1 opacity-60">
                        {selectedStep.config.subtitle as string}
                      </p>
                    )}
                  </div>
                )}

                {sortedComponents.length === 0 ? (
                  <div className="py-16 text-center">
                    <button
                      onClick={() => {
                        setInsertPickerIndex(0);
                        setBlockPickerOpen(true);
                      }}
                      className="w-12 h-12 rounded-full bg-gray-100 hover:bg-indigo-100 flex items-center justify-center mx-auto mb-3 transition-colors group"
                    >
                      <Plus size={20} className="text-gray-400 group-hover:text-indigo-500 transition-colors" />
                    </button>
                    <p className="text-sm text-gray-500 mb-1">
                      Keine Blöcke auf dieser Seite
                    </p>
                    <p className="text-xs text-gray-400">
                      Klicke auf &quot;+&quot; um ein Element hinzuzufügen
                    </p>
                  </div>
                ) : (
                  sortedComponents.map((comp, idx) => (
                    <div key={comp.id}>
                      {/* Insert button between blocks */}
                      <InsertButton
                        onClick={() => {
                          setInsertPickerIndex(comp.sortOrder);
                          setBlockPickerOpen(true);
                        }}
                      />
                      <BlockPreview
                        comp={comp}
                        isSelected={selectedBlockId === comp.id}
                        index={idx}
                        total={sortedComponents.length}
                        onSelect={() => setSelectedBlockId(comp.id)}
                        onMove={(dir) => handleMoveComponent(selectedStep.id, comp.id, dir)}
                        onDuplicate={() => handleDuplicateComponent(selectedStep.id, comp.id)}
                        onDelete={() => handleDeleteComponent(selectedStep.id, comp.id)}
                        theme={currentTheme}
                        previewMode={isPreviewMode}
                        pricingConfig={flowData?.settings?.pricingConfig}
                      />
                    </div>
                  ))
                )}
                {/* Insert at end */}
                {sortedComponents.length > 0 && (
                  <InsertButton
                    onClick={() => {
                      setInsertPickerIndex(sortedComponents.length);
                      setBlockPickerOpen(true);
                    }}
                  />
                )}

              </div>
            ) : (
              <div className="py-16 text-center">
                <p className="text-sm text-gray-400">
                  Waehle eine Seite aus der linken Liste
                </p>
              </div>
            )}

          </div>
          )}
        </div>

        {/* ── Bottom Canvas Toolbar (floating pill) ── */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
          {/* Autosave status */}
          {autosaveStatus !== "idle" && (
            <div className={`text-[11px] px-3 py-1 rounded-full shadow-sm font-medium transition-all flex items-center gap-1.5 ${
              autosaveStatus === "saving" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
            }`}>
              {autosaveStatus === "saving" ? (
                <>
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Speichert...
                </>
              ) : (
                <>
                  ✓ Gespeichert
                  {lastSavedAt && (
                    <span className="opacity-70">
                      {lastSavedAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </>
              )}
            </div>
          )}
          <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 rounded-full shadow-xl">
            {/* Viewport toggle */}
            <ToolbarButton
              icon={Smartphone}
              title="Mobile (375px)"
              onClick={() => setViewportMode("mobile")}
              className={viewportMode === "mobile" ? "text-[#4C5FD5]" : ""}
            />
            <ToolbarButton
              icon={Tablet}
              title="Tablet (768px)"
              onClick={() => setViewportMode("tablet")}
              className={viewportMode === "tablet" ? "text-[#4C5FD5]" : ""}
            />
            <ToolbarButton
              icon={Monitor}
              title="Desktop"
              onClick={() => setViewportMode("desktop")}
              className={viewportMode === "desktop" ? "text-[#4C5FD5]" : ""}
            />
            <ToolbarDivider />
            <ToolbarButton
              icon={RotateCcw}
              title="Rueckgaengig (Ctrl+Z)"
              onClick={handleUndo}
              disabled={history.length === 0}
            />
            <ToolbarButton
              icon={RotateCw}
              title="Wiederholen (Ctrl+Shift+Z)"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
            />
            <ToolbarDivider />
            <ToolbarButton
              icon={CopyPlus}
              title="Duplizieren (Ctrl+D)"
              onClick={() => selectedNodeId && selectedBlockId && handleDuplicateComponent(selectedNodeId, selectedBlockId)}
              disabled={!selectedBlockId}
            />
            <ToolbarDivider />
            <ToolbarDivider />
            {isPreviewMode ? (
              <ToolbarButton
                icon={Pencil}
                title="Bearbeitungsmodus"
                onClick={() => setIsPreviewMode(false)}
                className="text-indigo-400"
              />
            ) : (
              <ToolbarButton
                icon={Play}
                title="Vorschaumodus – Flow im Canvas testen"
                onClick={() => {
                  setIsPreviewMode(true);
                }}
              />
            )}
            <ToolbarDivider />
            <ToolbarButton
              icon={ShieldCheck}
              title="Design QA"
              onClick={() => setShowQAPanel((v) => !v)}
              className={showQAPanel ? "text-[#4C5FD5]" : ""}
            />
            <ToolbarButton
              icon={Sparkles}
              title="AI Assistent"
              onClick={() => setShowAIAssistant((v) => !v)}
              className={showAIAssistant ? "text-purple-500" : ""}
            />
          </div>
        </div>
      </div>

      {/* ── Inspector Panel — hidden in preview mode, resizable ── */}
      {!isPreviewMode && (
        <div className="relative shrink-0 bg-white border-l border-gray-200 overflow-y-auto flex flex-col" style={{ width: inspectorWidth }}>
          {/* Drag handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 group"
            onMouseDown={(e) => {
              isResizingInspector.current = true;
              resizeStartX.current = e.clientX;
              resizeStartWidth.current = inspectorWidth;
              document.body.style.cursor = "col-resize";
              document.body.style.userSelect = "none";
              e.preventDefault();
            }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-transparent group-hover:bg-indigo-400 transition-colors" />
          </div>
          <div className="px-4 py-3 border-b border-gray-100 shrink-0 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Inspektor
            </p>
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className="text-xs px-3 py-1 rounded-md bg-[#4C5FD5] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#3d4fc0] transition-colors"
              >
                {isSaving ? "Speichert..." : "Speichern"}
              </button>
              {saveError && (
                <p className="text-[10px] text-red-500 max-w-[150px] text-right leading-tight">
                  {saveError}
                </p>
              )}
            </div>
          </div>

          {selectedStep ? (
            <InspectorPanel
              step={selectedStep}
              onStepChange={(updated) => {
                setFlowData((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    steps: prev.steps.map((s) =>
                      s.id === updated.id ? updated : s
                    ),
                  };
                });
                markDirtyWithHistory();
              }}
              selectedComponentId={selectedBlockId}
              onComponentSelect={setSelectedBlockId}
              allSteps={flowData?.steps}
              pricingConfig={flowData?.settings?.pricingConfig}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center px-4">
              <p className="text-xs text-gray-400 text-center italic">
                Klicke auf eine Seite oder einen Block, um ihn zu bearbeiten.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── AI Chat Panel column ── */}
      {showAIPanel && !isPreviewMode && (
        <div className="shrink-0 w-72 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          <AIChatPanel
            flow={flowData}
            flowId={flowId}
            onApplyOperations={applyAIOperations}
            onUndo={() => {
              const prev = undo();
              if (prev) { setFlowData(prev); setFlow(prev); }
            }}
            onOpenPlanEdit={() => setShowPlanDialog(true)}
          />
        </div>
      )}

      {/* QA Panel overlay */}
      {showQAPanel && (
        <div className="absolute right-64 top-0 bottom-0 w-80 bg-white border-l border-gray-200 shadow-xl z-20 flex flex-col overflow-hidden">
          <QAPanel
            flowId={flowId}
            steps={flowData?.steps ?? []}
            onClose={() => setShowQAPanel(false)}
            onNavigateToStep={(stepId) => {
              selectNode(stepId);
            }}
            onNavigateToComponent={(stepId, componentId) => {
              selectNode(stepId);
              setSelectedBlockId(componentId);
            }}
            selectedComponentId={selectedBlockId}
            onComponentSelect={setSelectedBlockId}
          />
        </div>
      )}

      {/* AI Assistant overlay */}
      {showAIAssistant && (
        <AIAssistant
          flowId={flowId}
          flowGoal={flowData?.name}
          selectedStep={selectedStep ?? undefined}
          selectedComponentType={selectedBlockId
            ? selectedStep?.components.find((c) => c.id === selectedBlockId)?.componentType
            : undefined}
          onApplySuggestion={(value) => {
            navigator.clipboard.writeText(value).catch(() => {});
          }}
          onClose={() => setShowAIAssistant(false)}
        />
      )}

      {/* ── Embed Dialog ── */}
      <EmbedDialog
        open={embedOpen}
        slug={flowData?.slug ?? ""}
        isPublished={flowData?.status === "published"}
        onClose={() => setEmbedOpen(false)}
      />

      {/* ── Plan Edit Dialog ── */}
      {showPlanDialog && flowData?.aiPlan && flowData?.aiBriefing && (
        <PlanEditDialog
          flowId={flowId}
          initialPlan={flowData.aiPlan}
          initialBriefing={flowData.aiBriefing}
          onClose={() => setShowPlanDialog(false)}
          onRegenerated={async () => {
            setShowPlanDialog(false);
            await loadFlow();
            markDirty();
          }}
        />
      )}
    </div>
  );
}

// ─── Sidebar Icon Button ──────────────────────────────────────────────────────

function SidebarIconButton({
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  icon: typeof Layers;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`w-10 flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-colors ${
        isActive
          ? "bg-white/10 text-white"
          : "text-gray-400 hover:text-white hover:bg-white/5"
      }`}
    >
      <Icon size={20} />
      <span className="text-[10px] text-gray-500 leading-none">{label}</span>
    </button>
  );
}

// ─── Bottom Toolbar Helpers ──────────────────────────────────────────────────

function ToolbarButton({
  icon: Icon,
  title,
  onClick,
  disabled,
  className = "",
}: {
  icon: typeof Paintbrush;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded-full hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${className || "text-gray-400"}`}
    >
      <Icon size={16} />
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-gray-700 mx-1" />;
}
