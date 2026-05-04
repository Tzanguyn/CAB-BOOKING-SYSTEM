import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { User, Phone, MessageSquare, MapPin } from 'lucide-react';
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

const PickupScreen = () => {
  const navigate = useNavigate();
  const { activeRide, rideStatus, currentLocation, markAsPickedUp, resetRide, setCurrentLocation } = useDriverStore();
  const { socket } = useSocket();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);

  useEffect(() => {
    if (rideStatus === 'IDLE' || !activeRide || !currentLocation) {
      navigate('/driver/home');
      return;
    }
    
    if (routePath.length === 0) {
      routeService.getRoutePath(
        { lat: currentLocation.lat, lng: currentLocation.lng },
        { lat: activeRide.pickup.lat, lng: activeRide.pickup.lng }
      ).then(path => setRoutePath(path));
    }
    
    // Simulate customer cancellation
    if (socket) {
      socket.on('booking.cancelled', (data: any) => {
        if (data.bookingId === activeRide?.id) {
          showToast.error('Khách hàng đã hủy chuyến');
          resetRide();
          navigate('/driver/home');
        }
      });
    }

    return () => {
      if (socket) socket.off('booking.cancelled');
    };
  }, [rideStatus, activeRide, navigate, socket, resetRide]);

  // Simulation: Move vehicle towards pickup location along the route
  useEffect(() => {
    if (!activeRide || rideStatus !== 'PICKING_UP' || routePath.length === 0) return;

    let simulationInterval: number;
    let currentStepIndex = 0;
    
    // We want the simulation to take about 30 steps (~1 minute)
    const stepIncrement = Math.max(1, Math.ceil(routePath.length / 30));

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

          // If reached destination, notify customer that driver has arrived
          if (currentStepIndex + stepIncrement >= routePath.length) {
            socket.emit('ride:status:change', {
              bookingId: activeRide.id,
              booking_id: activeRide.id,
              status: 'ARRIVED'
            });
            showToast.success('Đã đến điểm đón khách');
          }
        }
        
        currentStepIndex += stepIncrement;
      } else {
        // Move to the exact final destination
        setCurrentLocation(activeRide.pickup.lat, activeRide.pickup.lng);
        clearInterval(simulationInterval);
      }
    }, 2000);

    return () => {
      if (simulationInterval) clearInterval(simulationInterval);
    };
  }, [activeRide, rideStatus, socket, user?.id, setCurrentLocation, routePath]); // Start simulation once routePath is available



  const handlePickedUp = async () => {
    if (!activeRide) return;
    setIsProcessing(true);
    try {
      await driverApiService.markPickedUp(activeRide.id);
      console.log('[PickupScreen] markPickedUp API success');
    } catch (error: any) {
      // Log but don't block the flow - API might fail due to network/state issues
      // but we still want to proceed with the ride
      console.error('[PickupScreen] markPickedUp error:', error?.response?.status, error?.response?.data || error?.message);
      const msg = error?.response?.data?.message || error?.message || 'Lỗi khi cập nhật trạng thái';
      showToast.error(msg);
    }
    
    // Always emit socket event and navigate regardless of API result
    // This ensures customer app gets notified even if booking-service has issues
    if (socket) {
      socket.emit('ride:status:change', {
        bookingId: activeRide.id,
        booking_id: activeRide.id,
        status: 'IN_PROGRESS',
      });
    }
    
    markAsPickedUp(); // Change local status to IN_PROGRESS
    showToast.success('Đã đón khách thành công!');
    setIsProcessing(false);
    navigate('/driver/in-progress');
  };

  if (!activeRide || !currentLocation) return null;

  return (
    <div className="h-screen flex flex-col bg-slate-900 relative">
      {/* Voice Navigation Widget replacing static Top Banner */}
      <VoiceNavWidget 
        destinationAddress={activeRide.pickup.address}
        distanceLeft={`${activeRide.distanceKm} km`}
        etaMinutes={activeRide.etaToPickup || 5}
        isPickingUp={true}
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
            [currentLocation.lat, currentLocation.lng], 
            [activeRide.pickup.lat, activeRide.pickup.lng]
          ]} />
          
          <Marker position={[currentLocation.lat, currentLocation.lng]} icon={driverCarIcon} />
          <Marker position={[activeRide.pickup.lat, activeRide.pickup.lng]} icon={createDotIcon('bg-indigo-500')} />
          
          <Polyline 
            positions={routePath.length > 0 ? routePath : [[currentLocation.lat, currentLocation.lng], [activeRide.pickup.lat, activeRide.pickup.lng]]} 
            color="#6366f1" weight={4} opacity={0.8} 
          />
        </MapContainer>
      </div>

      {/* Bottom Panel */}
      <div className="absolute bottom-0 left-0 w-full bg-slate-900 border-t border-slate-800 p-6 rounded-t-[32px] z-[400] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        
        {/* Customer Info */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4 items-center">
            <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{activeRide.customerName}</h3>
              <p className="text-slate-400 text-sm flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {activeRide.pickup.address}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button className="w-12 h-12 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full flex items-center justify-center transition-colors">
              <MessageSquare className="w-5 h-5" />
            </button>
            <button className="w-12 h-12 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-full flex items-center justify-center transition-colors">
              <Phone className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Slider / Button */}
        <button 
          onClick={handlePickedUp}
          disabled={isProcessing}
          className="w-full h-16 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-white text-lg shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'ĐÃ ĐÓN KHÁCH'
          )}
        </button>
      </div>
    </div>
  );
};

export default PickupScreen;
