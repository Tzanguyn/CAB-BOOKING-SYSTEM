import axios from 'axios';

const GATEWAY_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const bookingApiService = {
  async getEstimate(distanceKm: number, vehicleType: string = 'standard') {
    try {
      const response = await axios.post(`${GATEWAY_URL}/api/pricing/estimate`, {
        distance_km: distanceKm,
        vehicleType: vehicleType,
        demandLevel: 'normal',
      });
      return response.data;
    } catch (error) {
      console.error('Estimate error:', error);
      // Fallback if service is down
      return {
        estimatedFare: Math.round(15000 + (distanceKm * 15000)),
        surge: 1,
        fallback: true
      };
    }
  },

  async getEta(distanceKm: number) {
    try {
      const response = await axios.post(`${GATEWAY_URL}/api/eta/estimate`, {
        distance_km: distanceKm,
        traffic_level: 0.5
      });
      return response.data;
    } catch (error) {
      console.error('ETA error:', error);
      return { eta_minutes: Math.max(1, Math.round(distanceKm * 3)) };
    }
  },

  async createBooking(data: any) {
    const token = localStorage.getItem('accessToken');
    const response = await axios.post(`${GATEWAY_URL}/api/bookings/`, data, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  async cancelBooking(bookingId: string) {
    const token = localStorage.getItem('accessToken');
    const response = await axios.post(`${GATEWAY_URL}/api/bookings/${bookingId}/cancel`, {
      reason: 'Customer requested cancellation'
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  }
};
