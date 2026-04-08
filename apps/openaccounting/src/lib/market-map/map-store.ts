"use client";
import { create } from "zustand";
import type { MarketMapLayer, MarketCountryProperties, MarketPLZProperties, MarketLeadProperties } from "./types";

interface MarketMapState {
  activeLayers: Set<MarketMapLayer>;
  toggleLayer: (layer: MarketMapLayer) => void;
  selectedCountry: MarketCountryProperties | null;
  setSelectedCountry: (c: MarketCountryProperties | null) => void;
  selectedPLZ: MarketPLZProperties | null;
  setSelectedPLZ: (p: MarketPLZProperties | null) => void;
  selectedLead: MarketLeadProperties | null;
  setSelectedLead: (l: MarketLeadProperties | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  mapReady: boolean;
  setMapReady: (ready: boolean) => void;
  minScore: number;
  setMinScore: (score: number) => void;
  naceFilter: string | null;
  setNaceFilter: (code: string | null) => void;
  flyToTarget: { lat: number; lng: number; zoom?: number } | null;
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  clearFlyTo: () => void;
}

export const useMarketMapStore = create<MarketMapState>((set) => ({
  activeLayers: new Set<MarketMapLayer>(["countries"]),
  toggleLayer: (layer) => set((s) => {
    const next = new Set(s.activeLayers);
    if (next.has(layer)) next.delete(layer); else next.add(layer);
    return { activeLayers: next };
  }),
  selectedCountry: null,
  setSelectedCountry: (c) => set({ selectedCountry: c, sidebarOpen: c !== null }),
  selectedPLZ: null,
  setSelectedPLZ: (p) => set({ selectedPLZ: p, sidebarOpen: p !== null }),
  selectedLead: null,
  setSelectedLead: (l) => set({ selectedLead: l, sidebarOpen: l !== null }),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  mapReady: false,
  setMapReady: (ready) => set({ mapReady: ready }),
  minScore: 0,
  setMinScore: (score) => set({ minScore: score }),
  naceFilter: null,
  setNaceFilter: (code) => set({ naceFilter: code }),
  flyToTarget: null,
  flyTo: (lat, lng, zoom) => set({ flyToTarget: { lat, lng, zoom } }),
  clearFlyTo: () => set({ flyToTarget: null }),
}));
