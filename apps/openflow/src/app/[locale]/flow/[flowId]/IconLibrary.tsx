"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  // Interface
  Settings, Search, Menu, X, Plus, Minus, Check, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, MoreHorizontal, MoreVertical, Maximize, Minimize,
  Eye, EyeOff, Filter, SlidersHorizontal, Layers, Grid, List, LayoutGrid,
  PanelLeft, Sidebar, Lock, Unlock, ZoomIn, ZoomOut, Sliders,
  // Navigation
  Home, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ExternalLink, Link, Globe,
  Map, MapPin, Navigation, Compass, Route, CornerUpLeft, CornerUpRight,
  CornerDownLeft, CornerDownRight, Anchor, Signpost, Locate,
  // Medien
  Image, Camera, Video, Play, Pause, Volume2, VolumeX, Music, Mic, Film, Tv,
  Monitor, Smartphone, Tablet, Speaker, Headphones, Radio, Aperture, Youtube,
  // Kommunikation
  Mail, MessageSquare, Phone, Send, Bell, Inbox, AtSign, Share, Share2,
  Megaphone, Rss, MessageCircle, PhoneCall, PhoneOff, BellOff, BellRing,
  MessagesSquare, MailOpen, Forward, Reply,
  // Dateien
  File, FileText, Folder, FolderOpen, Download, Upload, Save, Clipboard, Copy,
  Trash, Archive, Package, FileCode, FileImage, FilePlus, FolderPlus,
  HardDrive, Database, FileSearch, FileCheck,
  // Pfeile
  MoveUp, MoveDown, MoveLeft, MoveRight, ChevronsUp, ChevronsDown, Undo, Redo,
  RefreshCw, RotateCw, RotateCcw, Repeat, ChevronsLeft, ChevronsRight,
  ArrowUpRight, ArrowDownRight, ArrowUpLeft, ArrowDownLeft, Shuffle, Maximize2,
  // Formen
  Circle, Square, Triangle, Heart, Star, Hexagon, Octagon, Diamond, Pentagon,
  RectangleHorizontal, Sparkles, Flame, Zap, Droplet, Sun, Moon, Cloud,
  // Business
  Building, Users, User, UserPlus, UserMinus, CreditCard, ShoppingCart,
  ShoppingBag, Briefcase, Clock, Calendar, BarChart, LineChart, PieChart,
  TrendingUp, DollarSign, Percent, Target, Award, Trophy, Wallet, Receipt,
  BadgeCheck, Crown, Gem, Landmark, Scale, Stamp, HandCoins, ChartBar,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface IconLibraryProps {
  open: boolean;
  onClose: () => void;
  onSelect: (iconData: { url: string; name: string; type: "library" | "ai-generated" }) => void;
}

interface IconEntry {
  name: string;
  category: string;
  icon: LucideIcon;
}

// ─── Icon catalog ────────────────────────────────────────────────────────────

