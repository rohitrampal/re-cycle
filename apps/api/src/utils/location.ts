/**
 * Location helpers: reduce precision for privacy (store ~11m, expose ~1.1km).
 */

const STORAGE_DECIMALS = 4;   // ~11 m – enough for radius search
const RESPONSE_DECIMALS = 2;  // ~1.1 km – approximate in public API

function roundTo(num: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(num * factor) / factor;
}

/** Round coordinates for storage (4 decimals). */
export function roundForStorage(lat: number, lng: number): { latitude: number; longitude: number } {
  return {
    latitude: roundTo(lat, STORAGE_DECIMALS),
    longitude: roundTo(lng, STORAGE_DECIMALS),
  };
}

/** Round location for public API response (2 decimals = approximate area). */
export function roundForResponse(loc: { latitude: number; longitude: number } | null): { latitude: number; longitude: number } | null {
  if (loc == null) return null;
  return {
    latitude: roundTo(loc.latitude, RESPONSE_DECIMALS),
    longitude: roundTo(loc.longitude, RESPONSE_DECIMALS),
  };
}
