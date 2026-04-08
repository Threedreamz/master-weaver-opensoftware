/**
 * PLZ Research Agent — discovers companies in a postal code area
 * using public data sources (OSM Overpass API).
 *
 * Phase 1: OpenStreetMap Overpass (free, no API key)
 * Phase 2: Country-specific registers (Handelsregister, KVK, etc.)
 */

// --- Types ---

export interface ResearchConfig {
  countryCode: string;
  postalCode: string;
  cityName?: string;
  latitude?: number;
  longitude?: number;
  maxResults?: number;
  sources?: ("osm" | "web")[];
}

export interface DiscoveredCompany {
  companyName: string;
  countryCode: string;
  postalCode: string;
  city?: string;
  street?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  phone?: string;
  email?: string;
  naceCode?: string;
  industry?: string;
  source: string;
  sourceId?: string;
  confidence: number;
}

export interface ResearchResult {
  countryCode: string;
  postalCode: string;
  source: string;
  companiesFound: number;
  companies: DiscoveredCompany[];
  durationMs: number;
  errors: string[];
}

export interface CountryResearchProgress {
  countryCode: string;
  totalPLZ: number;
  completedPLZ: number;
  totalCompaniesFound: number;
  newCompanies: number;
  duplicates: number;
  errors: number;
  currentPLZ?: string;
  status: "running" | "completed" | "failed" | "paused";
  startedAt: string;
  estimatedRemainingMs?: number;
}

// --- OSM Overpass ---

const OVERPASS_API = "https://overpass-api.de/api/interpreter";

