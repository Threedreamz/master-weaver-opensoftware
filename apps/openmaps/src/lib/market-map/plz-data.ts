/**
 * PLZ data provider — fetches postal code data from GeoNames API.
 */

export interface PLZEntry {
  postalCode: string;
  cityName: string;
  latitude: number;
  longitude: number;
  adminName?: string;
}

const PLZ_CACHE = new Map<string, PLZEntry[]>();

/**
 * Fetch postal codes for a country from GeoNames API.
 * Uses the free 'demo' account — limited to 1000 results per request.
 * For production, register at geonames.org for a free username.
 */
export async function getPLZForCountry(countryCode: string): Promise<PLZEntry[]> {
  const cached = PLZ_CACHE.get(countryCode);
  if (cached) return cached;

  try {
    const url = `http://api.geonames.org/postalCodeSearchJSON?country=${countryCode}&maxRows=1000&username=demo`;
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });

    if (!response.ok) {
      console.warn(`GeoNames API failed for ${countryCode}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const entries: PLZEntry[] = (data.postalCodes ?? []).map((pc: Record<string, unknown>) => ({
      postalCode: pc.postalCode as string,
      cityName: pc.placeName as string,
      latitude: pc.lat as number,
      longitude: pc.lng as number,
      adminName: pc.adminName1 as string,
    }));

    // Deduplicate by postal code
    const seen = new Set<string>();
    const unique = entries.filter((e) => {
      if (seen.has(e.postalCode)) return false;
      seen.add(e.postalCode);
      return true;
    });

    PLZ_CACHE.set(countryCode, unique);
    return unique;
  } catch (error) {
    console.error(`Failed to fetch PLZ for ${countryCode}:`, error);
    return [];
  }
}

/** Estimated PLZ counts per country (for progress tracking) */
export const COUNTRY_PLZ_ESTIMATES: Record<string, number> = {
  MT: 74, LU: 90, CY: 160, EE: 200, LV: 250, SI: 400,
  LT: 500, HR: 600, SK: 1100, BG: 900, DK: 600, FI: 1200,
  IE: 800, AT: 2500, HU: 1600, CH: 4200, PT: 1500, GR: 1200,
  SE: 1700, CZ: 2500, RO: 1500, BE: 1200, NL: 4300, PL: 5500,
  ES: 5200, IT: 5600, FR: 6400, DE: 8200,
};
