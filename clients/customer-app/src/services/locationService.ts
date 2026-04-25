import axios from 'axios';

// Using OpenStreetMap Nominatim for Geocoding (Free, no API key required)
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

export interface LocationResult {
  lat: number;
  lng: number;
  address: string;
  name?: string;
}

export const locationService = {
  // Geocoding: Text to Lat/Lng
  async searchAddress(query: string): Promise<LocationResult[]> {
    if (!query || query.length < 3) return [];
    
    try {
      const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
        params: {
          q: query,
          format: 'json',
          addressdetails: 1,
          limit: 5,
          countrycodes: 'VN' // Restrict to Vietnam for CAB Booking
        },
        headers: {
          // Nominatim requires a valid User-Agent
          'User-Agent': 'CAB-Booking-App/1.0'
        }
      });

      return response.data.map((item: any) => ({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        address: item.display_name,
        name: item.name || item.address?.road || item.display_name.split(',')[0]
      }));
    } catch (error) {
      console.error('Error searching address:', error);
      return [];
    }
  },

  // Reverse Geocoding: Lat/Lng to Address
  async getAddressFromCoords(lat: number, lng: number): Promise<LocationResult | null> {
    try {
      const response = await axios.get(`${NOMINATIM_BASE_URL}/reverse`, {
        params: {
          lat,
          lon: lng,
          format: 'json',
          addressdetails: 1
        },
        headers: {
          'User-Agent': 'CAB-Booking-App/1.0'
        }
      });

      if (response.data && response.data.display_name) {
        return {
          lat,
          lng,
          address: response.data.display_name,
          name: response.data.name || response.data.address?.road || response.data.display_name.split(',')[0]
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting address from coords:', error);
      return null;
    }
  },
  
  // Calculate direct distance using Haversine formula (fallback if ETA service fails)
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return Number(distance.toFixed(2));
  }
};
