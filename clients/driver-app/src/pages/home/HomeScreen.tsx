import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Power, Navigation, User, Bell } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import { useSocket } from '@shared/contexts/SocketContext';
import { useDriverStore } from '../../store/driverStore';
import { driverApiService } from '../../services/driverService';
import { IncomeWidget } from '../../components/IncomeWidget';

// Custom Map Marker
const driverCarIcon = L.divIcon({
  html: `<div class="text-4xl filter drop-shadow-xl transform -scale-x-100">🚕</div>`,
  className: 'bg-transparent border-none',
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

// Auto Center Map Component
const MapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 16, { animate: true, duration: 1 });
  }, [center, map]);
  return null;
};

const HomeScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, isConnected, connect, disconnect } = useSocket();
  const { isOnline, toggleOnline, setCurrentLocation, setIncomingRide, rideStatus } = useDriverStore();
  
  const [mapCenter, setMapCenter] = useState<[number, number]>([10.762622, 106.660172]);
  const [isLocating, setIsLocating] = useState(false);

  // Check KYC
  useEffect(() => {
    if (user && !user.isVerified) {
      navigate('/driver/kyc');
    }
  }, [user, navigate]);

  // Initial Location
  useEffect(() => {
    handleGetLocation();
  }, []);

  // Handle Socket & GPS loop when Online
  useEffect(() => {
    let locationInterval: ReturnType<typeof setInterval>;

    if (isOnline) {
      if (!isConnected) connect();

      // Emit location every 5 seconds
      locationInterval = setInterval(() => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              setMapCenter([latitude, longitude]);
              setCurrentLocation(latitude, longitude);
              
              // Emit via Socket
              if (socket) {
                socket.emit('driver.location.update', {
                  driverId: user?.id,
                  lat: latitude,
                  lng: longitude
                });
              }
              // Also update via API fallback
              if (user?.id) {
                driverApiService.updateLocation(user.id, latitude, longitude);
              }
            },
            () => console.warn('GPS Error'),
            { enableHighAccuracy: true, timeout: 5000 }
          );
        }
      }, 5000);

    } else {
      // Disconnect socket when offline to save battery/bandwidth
      disconnect();
    }

    return () => {
      clearInterval(locationInterval);
    };
  }, [isOnline, isConnected, socket, connect, disconnect, user?.id, setCurrentLocation]);

  // Listen for Incoming Ride & Fetch pending rides when online
  useEffect(() => {
    if (socket && isOnline) {
      // 1. Fetch existing pending rides
      const fetchPending = async () => {
        try {
          const rides = await driverApiService.getPendingRides();
          if (rides && rides.length > 0 && rideStatus === 'IDLE') {
            const data = rides[0];
            setIncomingRide({
              id: data.bookingId || data._id,
              customerName: data.customerName || 'Khách hàng',
              customerPhone: data.customerPhone,
              pickup: {
                lat: data.pickupLocation?.lat || data.pickupLocation?.latitude || 0,
                lng: data.pickupLocation?.lng || data.pickupLocation?.longitude || 0,
                address: data.pickupLocation?.address || 'Điểm đón'
              },
              dropoff: {
                lat: data.dropoffLocation?.lat || data.dropoffLocation?.latitude || 0,
                lng: data.dropoffLocation?.lng || data.dropoffLocation?.longitude || 0,
                address: data.dropoffLocation?.address || 'Điểm đến'
              },
              distanceKm: data.distanceKm || 5,
              price: data.estimatedFare || 50000,
              etaToPickup: data.etaMinutes || 3
            });
            navigate('/driver/incoming');
          }
        } catch (err) {
          console.warn('Failed to fetch pending rides', err);
        }
      };

      if (rideStatus === 'IDLE') {
        fetchPending();
      }

      // 2. Listen for new incoming rides
      const handleIncomingRide = (data: any) => {
        if (rideStatus !== 'IDLE') return; // Ignore if busy
        
        setIncomingRide({
          id: data.bookingId || data._id,
          customerName: data.customer?.name || data.customerName || 'Khách hàng',
          customerPhone: data.customer?.phone || data.customerPhone,
          pickup: data.pickupLocation,
          dropoff: data.dropoffLocation,
          distanceKm: data.distanceKm || 5,
          price: data.estimatedFare || 50000,
          etaToPickup: data.etaToPickup || data.etaMinutes || 3
        });
        navigate('/driver/incoming');
      };

      socket.on('ride.incoming', handleIncomingRide);

      return () => {
        socket.off('ride.incoming', handleIncomingRide);
      };
    }
  }, [socket, isOnline, rideStatus, setIncomingRide, navigate]);

  const handleGetLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.latitude, position.coords.longitude]);
          setCurrentLocation(position.coords.latitude, position.coords.longitude);
          setIsLocating(false);
        },
        () => setIsLocating(false),
        { enableHighAccuracy: true }
      );
    }
  };

  return (
    <div className="h-screen w-full relative flex flex-col bg-slate-900 overflow-hidden">
      
      {/* Top Overlay */}
      <div className="absolute top-0 left-0 w-full p-4 z-[400] flex justify-between items-start pointer-events-none">
        <button 
          onClick={() => navigate('/driver/earnings')}
          className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center pointer-events-auto active:scale-95 transition-transform"
        >
          <User className="w-6 h-6 text-slate-700" />
        </button>
        
        <div className="flex flex-col items-center pointer-events-auto gap-2">
          {/* Online/Offline Toggle */}
          <button
            onClick={async () => {
              const newStatus = !isOnline ? 'ONLINE' : 'OFFLINE';
              if (user?.id) {
                await driverApiService.toggleStatus(user.id, newStatus);
              }
              toggleOnline();
            }}
            className={`w-32 h-12 rounded-full font-bold shadow-xl transition-all flex items-center justify-center gap-2 ${
              isOnline 
                ? 'bg-emerald-500 text-white shadow-emerald-500/40 ring-4 ring-emerald-500/20' 
                : 'bg-white text-slate-700 shadow-black/10'
            }`}
          >
            <Power className={`w-5 h-5 ${isOnline ? 'text-white' : 'text-slate-400'}`} />
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </button>
          
          {isOnline && (
            <div className="bg-emerald-500/20 text-emerald-100 text-[10px] px-3 py-1 rounded-full font-medium backdrop-blur animate-pulse">
              Đang chờ chuyến mới...
            </div>
          )}
        </div>

        <div className="w-12 h-12 pointer-events-auto">
          {/* Empty spacer for alignment if needed, or we can just leave it */}
          <button className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform relative">
            <Bell className="w-6 h-6 text-slate-700" />
            <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
        </div>
      </div>

      {/* Income Widget */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[400] pointer-events-auto">
        <IncomeWidget amount={450000} rides={5} />
      </div>

      {/* Map */}
      <div className="flex-1 w-full relative z-[0]">
        <MapContainer 
          center={mapCenter} 
          zoom={16} 
          zoomControl={false}
          className="w-full h-full"
        >
          {/* Dark map theme for driver */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OSM'
          />
          <MapUpdater center={mapCenter} />
          <Marker position={mapCenter} icon={driverCarIcon} />
        </MapContainer>

        {/* Current Location Button */}
        <button 
          onClick={handleGetLocation}
          className="absolute bottom-6 right-4 z-[400] w-12 h-12 bg-slate-800 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform border border-slate-700"
        >
          <Navigation className={`w-5 h-5 ${isLocating ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {/* Offline Overlay */}
      {!isOnline && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-[200] flex items-center justify-center pointer-events-none">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl text-center max-w-[250px] shadow-2xl">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Power className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-white font-bold mb-2">Bạn đang Offline</h3>
            <p className="text-slate-400 text-sm">Bật Online để bắt đầu nhận chuyến và kiếm thêm thu nhập!</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;
