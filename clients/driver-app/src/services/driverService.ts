import axiosClient from '../api/axiosClient';

export const driverApiService = {
  async updateLocation(driverId: string, lat: number, lng: number): Promise<void> {
    try {
      await axiosClient.put(`/api/drivers/location/${driverId}`, { lat, lng });
    } catch (error) {
      console.warn('Failed to update location', error);
    }
  },

  async toggleStatus(driverId: string, status: 'ONLINE' | 'OFFLINE'): Promise<void> {
    try {
      await axiosClient.put(`/api/drivers/status/${driverId}`, { status });
    } catch (error) {
      console.warn('Failed to update status', error);
    }
  },

  async createProfile(data: any): Promise<any> {
    const response = await axiosClient.post(`/api/drivers/profile`, data);
    return response as any;
  },

  async acceptRide(bookingId: string, driverData: {
    driverId?: string;
    driverName?: string;
    driverPhone?: string;
    driverRating?: number;
    vehiclePlate?: string;
    vehicleModel?: string;
    vehicleColor?: string;
    driverLocation?: { lat: number; lng: number } | null;
  }): Promise<any> {
    const response = await axiosClient.post(`/api/bookings/${bookingId}/confirm`, {
      driverId: driverData.driverId || '',
      rideId: `RIDE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      driverName: driverData.driverName || 'Tài xế CAB',
      driverPhone: driverData.driverPhone || '',
      driverRating: driverData.driverRating || 4.9,
      vehiclePlate: driverData.vehiclePlate || '',
      vehicleModel: driverData.vehicleModel || '',
      vehicleColor: driverData.vehicleColor || '',
      driverLocation: driverData.driverLocation || null,
    });
    return response as any;
  },

  async declineRide(bookingId: string): Promise<void> {
    try {
      await axiosClient.post(`/api/bookings/${bookingId}/cancel`, { reason: 'Driver declined' });
    } catch (e) {
      console.warn('Decline error', e);
    }
  },

  async markPickedUp(bookingId: string): Promise<any> {
    const response = await axiosClient.post(`/api/bookings/${bookingId}/start`, {});
    return response as any;
  },

  async completeRide(bookingId: string, actualFare: number): Promise<any> {
    const response = await axiosClient.post(`/api/bookings/${bookingId}/complete`, { actualFare });
    return response as any;
  },
  
  async getPendingRides(): Promise<any[]> {
    try {
      const response: any = await axiosClient.get(`/api/bookings/pending/all`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (e) {
      console.warn('Failed to get pending rides', e);
      return [];
    }
  },
  
  async getEarnings(driverId: string, period: 'day' | 'week' = 'day') {
    try {
      const response: any = await axiosClient.get(`/api/payments/driver/${driverId}/earnings?period=${period}`);
      return response.data || { total: 0, rides: 0, history: [] };
    } catch (error) {
      console.warn('Get earnings error', error);
      return { total: 0, rides: 0, history: [] };
    }
  },

  /**
   * Upload a document (license, vehicle registration, etc.) to MinIO via storage-service.
   * @param file - File object from <input type="file">
   * @param userId - Driver's user ID
   * @param category - e.g. 'license-front', 'license-back', 'vehicle-registration'
   */
  async uploadDocument(file: File, userId: string, category: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('category', category);

    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const token = localStorage.getItem('accessToken');

    const response = await fetch(`${baseURL}/api/storage/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed (${response.status})`);
    }

    return response.json();
  },

  /**
   * List all uploaded documents for a driver.
   */
  async getDocuments(userId: string, category?: string): Promise<any> {
    try {
      const query = category ? `?category=${category}` : '';
      const response: any = await axiosClient.get(`/api/storage/files/${userId}${query}`);
      return response.data || response;
    } catch (error) {
      console.warn('Get documents error', error);
      return { files: [] };
    }
  },
};

