const routeCache = new Map<string, [number, number][]>();

/**
 * Fetches a driving route from OSRM public API.
 * Returns array of [lat, lng] points for Leaflet.
 * Uses caching + retries with exponential backoff.
 */
async function fetchRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  retries = 3
): Promise<[number, number][]> {
  const cacheKey = `${start.lat.toFixed(4)},${start.lng.toFixed(4)}-${end.lat.toFixed(4)},${end.lng.toFixed(4)}`;

  // Return cached result if available
  const cached = routeCache.get(cacheKey);
  if (cached) {
    console.log('[routeService] Cache hit for', cacheKey);
    return cached;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = 1000 * Math.pow(2, attempt - 1);
        console.warn(`[routeService] Retry #${attempt} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
      const response = await fetch(url);

      if (!response.ok) {
        console.warn(`[routeService] OSRM HTTP ${response.status} (attempt ${attempt + 1}/${retries + 1})`);
        if (response.status === 429 && attempt < retries) {
          continue; // retry
        }
        throw new Error(`OSRM API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const coordinates = data.routes[0].geometry.coordinates;
        // OSRM returns [lng, lat], Leaflet needs [lat, lng]
        const path = coordinates.map((c: number[]) => [c[1], c[0]]) as [number, number][];
        routeCache.set(cacheKey, path);
        console.log(`[routeService] Route fetched: ${path.length} points`);
        return path;
      }
    } catch (error) {
      if (attempt >= retries) {
        console.warn('[routeService] All retries exhausted', error);
      }
    }
  }

  // Fallback: straight line between start and end
  console.warn('[routeService] Using straight-line fallback');
  return [
    [start.lat, start.lng],
    [end.lat, end.lng]
  ];
}

export const routeService = {
  getRoutePath: fetchRoute
};
