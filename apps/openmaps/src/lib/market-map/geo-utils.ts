export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function parseBbox(bbox: string | null): [number, number, number, number] | null {
  if (!bbox) return null;
  const parts = bbox.split(",").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return null;
  return parts as [number, number, number, number];
}

export const EU_COUNTRY_CENTERS: Record<string, { lat: number; lng: number }> = {
  AT: { lat: 47.52, lng: 14.55 }, BE: { lat: 50.50, lng: 4.47 }, BG: { lat: 42.73, lng: 25.49 },
  HR: { lat: 45.10, lng: 15.20 }, CY: { lat: 35.13, lng: 33.43 }, CZ: { lat: 49.82, lng: 15.47 },
  DK: { lat: 56.26, lng: 9.50 }, EE: { lat: 58.60, lng: 25.01 }, FI: { lat: 61.92, lng: 25.75 },
  FR: { lat: 46.23, lng: 2.21 }, DE: { lat: 51.17, lng: 10.45 }, GR: { lat: 39.07, lng: 21.82 },
  HU: { lat: 47.16, lng: 19.50 }, IE: { lat: 53.14, lng: -7.69 }, IT: { lat: 41.87, lng: 12.57 },
  LV: { lat: 56.88, lng: 24.60 }, LT: { lat: 55.17, lng: 23.88 }, LU: { lat: 49.82, lng: 6.13 },
  MT: { lat: 35.94, lng: 14.38 }, NL: { lat: 52.13, lng: 5.29 }, PL: { lat: 51.92, lng: 19.15 },
  PT: { lat: 39.40, lng: -8.22 }, RO: { lat: 45.94, lng: 24.97 }, SK: { lat: 48.67, lng: 19.70 },
  SI: { lat: 46.15, lng: 14.99 }, ES: { lat: 40.46, lng: -3.75 }, SE: { lat: 60.13, lng: 18.64 },
};
