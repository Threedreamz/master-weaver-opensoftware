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
import QAPanel from "../QAPanel";
import AIAssistant from "../AIAssistant";
import type {
  FlowDefinition,
  FlowEdge,
  FlowStep,
  FlowTheme,
  StepComponent,
} from "@opensoftware/openflow-core";
import { resolveNextStep } from "@opensoftware/openflow-core";

const STLViewerComponent = lazy(() => import("@opensoftware/openflow-renderer/stl-viewer"));

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

const STLViewerComponent = lazy(() => import("@opensoftware/openflow-renderer/stl-viewer"));

// ─── Sidebar Tab Types ────────────────────────────────────────────────────────

type SidebarTab = "editor" | "regeln" | "design" | "code" | "integrationen";

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
      { type: "card-selector", label: "Form", icon: LayoutGrid },
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
      { type: "button", label: "Absenden Button", icon: Check },
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
}) {
  const blockLabel =
    COMPONENT_LABEL_MAP[comp.componentType] ?? comp.componentType;
  const blockColor = COMPONENT_COLOR_MAP[comp.componentType] ?? "#6366f1";
  const config = comp.config as Record<string, unknown>;

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
        const hAlign = (config.alignment as string) || (styleOverrides.textAlign as string) || "left";
        const defaultFontSizes: Record<number, string> = { 1: "2.25rem", 2: "1.5rem", 3: "1.25rem", 4: "1.0625rem" };
        return (
          <h2 className="text-xl font-bold">
            {(config.text as string) || comp.label || "Überschrift"}
          </h2>
        );
      }
      case "paragraph": {
        const pAlign = (config.alignment as string) || (styleOverrides.textAlign as string) || "left";
        return (
          <p className="text-sm leading-relaxed">
            {(config.text as string) ||
              comp.label ||
              "Absatztext hier eingeben..."}
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
                  className={`rounded-lg p-3 text-center transition-colors ${
                    cardStyle === "minimal" ? "hover:bg-gray-50" :
                    cardStyle === "filled" ? "bg-gray-50 hover:bg-gray-100" :
                    "border border-gray-200 bg-white hover:border-gray-400"
                  }`}
                  style={{ borderColor: cardStyle === "bordered" ? (styleOverrides.borderColor || undefined) : undefined }}
                >
                  {card.imageUrl ? (
                    isSvgDataUrl(card.imageUrl) ? (
                      <div className="mx-auto mb-2"><ColoredSvg src={card.imageUrl} color={iconColor} size={iconSize} /></div>
                    ) : (
                      <img src={card.imageUrl} alt="" style={{ width: iconSize, height: iconSize, objectFit: "contain", margin: "0 auto 0.5rem" }} />
                    )
                  ) : (
                    <div className="rounded-full mx-auto mb-2" style={{ width: iconSize, height: iconSize, backgroundColor: `${iconColor}20` }} />
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
        const imgOptions = (config.options as Array<{ value: string; label: string; imageUrl?: string }>) ?? [];
        const imgCols = parseInt(String(config.columns ?? "2"), 10) || 2;
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
                {imgOptions.map((opt) => (
                  <div key={opt.value} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                    <div className="h-20 bg-gray-100 flex items-center justify-center">
                      {opt.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={opt.imageUrl} alt={opt.label} className="h-full w-full object-cover" />
                      ) : (
                        <Image size={20} className="text-gray-300" />
                      )}
                    </div>
                    <p className="text-xs font-medium text-gray-700 text-center p-2">{opt.label}</p>
                  </div>
                ))}
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
  const [pagesSubTab, setPagesSubTab] = useState<"seiten" | "ebenen">(
    "seiten"
  );
  const [blockPickerOpen, setBlockPickerOpen] = useState(false);
  const [blockPickerSearch, setBlockPickerSearch] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [insertPickerIndex, setInsertPickerIndex] = useState<number | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showQAPanel, setShowQAPanel] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

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

  // ── Autosave (30 seconds after last change) ────────────────────────────────
  useEffect(() => {
    if (!isDirty || !flowData) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      setAutosaveStatus("saving");
      try {
        await fetch(`/api/flows/${flowId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: flowName, settings: JSON.stringify(flowData.settings) }),
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
        setAutosaveStatus("saved");
        setTimeout(() => setAutosaveStatus("idle"), 2000);
      } catch {
        setAutosaveStatus("idle");
      }
    }, 30000);
    return () => { if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current); };
  }, [isDirty, flowData, flowId, flowName, markSaved]);

  // Keyboard shortcuts
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

  // Duplicate step/page
  function handleDuplicateStep(stepId: string) {
    if (!flowData) return;
    pushHistory(flowData);
    const original = flowData.steps.find((s) => s.id === stepId);
    if (!original) return;
    const newId = crypto.randomUUID();
    const visibleSteps = flowData.steps.filter((s) => s.type !== "start" && s.type !== "end");
    const dupStep: FlowStep = {
      ...JSON.parse(JSON.stringify(original)),
      id: newId,
      label: `${original.label} (Kopie)`,
      positionX: original.positionX + 50,
      positionY: original.positionY + 50,
      sortOrder: visibleSteps.length,
      components: (original.components ?? []).map((c) => ({
        ...JSON.parse(JSON.stringify(c)),
        id: crypto.randomUUID(),
        stepId: newId,
        fieldKey: `${c.fieldKey}_copy`,
      })),
    };
    setFlowData((prev) => {
      if (!prev) return prev;
      return { ...prev, steps: [...prev.steps, dupStep] };
    });
    selectNode(newId);
    markDirty();
  }

  // Load flow data
  useEffect(() => {
    async function loadFlow() {
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
            })),
          })),
          edges: data.edges ?? [],
          startStepId:
            data.steps?.find((s: FlowStep) => s.type === "start")?.id ?? "",
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
    }
    loadFlow();
  }, [flowId, setFlow, selectNode]);

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
        body: JSON.stringify({ name: flowName, settings: JSON.stringify(flowData.settings) }),
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

        for (const comp of step.components ?? []) {
          await fetch(`/api/flows/${flowId}/steps/${step.id}/components/${comp.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              label: comp.label,
              fieldKey: comp.fieldKey,
              config: JSON.stringify(comp.config),
              sortOrder: comp.sortOrder,
              required: comp.required ?? false,
            }),
          });
        }
      }

      markSaved();
      setAutosaveStatus("saved");
      setTimeout(() => setAutosaveStatus("idle"), 2000);
    } catch (err) {
      console.error("Save failed:", err);
      setSaveError("Speichern fehlgeschlagen. Bitte erneut versuchen.");
      setAutosaveStatus("idle");
      useEditorStore.setState({ isSaving: false });
    }
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

    const newComponent: StepComponent = {
      id: crypto.randomUUID(),
      stepId: targetStepId,
      componentType,
      fieldKey: `${componentType.replace(/-/g, "_")}_${Date.now()}`,
      config: {},
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

      {/* ── Pages Panel (220px) ── */}
      {!sidebarCollapsed && (
        <div className="w-[220px] shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
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
                          className={`group/step relative rounded-xl border-2 transition-all overflow-hidden ${
                            isActive
                              ? "border-[#4C5FD5] shadow-md"
                              : "border-gray-200 hover:border-gray-300 shadow-sm"
                          }`}
                        >
                          <button
                            onClick={() => { selectNode(step.id); setSelectedBlockId(null); }}
                            className="w-full text-left"
                          >
                            {/* Thumbnail preview */}
                            <div className="relative bg-gray-50 px-2 py-2 min-h-[64px]">
                              <div
                                className={`absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                  isActive ? "bg-[#4C5FD5] text-white" : "bg-gray-300 text-white"
                                }`}
                              >
                                {idx + 1}
                              </div>
                              <div className="ml-6 space-y-1">
                                {comps.length === 0 ? (
                                  <div className="h-3 w-16 rounded bg-gray-200" />
                                ) : (
                                  comps.slice(0, 4).map((comp) => {
                                    const color = COMPONENT_COLOR_MAP[comp.componentType] ?? "#6366f1";
                                    return (
                                      <div
                                        key={comp.id}
                                        className="h-2.5 rounded-sm"
                                        style={{
                                          backgroundColor: `${color}25`,
                                          borderLeft: `2px solid ${color}`,
                                          width: comp.componentType.includes("heading") ? "60%" : comp.componentType.includes("card") ? "90%" : "75%",
                                        }}
                                      />
                                    );
                                  })
                                )}
                                {comps.length > 4 && (
                                  <p className="text-[8px] text-gray-400">+{comps.length - 4} weitere</p>
                                )}
                              </div>
                            </div>
                            {/* Step name */}
                            <div className="px-2 py-1.5 bg-white border-t border-gray-100">
                              <p className={`text-[11px] font-semibold truncate ${isActive ? "text-[#4C5FD5]" : step.label ? "text-gray-700" : "text-gray-400 italic"}`}>
                                {step.label || `Seite ${idx + 1}`}
                              </p>
                              <p className="text-[9px] text-gray-400">
                                {comps.length} Block{comps.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </button>
                          {/* Duplicate step button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDuplicateStep(step.id); }}
                            className="absolute top-1 right-1 opacity-0 group-hover/step:opacity-100 transition-opacity w-5 h-5 rounded bg-white/80 border border-gray-200 flex items-center justify-center hover:bg-blue-50 hover:border-blue-300"
                            title="Seite duplizieren"
                          >
                            <CopyPlus size={10} className="text-gray-500" />
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
          {isPreviewMode && flowData ? (() => {
            /* ── Preview Mode: canvas-native preview, identical look to edit mode ── */

            // Component types that navigate on click/selection (no button needed)
            const AUTO_NAV_TYPES = new Set(["image-choice", "card-selector", "radio-group", "rating", "slider"]);

            const previewSteps = flowData.steps.filter((s) => s.type !== "start" && s.type !== "end");
            const activeStep = previewSteps.find((s) => s.id === previewStepId) ?? previewSteps[0];
            const activeComponents = activeStep
              ? [...(activeStep.components ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
              : [];

            const doPreviewNext = () => {
              if (!activeStep) return;
              // 1. Try edge-based navigation (conditional logic, explicit connections)
              const nextId = resolveNextStep(activeStep.id, previewAnswers, flowData.edges);
              if (nextId) {
                const nextStep = flowData.steps.find((s) => s.id === nextId);
                if (nextStep && nextStep.type !== "end") {
                  setPreviewStepId(nextStep.id);
                  setPreviewHistory((h) => [...h, nextStep.id]);
                }
                // nextStep is "end" → flow complete, stay on current step
                return;
              }
              // 2. No edges configured → fall back to sequential order
              const currentIdx = previewSteps.findIndex((s) => s.id === activeStep.id);
              if (currentIdx !== -1 && currentIdx < previewSteps.length - 1) {
                const nextStep = previewSteps[currentIdx + 1];
                setPreviewStepId(nextStep.id);
                setPreviewHistory((h) => [...h, nextStep.id]);
              }
            };
            const doPreviewBack = () => {
              setPreviewHistory((h) => {
                const trimmed = h.slice(0, -1);
                if (trimmed.length > 0) setPreviewStepId(trimmed[trimmed.length - 1]);
                return trimmed;
              });
            };
            const doPreviewJump = (stepId: string) => {
              const target = flowData.steps.find((s) => s.id === stepId);
              if (target) {
                setPreviewStepId(stepId);
                setPreviewHistory((h) => [...h, stepId]);
              }
            };

            return (
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
                {/* Progress bar */}
                {flowData.settings?.showProgressBar && previewSteps.length > 1 && (
                  <div className="px-6 pt-4 pb-0">
                    <div className="flex gap-1">
                      {previewSteps.map((s) => (
                        <div
                          key={s.id}
                          className="h-1 flex-1 rounded-full transition-colors"
                          style={{
                            backgroundColor: s.id === activeStep?.id
                              ? currentTheme.primaryColor || "#6366f1"
                              : currentTheme.borderColor || "#e5e7eb",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Content area — identical to edit mode */}
                {activeStep ? (
                  <div className="px-6 py-6 space-y-1">
                    {(activeStep.config?.title || activeStep.config?.subtitle) && (
                      <div className="mb-5 pb-4 border-b" style={{ borderColor: currentTheme.borderColor }}>
                        {activeStep.config?.title && (
                          <h1
                            className="text-2xl font-bold"
                            style={{ color: currentTheme.headingColor, fontFamily: currentTheme.headingFont || currentTheme.fontFamily }}
                          >
                            {activeStep.config.title as string}
                          </h1>
                        )}
                        {activeStep.config?.subtitle && (
                          <p className="text-sm mt-1 opacity-60">{activeStep.config.subtitle as string}</p>
                        )}
                      </div>
                    )}

                    {activeComponents.map((comp) => {
                      const cfg = comp.config as Record<string, unknown>;
                      const navAction = cfg?.navigationAction as { type: string; targetStepId?: string } | undefined;
                      const isBtn = comp.componentType === "button" || comp.componentType === "submit-button";
                      const isAutoNav = AUTO_NAV_TYPES.has(comp.componentType);

                      return (
                        <BlockPreview
                          key={comp.id}
                          comp={comp}
                          isSelected={false}
                          previewMode={true}
                          index={0}
                          total={activeComponents.length}
                          onSelect={() => {
                            if (isBtn) {
                              // Buttons: navigate based on their action config
                              const action = (cfg?.action as string) || "next";
                              if (action === "back" || action === "previous") doPreviewBack();
                              else if (action === "jump" && cfg?.targetStepId) doPreviewJump(cfg.targetStepId as string);
                              else if (action === "submit") { /* treat submit as end of flow */ }
                              else doPreviewNext();
                            } else if (navAction && navAction.type !== "none") {
                              // Only navigate if action is explicitly configured and not "none"
                              // "none" (or undefined) = no navigation — exactly what the user configured
                              if (navAction.type === "next" || navAction.type === "conditional") doPreviewNext();
                              else if (navAction.type === "jump" && navAction.targetStepId) doPreviewJump(navAction.targetStepId);
                            }
                            // undefined navAction / type "none" → no navigation (respects "Keine Aktion")
                            // Record the click as an answer for conditional logic
                            if (isAutoNav) {
                              setPreviewAnswers((prev) => ({ ...prev, [comp.fieldKey]: true }));
                            }
                          }}
                          onMove={() => {}}
                          onDuplicate={() => {}}
                          onDelete={() => {}}
                          theme={currentTheme}
                        />
                      );
                    })}
                    {/* No auto-generated navigation buttons — only flow-defined elements navigate */}
                  </div>
                ) : null}
              </div>
            );
          })() : (
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
            {/* Header add button */}
            <button className="w-full py-3 border-b border-dashed border-gray-200 text-xs text-gray-400 hover:text-[#4C5FD5] hover:bg-blue-50/30 transition-colors">
              + Kopfzeile hinzufuegen
            </button>

            {/* Content area */}
            {selectedStep ? (
              <div className="px-6 py-6 space-y-1">
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

                {/* Navigation buttons preview */}
                <div className="pt-4 mt-2 border-t flex items-center gap-3" style={{ borderColor: currentTheme.borderColor }}>
                  {flowData && flowData.steps.filter((s) => s.type !== "start" && s.type !== "end").findIndex((s) => s.id === selectedStep.id) > 0 && (
                    <button
                      className="px-4 py-2 text-sm font-medium flex items-center gap-1.5"
                      style={{
                        color: currentTheme.textColor,
                        backgroundColor: currentTheme.backgroundColor,
                        border: `${currentTheme.borderWidth} solid ${currentTheme.borderColor}`,
                        borderRadius: currentTheme.borderRadius,
                      }}
                    >
                      <ArrowLeft size={14} />
                      {(selectedStep.config?.backButtonText as string) || "Zurück"}
                    </button>
                  )}
                  <button
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-1.5 transition-colors"
                    style={{ backgroundColor: currentTheme.primaryColor, borderRadius: currentTheme.borderRadius }}
                  >
                    {(selectedStep.config?.nextButtonText as string) || "Weiter"}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center">
                <p className="text-sm text-gray-400">
                  Waehle eine Seite aus der linken Liste
                </p>
              </div>
            )}

            {/* Footer add button */}
            <button className="w-full py-3 border-t border-dashed border-gray-200 text-xs text-gray-400 hover:text-[#4C5FD5] hover:bg-blue-50/30 transition-colors">
              + Fusszeile hinzufuegen
            </button>
          </div>
          )}
        </div>

        {/* ── Bottom Canvas Toolbar (floating pill) ── */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
          {/* Autosave status */}
          {autosaveStatus !== "idle" && (
            <div className={`text-[11px] px-3 py-1 rounded-full shadow-sm font-medium transition-all ${
              autosaveStatus === "saving" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
            }`}>
              {autosaveStatus === "saving" ? "Automatisch speichern..." : "✓ Automatisch gespeichert"}
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

      {/* ── Inspector Panel (340px) — hidden in preview mode ── */}
      {!isPreviewMode && (
        <div className="w-[340px] shrink-0 bg-white border-l border-gray-200 overflow-y-auto flex flex-col">
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
