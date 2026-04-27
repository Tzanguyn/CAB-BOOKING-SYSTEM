import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { User, Phone, MessageSquare, Navigation, MapPin } from 'lucide-react';
import { useDriverStore } from '../../store/driverStore';
import { driverApiService } from '../../services/driverService';
import { useSocket } from '@shared/contexts/SocketContext';
import showToast from '@shared/components/Toast';

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
  const { activeRide, rideStatus, currentLocation, markAsPickedUp, resetRide } = useDriverStore();
  const { socket } = useSocket();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (rideStatus !== 'PICKING_UP' || !activeRide || !currentLocation) {
      navigate('/driver/home');
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
  }, [rideStatus, activeRide, currentLocation, navigate, socket, resetRide]);

  const handlePickedUp = async () => {
    if (!activeRide) return;
    setIsProcessing(true);
    try {
      await driverApiService.markPickedUp(activeRide.id);
      markAsPickedUp(); // Change status to IN_PROGRESS
      navigate('/driver/in-progress');
    } catch (error) {
      showToast.error('Lỗi khi cập nhật trạng thái');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!activeRide || !currentLocation) return null;

  return (
    <div className="h-screen flex flex-col bg-slate-900 relative">
      {/* Top Banner */}
      <div className="absolute top-4 left-4 right-4 z-[400] bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/30 p-4 flex items-center justify-between text-white">
        <div>
          <h2 className="font-bold text-lg">Đón khách</h2>
          <p className="text-indigo-200 text-sm">{activeRide.distanceKm} km • {activeRide.etaToPickup} phút</p>
        </div>
        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur">
          <Navigation className="w-6 h-6 rotate-45" />
        </div>
      </div>

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
            positions={[[currentLocation.lat, currentLocation.lng], [activeRide.pickup.lat, activeRide.pickup.lng]]} 
            color="#6366f1" weight={4} dashArray="10, 10" 
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
