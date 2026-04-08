/**
 * Spoolman REST API client.
 * Spoolman is the source-of-truth for FDM filament spool data.
 * API docs: https://github.com/Donkie/Spoolman
 */

const SPOOLMAN_URL = process.env.SPOOLMAN_URL || "http://localhost:7912";

export interface SpoolmanSpool {
  id: number;
  filament: SpoolmanFilament;
  remaining_weight?: number;
  used_weight: number;
  first_used?: string;
  last_used?: string;
  location?: string;
  lot_nr?: string;
  comment?: string;
}

export interface SpoolmanFilament {
  id: number;
  name?: string;
  vendor?: SpoolmanVendor;
  material?: string;
  density: number;
  diameter: number;
  weight?: number;
  color_hex?: string;
  spool_weight?: number;
}

export interface SpoolmanVendor {
  id: number;
  name: string;
}

/**
 * Get all spools from Spoolman.
 */
export async function getSpools(): Promise<SpoolmanSpool[]> {
  const res = await fetch(`${SPOOLMAN_URL}/api/v1/spool`);
  if (!res.ok) throw new Error(`Spoolman API error: ${res.status}`);
  return res.json();
}

/**
 * Get a single spool by ID.
 */
export async function getSpoolById(id: number): Promise<SpoolmanSpool> {
  const res = await fetch(`${SPOOLMAN_URL}/api/v1/spool/${id}`);
  if (!res.ok) throw new Error(`Spoolman spool not found: ${id}`);
  return res.json();
}

/**
 * Record material usage for a spool.
 * @param spoolId - Spoolman spool ID
 * @param usedWeight - Weight used in grams
 */
export async function useSpoolMaterial(
  spoolId: number,
  usedWeight: number,
): Promise<void> {
  const res = await fetch(`${SPOOLMAN_URL}/api/v1/spool/${spoolId}/use`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ use_weight: usedWeight }),
  });
  if (!res.ok) throw new Error(`Failed to update spool usage: ${res.status}`);
}

/**
 * Get all filament types from Spoolman.
 */
export async function getFilaments(): Promise<SpoolmanFilament[]> {
  const res = await fetch(`${SPOOLMAN_URL}/api/v1/filament`);
  if (!res.ok) throw new Error(`Spoolman API error: ${res.status}`);
  return res.json();
}

/**
 * Get all vendors from Spoolman.
 */
export async function getVendors(): Promise<SpoolmanVendor[]> {
  const res = await fetch(`${SPOOLMAN_URL}/api/v1/vendor`);
  if (!res.ok) throw new Error(`Spoolman API error: ${res.status}`);
  return res.json();
}

/**
 * Check if Spoolman is reachable.
 */
export async function isSpoolmanAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${SPOOLMAN_URL}/api/v1/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
