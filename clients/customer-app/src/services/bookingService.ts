import axiosClient from '../api/axiosClient';
export const bookingApiService = {
  async getEstimate(distanceKm: number, vehicleType: string = 'standard'): Promise<any> {
    try {
      const response = await axiosClient.post(`/api/pricing/estimate`, {
        distance_km: distanceKm,
        vehicleType: vehicleType,
        demandLevel: 'normal',
      });
      return response as any;
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

  async getEta(distanceKm: number): Promise<any> {
    try {
      const response = await axiosClient.post(`/api/eta/estimate`, {
        distance_km: distanceKm,
        traffic_level: 0.5
      });
      return response as any;
    } catch (error) {
      console.error('ETA error:', error);
      return { eta_minutes: Math.max(1, Math.round(distanceKm * 3)) };
    }
  },

  async createBooking(data: any): Promise<any> {
    const response = await axiosClient.post(`/api/bookings/`, data);
    return response as any;
  },

  async cancelBooking(bookingId: string): Promise<any> {
    const response = await axiosClient.post(`/api/bookings/${bookingId}/cancel`, {
      reason: 'Customer requested cancellation'
    });
    return response as any;
  }
};