const ICON_LIBRARY: IconEntry[] = [
  // Interface
  { name: "Settings", category: "Interface", icon: Settings },
  { name: "Search", category: "Interface", icon: Search },
  { name: "Menu", category: "Interface", icon: Menu },
  { name: "X", category: "Interface", icon: X },
  { name: "Plus", category: "Interface", icon: Plus },
  { name: "Minus", category: "Interface", icon: Minus },
  { name: "Check", category: "Interface", icon: Check },
  { name: "ChevronDown", category: "Interface", icon: ChevronDown },
  { name: "ChevronUp", category: "Interface", icon: ChevronUp },
  { name: "ChevronLeft", category: "Interface", icon: ChevronLeft },
  { name: "ChevronRight", category: "Interface", icon: ChevronRight },
  { name: "MoreHorizontal", category: "Interface", icon: MoreHorizontal },
  { name: "MoreVertical", category: "Interface", icon: MoreVertical },
  { name: "Maximize", category: "Interface", icon: Maximize },
  { name: "Minimize", category: "Interface", icon: Minimize },
  { name: "Eye", category: "Interface", icon: Eye },
  { name: "EyeOff", category: "Interface", icon: EyeOff },
  { name: "Filter", category: "Interface", icon: Filter },
  { name: "SlidersHorizontal", category: "Interface", icon: SlidersHorizontal },
  { name: "Layers", category: "Interface", icon: Layers },
  { name: "Grid", category: "Interface", icon: Grid },
  { name: "List", category: "Interface", icon: List },
  { name: "LayoutGrid", category: "Interface", icon: LayoutGrid },
  { name: "PanelLeft", category: "Interface", icon: PanelLeft },
  { name: "Sidebar", category: "Interface", icon: Sidebar },
  { name: "Lock", category: "Interface", icon: Lock },
  { name: "Unlock", category: "Interface", icon: Unlock },
  { name: "ZoomIn", category: "Interface", icon: ZoomIn },
  { name: "ZoomOut", category: "Interface", icon: ZoomOut },
  { name: "Sliders", category: "Interface", icon: Sliders },

  // Navigation
  { name: "Home", category: "Navigation", icon: Home },
  { name: "ArrowUp", category: "Navigation", icon: ArrowUp },
  { name: "ArrowDown", category: "Navigation", icon: ArrowDown },
  { name: "ArrowLeft", category: "Navigation", icon: ArrowLeft },
  { name: "ArrowRight", category: "Navigation", icon: ArrowRight },
  { name: "ExternalLink", category: "Navigation", icon: ExternalLink },
  { name: "Link", category: "Navigation", icon: Link },
  { name: "Globe", category: "Navigation", icon: Globe },
  { name: "Map", category: "Navigation", icon: Map },
  { name: "MapPin", category: "Navigation", icon: MapPin },
  { name: "Navigation", category: "Navigation", icon: Navigation },
  { name: "Compass", category: "Navigation", icon: Compass },
  { name: "Route", category: "Navigation", icon: Route },
  { name: "CornerUpLeft", category: "Navigation", icon: CornerUpLeft },
  { name: "CornerUpRight", category: "Navigation", icon: CornerUpRight },
  { name: "CornerDownLeft", category: "Navigation", icon: CornerDownLeft },
  { name: "CornerDownRight", category: "Navigation", icon: CornerDownRight },
  { name: "Anchor", category: "Navigation", icon: Anchor },
  { name: "Signpost", category: "Navigation", icon: Signpost },
  { name: "Locate", category: "Navigation", icon: Locate },

  // Medien
  { name: "Image", category: "Medien", icon: Image },
  { name: "Camera", category: "Medien", icon: Camera },
  { name: "Video", category: "Medien", icon: Video },
  { name: "Play", category: "Medien", icon: Play },
  { name: "Pause", category: "Medien", icon: Pause },
  { name: "Volume2", category: "Medien", icon: Volume2 },
  { name: "VolumeX", category: "Medien", icon: VolumeX },
  { name: "Music", category: "Medien", icon: Music },
  { name: "Mic", category: "Medien", icon: Mic },
  { name: "Film", category: "Medien", icon: Film },
  { name: "Tv", category: "Medien", icon: Tv },
  { name: "Monitor", category: "Medien", icon: Monitor },
  { name: "Smartphone", category: "Medien", icon: Smartphone },
  { name: "Tablet", category: "Medien", icon: Tablet },
  { name: "Speaker", category: "Medien", icon: Speaker },
  { name: "Headphones", category: "Medien", icon: Headphones },
  { name: "Radio", category: "Medien", icon: Radio },
  { name: "Aperture", category: "Medien", icon: Aperture },
  { name: "Youtube", category: "Medien", icon: Youtube },

  // Kommunikation
  { name: "Mail", category: "Kommunikation", icon: Mail },
  { name: "MessageSquare", category: "Kommunikation", icon: MessageSquare },
  { name: "Phone", category: "Kommunikation", icon: Phone },
  { name: "Send", category: "Kommunikation", icon: Send },
  { name: "Bell", category: "Kommunikation", icon: Bell },
  { name: "Inbox", category: "Kommunikation", icon: Inbox },
  { name: "AtSign", category: "Kommunikation", icon: AtSign },
  { name: "Share", category: "Kommunikation", icon: Share },
  { name: "Share2", category: "Kommunikation", icon: Share2 },
  { name: "Megaphone", category: "Kommunikation", icon: Megaphone },
  { name: "Rss", category: "Kommunikation", icon: Rss },
  { name: "MessageCircle", category: "Kommunikation", icon: MessageCircle },
  { name: "PhoneCall", category: "Kommunikation", icon: PhoneCall },
  { name: "PhoneOff", category: "Kommunikation", icon: PhoneOff },
  { name: "BellOff", category: "Kommunikation", icon: BellOff },
  { name: "BellRing", category: "Kommunikation", icon: BellRing },
  { name: "MessagesSquare", category: "Kommunikation", icon: MessagesSquare },
  { name: "MailOpen", category: "Kommunikation", icon: MailOpen },
  { name: "Forward", category: "Kommunikation", icon: Forward },
  { name: "Reply", category: "Kommunikation", icon: Reply },

  // Dateien
  { name: "File", category: "Dateien", icon: File },
  { name: "FileText", category: "Dateien", icon: FileText },
  { name: "Folder", category: "Dateien", icon: Folder },
  { name: "FolderOpen", category: "Dateien", icon: FolderOpen },
  { name: "Download", category: "Dateien", icon: Download },
  { name: "Upload", category: "Dateien", icon: Upload },
  { name: "Save", category: "Dateien", icon: Save },
  { name: "Clipboard", category: "Dateien", icon: Clipboard },
  { name: "Copy", category: "Dateien", icon: Copy },
  { name: "Trash", category: "Dateien", icon: Trash },
  { name: "Archive", category: "Dateien", icon: Archive },
  { name: "Package", category: "Dateien", icon: Package },
  { name: "FileCode", category: "Dateien", icon: FileCode },
  { name: "FileImage", category: "Dateien", icon: FileImage },
  { name: "FilePlus", category: "Dateien", icon: FilePlus },
  { name: "FolderPlus", category: "Dateien", icon: FolderPlus },
  { name: "HardDrive", category: "Dateien", icon: HardDrive },
  { name: "Database", category: "Dateien", icon: Database },
  { name: "FileSearch", category: "Dateien", icon: FileSearch },
  { name: "FileCheck", category: "Dateien", icon: FileCheck },

  // Pfeile
  { name: "MoveUp", category: "Pfeile", icon: MoveUp },
  { name: "MoveDown", category: "Pfeile", icon: MoveDown },
  { name: "MoveLeft", category: "Pfeile", icon: MoveLeft },
  { name: "MoveRight", category: "Pfeile", icon: MoveRight },
  { name: "ChevronsUp", category: "Pfeile", icon: ChevronsUp },
  { name: "ChevronsDown", category: "Pfeile", icon: ChevronsDown },
  { name: "Undo", category: "Pfeile", icon: Undo },
  { name: "Redo", category: "Pfeile", icon: Redo },
  { name: "RefreshCw", category: "Pfeile", icon: RefreshCw },
  { name: "RotateCw", category: "Pfeile", icon: RotateCw },
  { name: "RotateCcw", category: "Pfeile", icon: RotateCcw },
  { name: "Repeat", category: "Pfeile", icon: Repeat },
  { name: "ChevronsLeft", category: "Pfeile", icon: ChevronsLeft },
  { name: "ChevronsRight", category: "Pfeile", icon: ChevronsRight },
  { name: "ArrowUpRight", category: "Pfeile", icon: ArrowUpRight },
  { name: "ArrowDownRight", category: "Pfeile", icon: ArrowDownRight },
  { name: "ArrowUpLeft", category: "Pfeile", icon: ArrowUpLeft },
  { name: "ArrowDownLeft", category: "Pfeile", icon: ArrowDownLeft },
  { name: "Shuffle", category: "Pfeile", icon: Shuffle },
  { name: "Maximize2", category: "Pfeile", icon: Maximize2 },

  // Formen
  { name: "Circle", category: "Formen", icon: Circle },
  { name: "Square", category: "Formen", icon: Square },
  { name: "Triangle", category: "Formen", icon: Triangle },
  { name: "Heart", category: "Formen", icon: Heart },
  { name: "Star", category: "Formen", icon: Star },
  { name: "Hexagon", category: "Formen", icon: Hexagon },
  { name: "Octagon", category: "Formen", icon: Octagon },
  { name: "Diamond", category: "Formen", icon: Diamond },
  { name: "Pentagon", category: "Formen", icon: Pentagon },
  { name: "RectangleHorizontal", category: "Formen", icon: RectangleHorizontal },
  { name: "Sparkles", category: "Formen", icon: Sparkles },
  { name: "Flame", category: "Formen", icon: Flame },
  { name: "Zap", category: "Formen", icon: Zap },
  { name: "Droplet", category: "Formen", icon: Droplet },
  { name: "Sun", category: "Formen", icon: Sun },
  { name: "Moon", category: "Formen", icon: Moon },
  { name: "Cloud", category: "Formen", icon: Cloud },

  // Business
  { name: "Building", category: "Business", icon: Building },
  { name: "Users", category: "Business", icon: Users },
  { name: "User", category: "Business", icon: User },
  { name: "UserPlus", category: "Business", icon: UserPlus },
  { name: "UserMinus", category: "Business", icon: UserMinus },
  { name: "CreditCard", category: "Business", icon: CreditCard },
  { name: "ShoppingCart", category: "Business", icon: ShoppingCart },
  { name: "ShoppingBag", category: "Business", icon: ShoppingBag },
  { name: "Briefcase", category: "Business", icon: Briefcase },
  { name: "Clock", category: "Business", icon: Clock },
  { name: "Calendar", category: "Business", icon: Calendar },
  { name: "BarChart", category: "Business", icon: BarChart },
  { name: "LineChart", category: "Business", icon: LineChart },
  { name: "PieChart", category: "Business", icon: PieChart },
  { name: "TrendingUp", category: "Business", icon: TrendingUp },
  { name: "DollarSign", category: "Business", icon: DollarSign },
  { name: "Percent", category: "Business", icon: Percent },
  { name: "Target", category: "Business", icon: Target },
  { name: "Award", category: "Business", icon: Award },
  { name: "Trophy", category: "Business", icon: Trophy },
  { name: "Wallet", category: "Business", icon: Wallet },
  { name: "Receipt", category: "Business", icon: Receipt },
  { name: "BadgeCheck", category: "Business", icon: BadgeCheck },
  { name: "Crown", category: "Business", icon: Crown },
  { name: "Gem", category: "Business", icon: Gem },
  { name: "Landmark", category: "Business", icon: Landmark },
  { name: "Scale", category: "Business", icon: Scale },
  { name: "Stamp", category: "Business", icon: Stamp },
  { name: "HandCoins", category: "Business", icon: HandCoins },
  { name: "ChartBar", category: "Business", icon: ChartBar },
];

