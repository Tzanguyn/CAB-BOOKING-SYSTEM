import axios from 'axios';

const GATEWAY_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const getHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return { Authorization: `Bearer ${token}` };
};

export const driverApiService = {
  async updateLocation(lat: number, lng: number) {
    try {
      await axios.post(`${GATEWAY_URL}/api/drivers/location`, { lat, lng }, { headers: getHeaders() });
    } catch (error) {
      console.warn('Failed to update location', error);
    }
  },

  async acceptRide(bookingId: string) {
    const response = await axios.post(`${GATEWAY_URL}/api/bookings/${bookingId}/confirm`, {}, { headers: getHeaders() });
    return response.data;
  },

  async declineRide(bookingId: string) {
    // There might not be an explicit "decline" to the booking service from the driver
    // Often it just times out or notifies matching service
    try {
      await axios.post(`${GATEWAY_URL}/api/bookings/${bookingId}/cancel`, { reason: 'Driver declined' }, { headers: getHeaders() });
    } catch (e) {
      console.warn('Decline error', e);
    }
  },

  async markPickedUp(bookingId: string) {
    const response = await axios.post(`${GATEWAY_URL}/api/bookings/${bookingId}/start`, {}, { headers: getHeaders() });
    return response.data;
  },

  async completeRide(bookingId: string, actualFare: number) {
    const response = await axios.post(`${GATEWAY_URL}/api/bookings/${bookingId}/complete`, { actualFare }, { headers: getHeaders() });
    return response.data;
  },
  
  async getEarnings(period: 'day' | 'week' = 'day') {
    try {
      // Mocked if API doesn't exist
      // const response = await axios.get(`${GATEWAY_URL}/api/payments/driver/earnings?period=${period}`, { headers: getHeaders() });
      // return response.data;
      
      // Return mock data for now
      return {
        total: period === 'day' ? 450000 : 3250000,
        rides: period === 'day' ? 5 : 32,
        history: [
          { id: '1', date: new Date().toISOString(), amount: 75000, pickup: 'Quận 1', dropoff: 'Quận 3' },
          { id: '2', date: new Date(Date.now() - 3600000).toISOString(), amount: 125000, pickup: 'Quận 3', dropoff: 'Sân bay TSN' },
          { id: '3', date: new Date(Date.now() - 7200000).toISOString(), amount: 50000, pickup: 'Phú Nhuận', dropoff: 'Bình Thạnh' },
        ]
      };
    } catch (error) {
      return { total: 0, rides: 0, history: [] };
    }
  }
};
