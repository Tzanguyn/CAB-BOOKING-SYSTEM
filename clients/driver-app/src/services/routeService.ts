export const routeService = {
  /**
   * Fetches a driving route from OSRM public API.
   * Note: OSRM returns coordinates in [lng, lat] format,
   * we reverse them to [lat, lng] for Leaflet mapping.
   */
  async getRoutePath(start: { lat: number; lng: number }, end: { lat: number; lng: number }): Promise<[number, number][]> {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`OSRM API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const coordinates = data.routes[0].geometry.coordinates;
        // Convert [lng, lat] to [lat, lng]
        return coordinates.map((c: number[]) => [c[1], c[0]]);
      }
    } catch (error) {
      console.warn('Failed to fetch route from OSRM, falling back to straight line', error);
    }
    
    // Fallback to straight line if API fails
    return [
      [start.lat, start.lng],
      [end.lat, end.lng]
    ];
  }
};
