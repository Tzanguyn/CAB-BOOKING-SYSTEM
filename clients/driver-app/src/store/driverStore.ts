import { create } from 'zustand';

export interface LocationData {
  lat: number;
  lng: number;
  address: string;
}

export interface RideData {
  id: string;
  customerName: string;
  customerPhone?: string;
  pickup: LocationData;
  dropoff: LocationData;
  distanceKm: number;
  price: number;
  etaToPickup?: number;
}

export type DriverStatus = 'OFFLINE' | 'ONLINE';
export type RideStatus = 'IDLE' | 'INCOMING' | 'PICKING_UP' | 'IN_PROGRESS' | 'COMPLETED';

interface DriverState {
  isOnline: boolean;
  currentLocation: { lat: number; lng: number } | null;
  status: DriverStatus;
  rideStatus: RideStatus;
  activeRide: RideData | null;
  
  // Actions
  toggleOnline: () => void;
  setCurrentLocation: (lat: number, lng: number) => void;
  setIncomingRide: (ride: RideData) => void;
  acceptRide: () => void;
  declineRide: () => void;
  markAsPickedUp: () => void;
  completeRide: () => void;
  resetRide: () => void;
}

export const useDriverStore = create<DriverState>((set) => ({
  isOnline: false,
  currentLocation: null,
  status: 'OFFLINE',
  rideStatus: 'IDLE',
  activeRide: null,
  
  toggleOnline: () => set((state) => {
    const newStatus = !state.isOnline;
    return { isOnline: newStatus, status: newStatus ? 'ONLINE' : 'OFFLINE' };
  }),
  
  setCurrentLocation: (lat, lng) => set({ currentLocation: { lat, lng } }),
  
  setIncomingRide: (ride) => set({ activeRide: ride, rideStatus: 'INCOMING' }),
  
  acceptRide: () => set({ rideStatus: 'PICKING_UP' }),
  
  declineRide: () => set({ activeRide: null, rideStatus: 'IDLE' }),
  
  markAsPickedUp: () => set({ rideStatus: 'IN_PROGRESS' }),
  
  completeRide: () => set({ rideStatus: 'COMPLETED' }),
  
  resetRide: () => set({ activeRide: null, rideStatus: 'IDLE' })
}));
