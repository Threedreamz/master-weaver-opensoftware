"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useMarketMapStore } from "@/lib/market-map/map-store";
import { getScoreColor, MARKET_SCORE_COLORS } from "@/lib/market-map/types";
import type {
  MarketCountryProperties,
  MarketPLZProperties,
  MarketLeadProperties,
} from "@/lib/market-map/types";
import {
  X,
  Map as MapIcon,
  Globe2,
  Users,
  TrendingUp,
  Euro,
} from "lucide-react";

/* ---------- dynamically imported map (no SSR) ---------- */
const MarketMapGL = dynamic(() => Promise.resolve(MarketMapCanvas), {
  ssr: false,
});

/* ---------- stats type ---------- */
interface MapStats {
  totalCountries: number;
  totalSMEs: number;
  avgMarketScore: number;
  totalRevenue?: number;
}

/* ---------- helpers ---------- */
function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function formatEUR(n: number): string {
  if (n >= 1_000_000_000) return `\u20AC${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `\u20AC${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `\u20AC${(n / 1_000).toFixed(0)}K`;
  return `\u20AC${n.toFixed(0)}`;
}

function countryFlag(code: string): string {
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0)),
  );
}

/* ---------- page ---------- */
export default function MarketMapPage() {
  const {
    sidebarOpen,
    setSidebarOpen,
    selectedCountry,
    setSelectedCountry,
    selectedPLZ,
    setSelectedPLZ,
    selectedLead,
    setSelectedLead,
  } = useMarketMapStore();

  const [stats, setStats] = useState<MapStats | null>(null);

  useEffect(() => {
    fetch("/api/market-map/stats")
      .then((r) => r.json())
      .then((d) =>
        setStats({
          totalCountries: d.totalCountries,
          totalSMEs: d.totalSMEs,
          avgMarketScore: d.avgMarketScore,
          totalRevenue: d.totalRevenue ?? 0,
        }),
      )
      .catch(() => {});
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedCountry(null);
    setSelectedPLZ(null);
    setSelectedLead(null);
  }, [setSidebarOpen, setSelectedCountry, setSelectedPLZ, setSelectedLead]);

  /* Determine sidebar title and content */
  const sidebarTitle = selectedLead
    ? selectedLead.companyName
    : selectedPLZ
      ? `${selectedPLZ.postalCode} ${selectedPLZ.cityName}`
      : selectedCountry
        ? selectedCountry.name
        : "Details";

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* ---- KPI bar ---- */}
      <div className="flex items-center gap-6 px-6 py-3 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <MapIcon className="w-5 h-5 text-blue-600" />
          EU Market Map
        </div>
        {stats && (
          <>
            <KpiCard
              icon={<Globe2 className="w-4 h-4" />}
              label="Countries"
              value={stats.totalCountries}
            />
            <KpiCard
              icon={<Users className="w-4 h-4" />}
              label="Total SMEs"
              value={formatNumber(stats.totalSMEs)}
            />
            <KpiCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Avg Score"
              value={stats.avgMarketScore}
            />
            <KpiCard
              icon={<Euro className="w-4 h-4" />}
              label="EU Revenue Potential"
              value={formatEUR(stats.totalRevenue ?? 0)}
            />
          </>
        )}
        <div className="ml-auto flex items-center gap-3">
          <Legend />
        </div>
      </div>

      {/* ---- map + sidebar ---- */}
      <div className="flex flex-1 min-h-0 relative">
        <div className="flex-1">
          <MarketMapGL />
        </div>

        {/* sidebar */}
        <div
          className={`absolute top-0 right-0 h-full w-[400px] bg-zinc-900 border-l border-zinc-800 shadow-xl transform transition-transform duration-300 z-20 ${
            sidebarOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white">
              {sidebarTitle}
            </h2>
            <button
              onClick={closeSidebar}
              className="p-1 rounded hover:bg-zinc-800"
            >
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>
          {selectedLead && <LeadDetail lead={selectedLead} />}
          {!selectedLead && selectedPLZ && <PLZDetail plz={selectedPLZ} />}
          {!selectedLead && !selectedPLZ && selectedCountry && (
            <CountryDetail country={selectedCountry} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- KPI card ---------- */
function KpiCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-zinc-800">
      <span className="text-zinc-400">{icon}</span>
      <div>
        <div className="text-xs text-zinc-500">{label}</div>
        <div className="text-sm font-semibold text-white">
          {value}
        </div>
      </div>
    </div>
  );
}

/* ---------- legend ---------- */
function Legend() {
  return (
    <div className="flex items-center gap-3 text-xs text-zinc-500">
      {Object.values(MARKET_SCORE_COLORS).map((s) => (
        <span key={s.label} className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ background: s.color }}
          />
          {s.label}
        </span>
      ))}
    </div>
  );
}

/* ---------- country detail sidebar ---------- */
function CountryDetail({ country }: { country: MarketCountryProperties }) {
  const scoreColor = getScoreColor(country.marketScore);

  /* Revenue fields may be attached dynamically from GeoJSON properties */
  const extended = country as MarketCountryProperties & {
    potentialRevenue?: number;
    addressableSMEs?: number;
  };
  const potentialRevenue = extended.potentialRevenue ?? 0;
  const addressableSMEs = extended.addressableSMEs ?? country.smeCount;
  const revenuePerSME = addressableSMEs > 0 ? potentialRevenue / addressableSMEs : 0;

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{countryFlag(country.code)}</span>
        <div>
          <div className="text-xl font-bold text-white">
            {country.name}
          </div>
          <div className="text-sm text-zinc-500">
            {country.code} &middot; {country.region}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-zinc-300">
          Market Score
        </span>
        <div className="flex-1 h-3 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${country.marketScore}%`,
              background: scoreColor,
            }}
          />
        </div>
        <span className="text-sm font-bold" style={{ color: scoreColor }}>
          {country.marketScore}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatBox label="SMEs" value={formatNumber(country.smeCount)} />
        <StatBox
          label="Employees"
          value={formatNumber(country.smeEmployees ?? 0)}
        />
        <StatBox label="Population" value={formatNumber(country.population)} />
        <StatBox label="GDP (EUR bn)" value={country.gdpEur.toLocaleString()} />
      </div>

      {/* Revenue section */}
      {potentialRevenue > 0 && (
        <>
          <div className="border-t border-zinc-700 pt-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">
              Revenue Potential
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <StatBox
                label="Total Potential"
                value={formatEUR(potentialRevenue)}
              />
              <StatBox
                label="Addressable SMEs"
                value={formatNumber(addressableSMEs)}
              />
              <StatBox
                label="Revenue / SME"
                value={formatEUR(revenuePerSME)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- PLZ detail sidebar ---------- */
function PLZDetail({ plz }: { plz: MarketPLZProperties }) {
  const scoreColor = getScoreColor(plz.marketScore);

  /* Optional revenue fields from API */
  const extended = plz as MarketPLZProperties & {
    potentialRevenue?: number;
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center text-blue-400 font-bold text-sm">
          {plz.postalCode.slice(0, 2)}
        </div>
        <div>
          <div className="text-xl font-bold text-white">
            {plz.postalCode} {plz.cityName}
          </div>
          <div className="text-sm text-zinc-500">{plz.countryCode}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-zinc-300">
          Market Score
        </span>
        <div className="flex-1 h-3 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${plz.marketScore}%`, background: scoreColor }}
          />
        </div>
        <span className="text-sm font-bold" style={{ color: scoreColor }}>
          {plz.marketScore}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatBox label="SMEs" value={formatNumber(plz.smeCount)} />
        <StatBox label="Population" value={formatNumber(plz.population)} />
        {extended.potentialRevenue != null && extended.potentialRevenue > 0 && (
          <StatBox
            label="Revenue Potential"
            value={formatEUR(extended.potentialRevenue)}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- lead detail sidebar ---------- */
function LeadDetail({ lead }: { lead: MarketLeadProperties }) {
  const scoreColor = getScoreColor(lead.leadScore);
  const statusColors: Record<string, string> = {
    new: "bg-blue-900 text-blue-300",
    qualified: "bg-green-900 text-green-300",
    contacted: "bg-yellow-900 text-yellow-300",
    converted: "bg-emerald-900 text-emerald-300",
    rejected: "bg-red-900 text-red-300",
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div>
        <div className="text-xl font-bold text-white">
          {lead.companyName}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-zinc-500">
            {lead.countryCode}
            {lead.postalCode ? ` \u00B7 ${lead.postalCode}` : ""}
            {lead.city ? ` \u00B7 ${lead.city}` : ""}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[lead.leadStatus] ?? ""}`}
          >
            {lead.leadStatus}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-zinc-300">
          Lead Score
        </span>
        <div className="flex-1 h-3 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${lead.leadScore}%`, background: scoreColor }}
          />
        </div>
        <span className="text-sm font-bold" style={{ color: scoreColor }}>
          {lead.leadScore}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {lead.industry && <StatBox label="Industry" value={lead.industry} />}
        {lead.employeesRange && (
          <StatBox label="Employees" value={lead.employeesRange} />
        )}
        {lead.revenueRange && (
          <StatBox label="Revenue" value={lead.revenueRange} />
        )}
        {lead.vatId && <StatBox label="VAT ID" value={lead.vatId} />}
        <StatBox label="Enrichment" value={lead.enrichmentStatus} />
      </div>
    </div>
  );
}

/* ---------- stat box ---------- */
function StatBox({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="p-3 rounded-lg bg-zinc-800">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-lg font-semibold text-white">
        {value}
      </div>
    </div>
  );
}

/* ---------- MapLibre canvas component ---------- */
function MarketMapCanvas() {
  const mapContainer = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const {
    setSelectedCountry,
    setSelectedPLZ,
    setSelectedLead,
    setMapReady,
    setSidebarOpen,
  } = useMarketMapStore();

  /* Track which country's PLZ data is loaded */
  const loadedPlzCountry = useRef<string | null>(null);
  /* Track whether lead data is loaded */
  const leadsLoaded = useRef(false);

  /* ---- click handler: country circles ---- */
  const handleCountryClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties as Record<string, unknown>;
      setSelectedCountry({
        code: String(p.code ?? ""),
        name: String(p.name ?? ""),
        smeCount: Number(p.smeCount ?? 0),
        population: Number(p.population ?? 0),
        gdpEur: Number(p.gdpEur ?? 0),
        marketScore: Number(p.marketScore ?? 0),
        region: String(p.region ?? ""),
        smeEmployees: Number(p.smeEmployees ?? 0),
        /* Attach revenue fields dynamically */
        ...(p.potentialRevenue != null
          ? { potentialRevenue: Number(p.potentialRevenue) }
          : {}),
        ...(p.addressableSMEs != null
          ? { addressableSMEs: Number(p.addressableSMEs) }
          : {}),
      } as MarketCountryProperties);
    },
    [setSelectedCountry],
  );

  /* ---- click handler: PLZ circles ---- */
  const handlePLZClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties as Record<string, unknown>;
      setSelectedPLZ({
        countryCode: String(p.countryCode ?? ""),
        postalCode: String(p.postalCode ?? ""),
        cityName: String(p.cityName ?? ""),
        latitude: Number(p.latitude ?? 0),
        longitude: Number(p.longitude ?? 0),
        smeCount: Number(p.smeCount ?? 0),
        marketScore: Number(p.marketScore ?? 0),
        population: Number(p.population ?? 0),
        ...(p.potentialRevenue != null
          ? { potentialRevenue: Number(p.potentialRevenue) }
          : {}),
      } as MarketPLZProperties);
    },
    [setSelectedPLZ],
  );

  /* ---- click handler: lead pins ---- */
  const handleLeadClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties as Record<string, unknown>;
      setSelectedLead({
        id: Number(p.id ?? 0),
        companyName: String(p.companyName ?? ""),
        vatId: p.vatId ? String(p.vatId) : undefined,
        countryCode: String(p.countryCode ?? ""),
        postalCode: p.postalCode ? String(p.postalCode) : undefined,
        city: p.city ? String(p.city) : undefined,
        industry: p.industry ? String(p.industry) : undefined,
        employeesRange: p.employeesRange
          ? String(p.employeesRange)
          : undefined,
        revenueRange: p.revenueRange ? String(p.revenueRange) : undefined,
        leadScore: Number(p.leadScore ?? 0),
        leadStatus: String(p.leadStatus ?? "new") as MarketLeadProperties["leadStatus"],
        enrichmentStatus: String(p.enrichmentStatus ?? "pending") as MarketLeadProperties["enrichmentStatus"],
        latitude: p.latitude != null ? Number(p.latitude) : undefined,
        longitude: p.longitude != null ? Number(p.longitude) : undefined,
      });
    },
    [setSelectedLead],
  );

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    let cancelled = false;

    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      await import("maplibre-gl/dist/maplibre-gl.css");

      if (cancelled || !mapContainer.current) return;

      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: [10.0, 50.0],
        zoom: 4,
        attributionControl: true,
      });

      mapRef.current = map;

      map.addControl(new maplibregl.NavigationControl(), "top-left");

      map.on("load", async () => {
        setMapReady(true);

        try {
          /* ============================================
           * LAYER 1: Country bubbles (zoom 3-8)
           * ============================================ */
          const res = await fetch("/api/market-map/countries?format=geojson");
          const geojson = await res.json();

          map.addSource("countries", { type: "geojson", data: geojson });

          /* Country circles */
          map.addLayer({
            id: "country-circles",
            type: "circle",
            source: "countries",
            minzoom: 3,
            maxzoom: 8,
            paint: {
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["get", "smeCount"],
                0,
                8,
                500000,
                20,
                3000000,
                40,
              ],
              "circle-color": [
                "interpolate",
                ["linear"],
                ["get", "marketScore"],
                0,
                "#ef4444",
                50,
                "#f59e0b",
                100,
                "#22c55e",
              ],
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2,
              "circle-opacity": 0.85,
            },
          });

          /* Country code labels */
          map.addLayer({
            id: "country-labels",
            type: "symbol",
            source: "countries",
            minzoom: 3,
            maxzoom: 8,
            layout: {
              "text-field": ["get", "code"],
              "text-size": 11,
              "text-font": ["Open Sans Bold"],
              "text-allow-overlap": true,
              "text-offset": [0, -0.3],
              "text-anchor": "center",
            },
            paint: {
              "text-color": "#ffffff",
              "text-halo-color": "rgba(0,0,0,0.5)",
              "text-halo-width": 1,
            },
          });

          /* Country revenue labels (below code) */
          map.addLayer({
            id: "country-revenue-labels",
            type: "symbol",
            source: "countries",
            minzoom: 3,
            maxzoom: 8,
            layout: {
              "text-field": [
                "coalesce",
                ["get", "formattedRevenue"],
                "",
              ],
              "text-size": 9,
              "text-font": ["Open Sans Regular"],
              "text-allow-overlap": true,
              "text-offset": [0, 0.8],
              "text-anchor": "center",
            },
            paint: {
              "text-color": "#ffffff",
              "text-halo-color": "rgba(0,0,0,0.6)",
              "text-halo-width": 1,
            },
          });

          /* Country circle click */
          map.on("click", "country-circles", handleCountryClick);
          map.on("mouseenter", "country-circles", () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", "country-circles", () => {
            map.getCanvas().style.cursor = "";
          });

          /* ============================================
           * PLZ + Leads: empty sources (filled on zoom)
           * ============================================ */
          map.addSource("plz", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });

          map.addSource("leads", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });

          /* ============================================
           * LAYER 2: PLZ circles (zoom 8-12)
           * ============================================ */
          map.addLayer({
            id: "plz-circles",
            type: "circle",
            source: "plz",
            minzoom: 8,
            maxzoom: 12,
            paint: {
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["get", "smeCount"],
                0,
                4,
                50,
                10,
                200,
                16,
                500,
                20,
              ],
              "circle-color": [
                "interpolate",
                ["linear"],
                ["get", "marketScore"],
                0,
                "#ef4444",
                50,
                "#f59e0b",
                100,
                "#22c55e",
              ],
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 1,
              "circle-opacity": 0.7,
            },
          });

          map.addLayer({
            id: "plz-labels",
            type: "symbol",
            source: "plz",
            minzoom: 9,
            maxzoom: 12,
            layout: {
              "text-field": ["get", "postalCode"],
              "text-size": 10,
              "text-font": ["Open Sans Regular"],
              "text-allow-overlap": false,
            },
            paint: {
              "text-color": "#ffffff",
              "text-halo-color": "rgba(0,0,0,0.5)",
              "text-halo-width": 1,
            },
          });

          map.on("click", "plz-circles", handlePLZClick);
          map.on("mouseenter", "plz-circles", () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", "plz-circles", () => {
            map.getCanvas().style.cursor = "";
          });

          /* ============================================
           * LAYER 3: Lead pins (zoom 12+)
           * ============================================ */
          map.addLayer({
            id: "lead-pins",
            type: "circle",
            source: "leads",
            minzoom: 12,
            paint: {
              "circle-radius": 5,
              "circle-color": [
                "interpolate",
                ["linear"],
                ["get", "leadScore"],
                0,
                "#ef4444",
                50,
                "#f59e0b",
                100,
                "#22c55e",
              ],
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 1.5,
              "circle-opacity": 0.9,
            },
          });

          map.addLayer({
            id: "lead-labels",
            type: "symbol",
            source: "leads",
            minzoom: 13,
            layout: {
              "text-field": ["get", "companyName"],
              "text-size": 10,
              "text-font": ["Open Sans Regular"],
              "text-offset": [0, 1.2],
              "text-anchor": "top",
              "text-allow-overlap": false,
              "text-max-width": 10,
            },
            paint: {
              "text-color": "#374151",
              "text-halo-color": "#ffffff",
              "text-halo-width": 1,
            },
          });

          map.on("click", "lead-pins", handleLeadClick);
          map.on("mouseenter", "lead-pins", () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", "lead-pins", () => {
            map.getCanvas().style.cursor = "";
          });

          /* ============================================
           * ZOOM HANDLER: load data on demand
           * ============================================ */

          /**
           * Detect which country the map center is in by
           * reverse-geocoding from the countries GeoJSON.
           * Falls back to a simple nearest-point lookup.
           */
          function detectCenterCountry(): string | null {
            const center = map.getCenter();
            const features = map.querySourceFeatures("countries");
            if (!features.length) return null;

            /* Find the closest country feature to center */
            let closest: string | null = null;
            let minDist = Infinity;
            for (const f of features) {
              const coords = (
                f.geometry as { type: string; coordinates: number[] }
              ).coordinates;
              if (!coords || coords.length < 2) continue;
              const dx = coords[0] - center.lng;
              const dy = coords[1] - center.lat;
              const d = dx * dx + dy * dy;
              if (d < minDist) {
                minDist = d;
                closest = String(
                  (f.properties as Record<string, unknown>).code ?? "",
                );
              }
            }
            return closest;
          }

          async function loadPLZData(countryCode: string) {
            if (loadedPlzCountry.current === countryCode) return;
            try {
              const resp = await fetch(
                `/api/market-map/plz?country=${encodeURIComponent(countryCode)}&limit=200`,
              );
              if (!resp.ok) return;
              const data = await resp.json();
              const src = map.getSource("plz");
              if (src && "setData" in src) {
                (src as { setData: (d: unknown) => void }).setData(data);
              }
              loadedPlzCountry.current = countryCode;
            } catch {
              /* ignore fetch errors */
            }
          }

          async function loadLeadData() {
            if (leadsLoaded.current) return;
            try {
              const bounds = map.getBounds();
              const resp = await fetch(
                `/api/market-map/leads?limit=100&bbox=${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`,
              );
              if (!resp.ok) return;
              const data = await resp.json();
              const src = map.getSource("leads");
              if (src && "setData" in src) {
                (src as { setData: (d: unknown) => void }).setData(data);
              }
              leadsLoaded.current = true;
            } catch {
              /* ignore fetch errors */
            }
          }

          map.on("zoomend", () => {
            const zoom = map.getZoom();

            /* Layer visibility is handled by minzoom/maxzoom on layers,
             * but we need to load data on demand. */

            if (zoom >= 8 && zoom < 12) {
              /* PLZ level: detect country and load PLZ data */
              const country = detectCenterCountry();
              if (country) {
                loadPLZData(country);
              }
            }

            if (zoom >= 12) {
              /* Lead level: load leads for visible bounds */
              leadsLoaded.current = false; /* reload on each zoom to get bbox-appropriate data */
              loadLeadData();
            }
          });

          /* Also reload leads on moveend when zoomed in far enough */
          map.on("moveend", () => {
            const zoom = map.getZoom();
            if (zoom >= 8 && zoom < 12) {
              const country = detectCenterCountry();
              if (country && country !== loadedPlzCountry.current) {
                loadPLZData(country);
              }
            }
            if (zoom >= 12) {
              leadsLoaded.current = false;
              loadLeadData();
            }
          });
        } catch (err) {
          console.error("Failed to load market map data:", err);
        }
      });
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [
    handleCountryClick,
    handlePLZClick,
    handleLeadClick,
    setMapReady,
    setSidebarOpen,
  ]);

  return <div ref={mapContainer} className="w-full h-full" />;
}
