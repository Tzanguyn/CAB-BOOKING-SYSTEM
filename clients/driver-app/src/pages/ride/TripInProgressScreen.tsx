import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useDriverStore } from '../../store/driverStore';
import { driverApiService } from '../../services/driverService';
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

const TripInProgressScreen = () => {
  const navigate = useNavigate();
  const { activeRide, rideStatus, currentLocation, completeRide, resetRide } = useDriverStore();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (rideStatus !== 'IN_PROGRESS' || !activeRide || !currentLocation) {
      navigate('/driver/home');
    }
  }, [rideStatus, activeRide, currentLocation, navigate]);

  const handleComplete = async () => {
    if (!activeRide) return;
    setIsProcessing(true);
    try {
      await driverApiService.completeRide(activeRide.id, activeRide.price);
      completeRide();
      showToast.success('Hoàn thành chuyến đi!');
      
      // Show summary then return to home
      setTimeout(() => {
        resetRide();
        navigate('/driver/home');
      }, 2000);
      
    } catch (error) {
      showToast.error('Lỗi khi kết thúc chuyến');
      setIsProcessing(false);
    }
  };

  if (!activeRide || !currentLocation) return null;

  return (
    <div className="h-screen flex flex-col bg-slate-900 relative">
      {/* Top Banner */}
      <div className="absolute top-4 left-4 right-4 z-[400] bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-600/30 p-4 flex items-center justify-between text-white">
        <div>
          <h2 className="font-bold text-lg">Đang di chuyển</h2>
          <p className="text-emerald-100 text-sm">Điểm đến: {activeRide.dropoff.address}</p>
        </div>
        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur">
          <Navigation className="w-6 h-6" />
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
            [activeRide.dropoff.lat, activeRide.dropoff.lng]
          ]} />
          
          <Marker position={[currentLocation.lat, currentLocation.lng]} icon={driverCarIcon} />
          <Marker position={[activeRide.dropoff.lat, activeRide.dropoff.lng]} icon={createDotIcon('bg-emerald-500')} />
          
          <Polyline 
            positions={[[currentLocation.lat, currentLocation.lng], [activeRide.dropoff.lat, activeRide.dropoff.lng]]} 
            color="#10b981" weight={4} dashArray="10, 10" 
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
            <p className="text-2xl font-bold text-white">{activeRide.distanceKm} km</p>
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
