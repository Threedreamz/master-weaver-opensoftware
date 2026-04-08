/**
 * Country Agent — researches SME market data for a single EU country.
 * Phase 1: Uses seed data. Phase 2: Will use Eurostat + GeoNames APIs.
 */

import { EU_COUNTRIES } from "./eu-seed-data";
import { scoreCountry } from "./market-scorer";
import { EU_COUNTRY_CENTERS } from "./geo-utils";

export interface CountryAgentResult {
  countryCode: string;
  success: boolean;
  countryData: {
    code: string;
    name: string;
    population: number;
    gdpEur: number;
    smeCount: number;
    smeEmployees: number;
    marketScore: number;
  } | null;
  postalCodes: Array<{
    postalCode: string;
    cityName: string;
    latitude: number;
    longitude: number;
    countryCode: string;
  }>;
  error?: string;
  source: "seed" | "eurostat" | "geonames";
  duration: number;
}

// Countries that have accessible register APIs
const REGISTER_ACCESSIBLE = new Set([
  "DE", "NL", "GB", "FR", "AT", "BE", "DK", "FI", "SE", "EE", "LT", "LV",
]);

/**
 * Run the country agent for a single country.
 * Currently uses seed data; will be extended with Eurostat + GeoNames.
 */
export async function runCountryAgent(countryCode: string): Promise<CountryAgentResult> {
  const start = Date.now();

  const seed = EU_COUNTRIES.find(c => c.code === countryCode);
  if (!seed) {
    return {
      countryCode,
      success: false,
      countryData: null,
      postalCodes: [],
      error: `Unknown country code: ${countryCode}`,
      source: "seed",
      duration: Date.now() - start,
    };
  }

  // Compute market score using the scoring algorithm
  const marketScore = scoreCountry({
    smeCount: seed.smeCount,
    population: seed.population,
    gdpEur: seed.gdpEur,
    smeEmployees: seed.smeEmployees,
    registerAccessible: REGISTER_ACCESSIBLE.has(countryCode),
  });

  // TODO: Phase 2 — fetch from Eurostat API
  // const eurostat = new EurostatClient();
  // const sbsData = await eurostat.getCountrySummary(countryCode);

  // TODO: Phase 2 — fetch postal codes from GeoNames
  // const geonames = new GeoNamesClient({ username: process.env.GEONAMES_USERNAME! });
  // const postalCodes = await geonames.getPostalCodesByCountry(countryCode);

  const center = EU_COUNTRY_CENTERS[countryCode];

  return {
    countryCode,
    success: true,
    countryData: {
      code: seed.code,
      name: seed.name,
      population: seed.population,
      gdpEur: seed.gdpEur,
      smeCount: seed.smeCount,
      smeEmployees: seed.smeEmployees,
      marketScore,
    },
    postalCodes: center ? [
      // Placeholder: country center as single "postal code" entry
      // Phase 2 will populate real PLZ data from GeoNames
      {
        postalCode: "00000",
        cityName: seed.name,
        latitude: center.lat,
        longitude: center.lng,
        countryCode: seed.code,
      },
    ] : [],
    source: "seed",
    duration: Date.now() - start,
  };
}

/**
 * Run country agents for all 27 EU states.
 */
export async function runAllCountryAgents(
  options?: { maxConcurrent?: number; onProgress?: (code: string, result: CountryAgentResult) => void }
): Promise<Map<string, CountryAgentResult>> {
  const results = new Map<string, CountryAgentResult>();
  const maxConcurrent = options?.maxConcurrent ?? 5;

  const queue = [...EU_COUNTRIES.map(c => c.code)];
  const running = new Set<Promise<void>>();

  const processNext = async () => {
    const code = queue.shift();
    if (!code) return;

    const result = await runCountryAgent(code);
    results.set(code, result);
    options?.onProgress?.(code, result);
  };

  // Process with concurrency limit
  while (queue.length > 0 || running.size > 0) {
    while (running.size < maxConcurrent && queue.length > 0) {
      const promise = processNext().then(() => { running.delete(promise); });
      running.add(promise);
    }
    if (running.size > 0) {
      await Promise.race(running);
    }
  }

  return results;
}
