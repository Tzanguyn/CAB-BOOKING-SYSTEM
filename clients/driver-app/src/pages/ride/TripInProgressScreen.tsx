import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { useDriverStore } from '../../store/driverStore';
import { driverApiService } from '../../services/driverService';
import { useSocket } from '@shared/contexts/SocketContext';
import showToast from '@shared/components/Toast';
import { VoiceNavWidget } from '../../components/VoiceNavWidget';
import { useAuth } from '@shared/contexts/AuthContext';
import { routeService } from '../../services/routeService';

const createDotIcon = (color: string) => L.divIcon({
  html: `<div class="w-4 h-4 rounded-full border-2 border-white shadow-md ${color}"></div>`,
  className: 'custom-dot-icon',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const driverCarIcon = L.divIcon({
  html: `<div class="text-3xl filter drop-shadow-lg transform -scale-x-100">🚕</div>`,
  className: 'bg-transparent border-none',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const MapBoundsUpdater = ({ positions }: { positions: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(L.latLngBounds(positions), { padding: [50, 50] });
    }
  }, [positions, map]);
  return null;
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const TripInProgressScreen = () => {
  const navigate = useNavigate();
  const { activeRide, rideStatus, currentLocation, completeRide, resetRide, setCurrentLocation } = useDriverStore();
  const { socket } = useSocket();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);

  useEffect(() => {
    if (rideStatus === 'IDLE' || !activeRide) {
      navigate('/driver/home');
      return;
    }
    
    if (routePath.length === 0) {
      routeService.getRoutePath(
        { lat: activeRide.pickup.lat, lng: activeRide.pickup.lng },
        { lat: activeRide.dropoff.lat, lng: activeRide.dropoff.lng }
      ).then(path => setRoutePath(path));
    }
  }, [rideStatus, activeRide, navigate]);

  // Simulation: Move vehicle towards dropoff location along the route
  useEffect(() => {
    if (!activeRide || rideStatus !== 'IN_PROGRESS' || routePath.length === 0) return;

    let simulationInterval: number;
    let currentStepIndex = 0;
    
    // We want the simulation to take about 40 steps (~1.3 minutes)
    const stepIncrement = Math.max(1, Math.ceil(routePath.length / 40));

    simulationInterval = window.setInterval(() => {
      if (currentStepIndex < routePath.length) {
        const [currentLat, currentLng] = routePath[currentStepIndex];
        
        setCurrentLocation(currentLat, currentLng);
        
        // Emit location update to socket so customer app can track
        if (socket) {
          socket.emit('driver.location.updated', {
            driverId: user?.id || '',
            lat: currentLat,
            lng: currentLng,
            heading: 0
          });
        }
        
        currentStepIndex += stepIncrement;
      } else {
        // Move to the exact final destination
        setCurrentLocation(activeRide.dropoff.lat, activeRide.dropoff.lng);
        clearInterval(simulationInterval);
      }
    }, 2000);

    return () => {
      if (simulationInterval) clearInterval(simulationInterval);
    };
  }, [activeRide, rideStatus, socket, user?.id, setCurrentLocation, routePath]); // Start simulation once routePath is available


  const handleComplete = async () => {
    if (!activeRide) return;
    setIsProcessing(true);
    try {
      await driverApiService.completeRide(activeRide.id, activeRide.price);
      console.log('[TripInProgress] completeRide API success');
    } catch (error: any) {
      // Log but don't block the flow
      console.error('[TripInProgress] completeRide error:', error?.response?.status, error?.response?.data || error?.message);
      const msg = error?.response?.data?.message || error?.message || 'Lỗi khi kết thúc chuyến';
      showToast.error(msg);
    }
    
    // Always emit socket event and complete the ride regardless of API result
    if (socket) {
      socket.emit('ride:status:change', {
        bookingId: activeRide.id,
        booking_id: activeRide.id,
        status: 'COMPLETED',
        actualFare: activeRide.price,
      });
    }
    
    completeRide();
    showToast.success('Hoàn thành chuyến đi!');
    
    // Show summary then return to home
    setTimeout(() => {
      resetRide();
      navigate('/driver/home');
    }, 2000);
  };

  if (!activeRide || !currentLocation) return null;

  const remainingDistance = calculateDistance(
    currentLocation.lat, currentLocation.lng,
    activeRide.dropoff.lat, activeRide.dropoff.lng
  );
  const displayDistance = Math.max(0.1, remainingDistance).toFixed(1);
  const displayEta = Math.max(1, Math.round(remainingDistance * 3));

  return (
    <div className="h-screen flex flex-col bg-slate-900 relative">
      {/* Voice Navigation Widget replacing static Top Banner */}
      <VoiceNavWidget 
        destinationAddress={activeRide.dropoff.address}
        distanceLeft={`${displayDistance} km`}
        etaMinutes={displayEta}
        isPickingUp={false}
      />

      {/* Map */}
      <div className="flex-1 w-full relative z-[0]">
        <MapContainer 
          center={[currentLocation.lat, currentLocation.lng]} 
          zoom={16} 
          zoomControl={false}
          className="w-full h-full"
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          
          <MapBoundsUpdater positions={[
            [activeRide.pickup.lat, activeRide.pickup.lng], 
            [activeRide.dropoff.lat, activeRide.dropoff.lng]
          ]} />
          
          <Marker position={[currentLocation.lat, currentLocation.lng]} icon={driverCarIcon} />
          <Marker position={[activeRide.dropoff.lat, activeRide.dropoff.lng]} icon={createDotIcon('bg-emerald-500')} />
          
          <Polyline 
            positions={routePath.length > 0 ? routePath : [[activeRide.pickup.lat, activeRide.pickup.lng], [activeRide.dropoff.lat, activeRide.dropoff.lng]]} 
            color="#10b981" weight={4} opacity={0.8} 
          />
        </MapContainer>
        
        {/* Safety button */}
        <button className="absolute bottom-32 right-4 z-[400] w-12 h-12 bg-slate-800 text-red-400 rounded-full shadow-lg flex items-center justify-center border border-slate-700">
          <ShieldAlert className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Panel */}
      <div className="absolute bottom-0 left-0 w-full bg-slate-900 border-t border-slate-800 p-6 rounded-t-[32px] z-[400] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        
        {/* Trip Info */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-slate-400 text-sm mb-1">Cần thu</p>
            <p className="text-3xl font-bold text-emerald-400">{activeRide.price.toLocaleString('vi-VN')}đ</p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-sm mb-1">Còn lại</p>
            <p className="text-2xl font-bold text-white">{displayDistance} km</p>
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={handleComplete}
          disabled={isProcessing}
          className="w-full h-16 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-bold text-white text-lg shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              KẾT THÚC CHUYẾN
              <CheckCircle2 className="w-6 h-6" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default TripInProgressScreen;
