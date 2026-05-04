import { create } from 'zustand';

export interface LocationData {
  lat: number;
  lng: number;
  address: string;
  name?: string;
}

export interface DriverData {
  driverId: string;
  name: string;
  phone: string;
  rating: number;
  vehicle: {
    plateNumber: string;
    model: string;
    color: string;
  };
  location?: { lat: number; lng: number };
}

export type RideStatus = 'IDLE' | 'SELECTING_DESTINATION' | 'CHOOSING_RIDE' | 'SEARCHING' | 'ACCEPTED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface BookingState {
  // Journey data
  pickup: LocationData | null;
  dropoff: LocationData | null;
  
  // Selected options
  vehicleType: string | null;
  estimatedPrice: number | null;
  surgeMultiplier: number;
  distanceKm: number;
  
  // Active Ride Data
  status: RideStatus;
  bookingId: string | null;       // MongoDB _id
  bookingCode: string | null;     // Custom BKG-xxx format
  rideId: string | null;
  driver: DriverData | null;
  eta: number | null; // minutes
  
  // Actions
  setPickup: (loc: LocationData | null) => void;
  setDropoff: (loc: LocationData | null) => void;
  setRideOptions: (type: string, price: number, surge: number, distance: number) => void;
  setStatus: (status: RideStatus) => void;
  setBookingIds: (mongoId: string, bookingCode: string | null) => void;
  setActiveRide: (bookingId: string, rideId: string | null, driver: DriverData | null) => void;
  updateDriverLocation: (lat: number, lng: number) => void;
  setEta: (minutes: number) => void;
  resetBooking: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  pickup: null,
  dropoff: null,
  
  vehicleType: null,
  estimatedPrice: null,
  surgeMultiplier: 1,
  distanceKm: 0,
  
  status: 'IDLE',
  bookingId: null,
  bookingCode: null,
  rideId: null,
  driver: null,
  eta: null,
  
  setPickup: (pickup) => set({ pickup }),
  setDropoff: (dropoff) => set({ dropoff }),
  setRideOptions: (vehicleType, estimatedPrice, surgeMultiplier, distanceKm) => 
    set({ vehicleType, estimatedPrice, surgeMultiplier, distanceKm }),
  setStatus: (status) => set({ status }),
  setBookingIds: (bookingId, bookingCode) => set({ bookingId, bookingCode }),
  setActiveRide: (bookingId, rideId, driver) => set({ bookingId, rideId, driver }),
  updateDriverLocation: (lat, lng) => set((state) => ({
    driver: state.driver ? { ...state.driver, location: { lat, lng } } : null
  })),
  setEta: (eta) => set({ eta }),
  resetBooking: () => set({
    dropoff: null,
    vehicleType: null,
    estimatedPrice: null,
    surgeMultiplier: 1,
    distanceKm: 0,
    status: 'IDLE',
    bookingId: null,
    bookingCode: null,
    rideId: null,
    driver: null,
    eta: null
  })
}));