async function queryOSMOverpass(config: ResearchConfig): Promise<ResearchResult> {
  const start = Date.now();
  const errors: string[] = [];
  const companies: DiscoveredCompany[] = [];

  const query = `
[out:json][timeout:30];
area["ISO3166-1"="${config.countryCode}"]->.country;
(
  nwr["addr:postcode"="${config.postalCode}"]["name"](area.country);
  nwr["addr:postcode"="${config.postalCode}"]["shop"](area.country);
  nwr["addr:postcode"="${config.postalCode}"]["office"](area.country);
  nwr["addr:postcode"="${config.postalCode}"]["craft"](area.country);
  nwr["addr:postcode"="${config.postalCode}"]["industrial"](area.country);
  nwr["addr:postcode"="${config.postalCode}"]["company"](area.country);
);
out center ${config.maxResults ?? 100};
`;

  try {
    const response = await fetch(OVERPASS_API, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(35000),
    });

    if (!response.ok) {
      errors.push(`Overpass API ${response.status}: ${response.statusText}`);
      return { countryCode: config.countryCode, postalCode: config.postalCode, source: "osm", companiesFound: 0, companies: [], durationMs: Date.now() - start, errors };
    }

    const data = await response.json();

    for (const el of data.elements ?? []) {
      const tags = el.tags ?? {};
      const name = tags.name || tags["name:de"] || tags["name:en"];
      if (!name) continue;

      companies.push({
        companyName: name,
        countryCode: config.countryCode,
        postalCode: config.postalCode,
        city: tags["addr:city"] || config.cityName,
        street: tags["addr:street"] ? `${tags["addr:street"]} ${tags["addr:housenumber"] || ""}`.trim() : undefined,
        latitude: el.lat ?? el.center?.lat,
        longitude: el.lon ?? el.center?.lon,
        website: tags.website || tags["contact:website"],
        phone: tags.phone || tags["contact:phone"],
        email: tags.email || tags["contact:email"],
        industry: mapOSMToIndustry(tags),
        source: "osm-overpass",
        sourceId: `osm-${el.type}-${el.id}`,
        confidence: 0.7,
      });
    }
  } catch (error) {
    errors.push(`Overpass failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return { countryCode: config.countryCode, postalCode: config.postalCode, source: "osm", companiesFound: companies.length, companies, durationMs: Date.now() - start, errors };
}

// --- OSM tag → industry ---

function mapOSMToIndustry(tags: Record<string, string>): string | undefined {
  if (tags.office) {
    const map: Record<string, string> = {
      company: "Unternehmensbüro", it: "IT-Dienstleistungen", insurance: "Versicherungen",
      financial: "Finanzdienstleistungen", lawyer: "Rechtsberatung", accountant: "Steuerberatung",
      estate_agent: "Immobilien", architect: "Architektur", engineer: "Ingenieurbüro",
      consulting: "Beratung", marketing: "Marketing & Werbung", logistics: "Logistik",
    };
    return map[tags.office] || `Büro (${tags.office})`;
  }
  if (tags.shop) {
    const map: Record<string, string> = {
      supermarket: "Einzelhandel — Lebensmittel", bakery: "Bäckerei", butcher: "Metzgerei",
      clothes: "Einzelhandel — Bekleidung", hardware: "Baumarkt", electronics: "Elektronik",
      furniture: "Möbelhandel", car: "Autohandel", car_repair: "KFZ-Werkstatt",
      beauty: "Kosmetik", hairdresser: "Friseur", optician: "Optiker", pharmacy: "Apotheke",
    };
    return map[tags.shop] || `Einzelhandel (${tags.shop})`;
  }
  if (tags.craft) {
    const map: Record<string, string> = {
      electrician: "Elektroinstallation", plumber: "Sanitär & Heizung",
      carpenter: "Tischlerei", painter: "Malerbetrieb", roofer: "Dachdeckerei",
    };
    return map[tags.craft] || `Handwerk (${tags.craft})`;
  }
  if (tags.amenity === "restaurant") return "Gastronomie — Restaurant";
  if (tags.amenity === "cafe") return "Gastronomie — Café";
  if (tags.tourism === "hotel") return "Hotellerie";
  return undefined;
}

// --- Dedup ---

function deduplicateCompanies(companies: DiscoveredCompany[]): DiscoveredCompany[] {
  const seen = new Map<string, DiscoveredCompany>();
  for (const c of companies) {
    const key = `${c.companyName.toLowerCase().trim()}|${c.postalCode}`;
    const existing = seen.get(key);
    if (!existing || c.confidence > existing.confidence) {
      seen.set(key, c);
    }
  }
  return Array.from(seen.values());
}

// --- Public API ---

export async function researchPLZ(config: ResearchConfig): Promise<ResearchResult> {
  const start = Date.now();
  const allCompanies: DiscoveredCompany[] = [];
  const allErrors: string[] = [];
  const sources = config.sources ?? ["osm"];

  if (sources.includes("osm")) {
    const osmResult = await queryOSMOverpass(config);
    allCompanies.push(...osmResult.companies);
    allErrors.push(...osmResult.errors);
  }

  const deduplicated = deduplicateCompanies(allCompanies);

  return {
    countryCode: config.countryCode,
    postalCode: config.postalCode,
    source: sources.join("+"),
    companiesFound: deduplicated.length,
    companies: deduplicated,
    durationMs: Date.now() - start,
    errors: allErrors,
  };
}

export async function researchCountry(
  countryCode: string,
  plzList: Array<{ postalCode: string; cityName?: string; latitude?: number; longitude?: number }>,
  options: {
    maxConcurrent?: number;
    maxResultsPerPLZ?: number;
    onProgress?: (progress: CountryResearchProgress) => void;
    signal?: AbortSignal;
  } = {}
): Promise<{ countryCode: string; results: ResearchResult[]; summary: CountryResearchProgress }> {
  const maxConcurrent = options.maxConcurrent ?? 3;
  const results: ResearchResult[] = [];
  let totalCompanies = 0;
  let errorCount = 0;
  const startedAt = new Date().toISOString();

  const progress: CountryResearchProgress = {
    countryCode, totalPLZ: plzList.length, completedPLZ: 0,
    totalCompaniesFound: 0, newCompanies: 0, duplicates: 0,
    errors: 0, status: "running", startedAt,
  };
  options.onProgress?.(progress);

  for (let i = 0; i < plzList.length; i += maxConcurrent) {
    if (options.signal?.aborted) { progress.status = "paused"; break; }

    const batch = plzList.slice(i, i + maxConcurrent);
    const batchResults = await Promise.allSettled(
      batch.map((plz) => researchPLZ({
        countryCode, postalCode: plz.postalCode, cityName: plz.cityName,
        latitude: plz.latitude, longitude: plz.longitude,
        maxResults: options.maxResultsPerPLZ ?? 100,
      }))
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
        totalCompanies += result.value.companiesFound;
        if (result.value.errors.length > 0) errorCount++;
      } else { errorCount++; }
    }

    progress.completedPLZ = Math.min(i + maxConcurrent, plzList.length);
    progress.totalCompaniesFound = totalCompanies;
    progress.newCompanies = totalCompanies;
    progress.errors = errorCount;
    progress.currentPLZ = batch[batch.length - 1]?.postalCode;

    const elapsed = Date.now() - new Date(startedAt).getTime();
    const rate = progress.completedPLZ / elapsed;
    const remaining = plzList.length - progress.completedPLZ;
    progress.estimatedRemainingMs = rate > 0 ? remaining / rate : undefined;

    options.onProgress?.(progress);

    // Rate limiting — Overpass fair use (1 req/s per IP)
    if (i + maxConcurrent < plzList.length) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  if (progress.status !== "paused") {
    progress.status = errorCount === plzList.length ? "failed" : "completed";
  }

  return { countryCode, results, summary: progress };
}