const CATEGORIES = [
  "Alle",
  "Interface",
  "Navigation",
  "Medien",
  "Kommunikation",
  "Dateien",
  "Pfeile",
  "Formen",
  "Business",
] as const;

const ICONS_PER_PAGE = 60;

// ─── SVG capture utility ─────────────────────────────────────────────────────

function captureSvgDataUrl(svgEl: SVGSVGElement, size = 64, color = "#4C5FD5"): string {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(size));
  clone.setAttribute("height", String(size));
  clone.setAttribute("stroke", color);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const svgStr = new XMLSerializer().serializeToString(clone);
  return `data:image/svg+xml,${encodeURIComponent(svgStr)}`;
}

// ─── Icon tile ───────────────────────────────────────────────────────────────

function IconTile({
  entry,
  onSelect,
}: {
  entry: IconEntry;
  onSelect: (iconData: { url: string; name: string; type: "library" }) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const IconComp = entry.icon;

  const handleClick = useCallback(() => {
    if (!svgRef.current) return;
    const url = captureSvgDataUrl(svgRef.current, 64, "#4C5FD5");
    onSelect({ url, name: entry.name, type: "library" });
  }, [entry.name, onSelect]);

  return (
    <button
      onClick={handleClick}
      className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-50 hover:scale-105 transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
      title={entry.name}
    >
      <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-50 group-hover:bg-indigo-50 transition-colors">
        <IconComp ref={svgRef} size={24} className="text-gray-600 group-hover:text-indigo-600 transition-colors" />
      </div>
      <span className="text-[10px] text-gray-500 group-hover:text-gray-700 truncate w-full text-center leading-tight">
        {entry.name}
      </span>
    </button>
  );
}

// ─── Uploaded icons tab ──────────────────────────────────────────────────────

function UploadedTab({
  onSelect,
}: {
  onSelect: (iconData: { url: string; name: string; type: "library" }) => void;
}) {
  const [icons, setIcons] = useState<{ url: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/assets?type=icon");
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) {
          setIcons(
            Array.isArray(data)
              ? data.map((d: { url?: string; name?: string }) => ({
                  url: d.url ?? "",
                  name: d.name ?? "Icon",
                }))
              : []
          );
        }
      } catch {
        if (!cancelled) setIcons([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-400">
        Wird geladen...
      </div>
    );
  }

  if (icons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
        <Upload size={32} className="text-gray-300" />
        <p className="text-sm">Noch keine Icons hochgeladen</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-2 p-2">
      {icons.map((icon, idx) => (
        <button
          key={icon.url + idx}
          onClick={() => onSelect({ url: icon.url, name: icon.name, type: "library" })}
          className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-50 hover:scale-105 transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-50 overflow-hidden">
            <img
              src={icon.url}
              alt={icon.name}
              className="w-6 h-6 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
          <span className="text-[10px] text-gray-500 truncate w-full text-center">
            {icon.name}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── AI icon generation tab ──────────────────────────────────────────────────

interface GeneratedIcon {
  url: string;
  name: string;
  svgContent?: string;
}

const AI_STYLES = [
  { key: "outline" as const, label: "Outline", preview: (c: string) => <svg viewBox="0 0 24 24" width="20" height="20" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8"/></svg> },
  { key: "filled" as const, label: "Filled", preview: (c: string) => <svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="8" fill={c}/></svg> },
  { key: "minimal" as const, label: "Minimal", preview: (c: string) => <svg viewBox="0 0 24 24" width="20" height="20" stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8"/></svg> },
  { key: "rounded" as const, label: "Rounded", preview: (c: string) => <svg viewBox="0 0 24 24" width="20" height="20" stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8"/></svg> },
];

const AI_SIZES = [64, 128, 256] as const;

function AITab({
  onSelect,
}: {
  onSelect: (iconData: { url: string; name: string; type: "ai-generated" }) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<"outline" | "filled" | "minimal" | "rounded">("outline");
  const [size, setSize] = useState<64 | 128 | 256>(64);
  const [color, setColor] = useState("#4C5FD5");
  const [generating, setGenerating] = useState(false);
  const [generatedIcons, setGeneratedIcons] = useState<GeneratedIcon[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previousIcons, setPreviousIcons] = useState<{ url: string; name: string }[]>([]);
  const [loadingPrevious, setLoadingPrevious] = useState(true);

  // Fetch previously generated AI icons on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/assets?type=icon");
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) {
          setPreviousIcons(
            Array.isArray(data)
              ? data
                  .filter((d: { name?: string }) => d.name?.startsWith("AI:"))
                  .map((d: { url?: string; name?: string }) => ({
                    url: d.url ?? "",
                    name: d.name ?? "AI Icon",
                  }))
              : []
          );
        }
      } catch {
        if (!cancelled) setPreviousIcons([]);
      } finally {
        if (!cancelled) setLoadingPrevious(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/generate-icon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), style, size, color }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? "Fehler bei der Generierung");
      }

      const data = await res.json();
      const newIcon: GeneratedIcon = {
        url: data.url,
        name: data.name,
        svgContent: data.svgContent,
      };

      setGeneratedIcons((prev) => [newIcon, ...prev]);
      // Also add to previous icons list
      setPreviousIcons((prev) => [{ url: data.url, name: data.name }, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setGenerating(false);
    }
  }, [prompt, style, size, color]);

  const latestIcon = generatedIcons[0];
  const historyIcons = generatedIcons.slice(1);

  return (
    <div className="p-4 space-y-4">
      {/* ── Generation Form ── */}
      <div className="space-y-3">
        {/* Prompt input */}
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !generating) handleGenerate(); }}
          placeholder="Beschreibe dein gewünschtes Icon..."
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder:text-gray-400"
        />

        {/* Style selector */}
        <div>
          <p className="text-[11px] text-gray-500 mb-1.5 font-medium">Stil</p>
          <div className="flex gap-1.5">
            {AI_STYLES.map((s) => (
              <button
                key={s.key}
                onClick={() => setStyle(s.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                  style === s.key
                    ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                {s.preview(style === s.key ? "#4338ca" : "#9ca3af")}
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color + Size row */}
        <div className="flex gap-4 items-end">
          <div>
            <p className="text-[11px] text-gray-500 mb-1.5 font-medium">Farbe</p>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5"
              />
              <span className="text-[11px] text-gray-400 font-mono">{color}</span>
            </div>
          </div>

          <div>
            <p className="text-[11px] text-gray-500 mb-1.5 font-medium">Groesse</p>
            <div className="flex gap-1">
              {AI_SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                    size === s
                      ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300"
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {s}px
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={generating || !prompt.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              Icon wird generiert...
            </>
          ) : (
            <>
              <Sparkles size={14} />
              Generieren
            </>
          )}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-600 text-xs">
          <X size={14} />
          <span className="flex-1">{error}</span>
          <button
            onClick={handleGenerate}
            className="text-red-700 font-medium hover:underline"
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {/* ── Generating placeholder ── */}
      {generating && !latestIcon && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="w-24 h-24 rounded-2xl bg-indigo-50 animate-pulse flex items-center justify-center">
            <Sparkles size={32} className="text-indigo-300" />
          </div>
          <p className="text-xs text-gray-400">Icon wird generiert...</p>
        </div>
      )}

      {/* ── Latest generated icon ── */}
      {latestIcon && (
        <div className="border border-gray-100 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-center">
            <div className="w-32 h-32 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 overflow-hidden">
              <img
                src={latestIcon.url}
                alt={latestIcon.name}
                className="max-w-[80%] max-h-[80%] object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center truncate">{latestIcon.name}</p>
          <div className="flex gap-2">
            <button
              onClick={() => onSelect({ url: latestIcon.url, name: latestIcon.name, type: "ai-generated" })}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              <Check size={12} />
              Uebernehmen
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={12} className={generating ? "animate-spin" : ""} />
              Neue Variante
            </button>
          </div>
          <p className="text-[10px] text-gray-300 text-center">
            Bereits in Bibliothek gespeichert
          </p>
        </div>
      )}

      {/* ── Generation history ── */}
      {historyIcons.length > 0 && (
        <div>
          <p className="text-[11px] text-gray-500 font-medium mb-2">Letzte Generierungen</p>
          <div className="flex gap-2 flex-wrap">
            {historyIcons.map((icon, idx) => (
              <button
                key={icon.url + idx}
                onClick={() => onSelect({ url: icon.url, name: icon.name, type: "ai-generated" })}
                className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden hover:border-indigo-300 hover:scale-105 transition-all"
                title={icon.name}
              >
                <img
                  src={icon.url}
                  alt={icon.name}
                  className="w-8 h-8 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Previously generated icons ── */}
      {!loadingPrevious && previousIcons.length > 0 && (
        <div className="border-t border-gray-100 pt-3">
          <p className="text-[11px] text-gray-500 font-medium mb-2">Frueeher generierte Icons</p>
          <div className="grid grid-cols-6 gap-2">
            {previousIcons.map((icon, idx) => (
              <button
                key={icon.url + idx}
                onClick={() => onSelect({ url: icon.url, name: icon.name, type: "ai-generated" })}
                className="flex flex-col items-center gap-1 p-1.5 rounded-xl hover:bg-gray-50 hover:scale-105 transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-indigo-500"
                title={icon.name}
              >
                <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-50 overflow-hidden">
                  <img
                    src={icon.url}
                    alt={icon.name}
                    className="w-6 h-6 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
                <span className="text-[9px] text-gray-400 truncate w-full text-center leading-tight">
                  {icon.name.replace("AI: ", "")}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loadingPrevious && (
        <div className="flex items-center justify-center py-4 text-xs text-gray-300">
          Wird geladen...
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function IconLibrary({ open, onClose, onSelect }: IconLibraryProps) {
  const [tab, setTab] = useState<"library" | "uploaded" | "ai">("library");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("Alle");
  const [visibleCount, setVisibleCount] = useState(ICONS_PER_PAGE);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setSearch("");
      setCategory("Alle");
      setVisibleCount(ICONS_PER_PAGE);
      setTab("library");
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filteredIcons = ICON_LIBRARY.filter((entry) => {
    if (category !== "Alle" && entry.category !== category) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return entry.name.toLowerCase().includes(q) || entry.category.toLowerCase().includes(q);
    }
    return true;
  });

  const visibleIcons = filteredIcons.slice(0, visibleCount);
  const hasMore = visibleCount < filteredIcons.length;

  const handleSelect = useCallback(
    (iconData: { url: string; name: string; type: "library" | "ai-generated" }) => {
      onSelect(iconData);
      onClose();
    },
    [onSelect, onClose],
  );

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[640px] max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* ── Header ── */}
        <div className="shrink-0 border-b border-gray-100">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <h2 className="text-sm font-semibold text-gray-800">Icon-Bibliothek</h2>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* ── Tabs ── */}
          <div className="flex gap-0 px-5">
            {([
              { key: "library", label: "Bibliothek" },
              { key: "uploaded", label: "Hochgeladen" },
              { key: "ai", label: "AI-Generiert" },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                  tab === t.key
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Search (library tab only) ── */}
          {tab === "library" && (
            <div className="px-5 py-3 space-y-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setVisibleCount(ICONS_PER_PAGE);
                  }}
                  placeholder="Icons durchsuchen..."
                  className="w-full text-sm border border-gray-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setCategory(cat);
                      setVisibleCount(ICONS_PER_PAGE);
                    }}
                    className={`px-2.5 py-1 text-[11px] rounded-full transition-colors ${
                      category === cat
                        ? "bg-indigo-100 text-indigo-700 font-medium"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          {tab === "library" && (
            <>
              {filteredIcons.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                  <Search size={28} className="text-gray-300" />
                  <p className="text-sm">Keine Icons gefunden</p>
                  <p className="text-xs">Versuche einen anderen Suchbegriff</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-6 gap-1 p-3">
                    {visibleIcons.map((entry) => (
                      <IconTile
                        key={entry.name}
                        entry={entry}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                  {hasMore && (
                    <div className="flex justify-center pb-4">
                      <button
                        onClick={() => setVisibleCount((c) => c + ICONS_PER_PAGE)}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors"
                      >
                        Mehr laden ({filteredIcons.length - visibleCount} weitere)
                      </button>
                    </div>
                  )}
                </>
              )}
              <div className="px-5 pb-3 pt-1 border-t border-gray-100">
                <p className="text-[10px] text-gray-300 text-center">
                  {filteredIcons.length} Icons {category !== "Alle" ? `in ${category}` : "gesamt"} — Lucide Icons (MIT Lizenz)
                </p>
              </div>
            </>
          )}

          {tab === "uploaded" && <UploadedTab onSelect={handleSelect} />}
          {tab === "ai" && <AITab onSelect={handleSelect} />}
        </div>
      </div>
    </div>
  );
}
