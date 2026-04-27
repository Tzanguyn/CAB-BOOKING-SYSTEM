import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Ban, CheckCircle2 } from 'lucide-react';
import { useDriverStore } from '../../store/driverStore';
import { driverApiService } from '../../services/driverService';
import showToast from '@shared/components/Toast';

const createDotIcon = (color: string) => L.divIcon({
  html: `<div class="w-4 h-4 rounded-full border-2 border-white shadow-md ${color}"></div>`,
  className: 'custom-dot-icon',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const IncomingRideScreen = () => {
  const navigate = useNavigate();
  const { activeRide, rideStatus, acceptRide, declineRide } = useDriverStore();
  const [timeLeft, setTimeLeft] = useState(15);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (rideStatus !== 'INCOMING' || !activeRide) {
      navigate('/driver/home');
      return;
    }

    // Countdown Timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleDecline(true); // Auto decline on timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [rideStatus, activeRide, navigate]);

  const handleAccept = async () => {
    if (!activeRide) return;
    setIsProcessing(true);
    try {
      await driverApiService.acceptRide(activeRide.id);
      acceptRide(); // change state to PICKING_UP
      navigate('/driver/pickup');
    } catch (error) {
      showToast.error('Lỗi khi nhận chuyến');
      declineRide();
      navigate('/driver/home');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async (isAuto: boolean = false) => {
    if (!activeRide) return;
    setIsProcessing(true);
    try {
      await driverApiService.declineRide(activeRide.id);
      if (!isAuto) showToast.success('Đã từ chối chuyến');
    } catch (error) {
      console.warn('Decline error', error);
    } finally {
      setIsProcessing(false);
      declineRide();
      navigate('/driver/home');
    }
  };

  if (!activeRide) return null;

  return (
    <div className="h-screen w-full bg-slate-950 text-white flex flex-col relative overflow-hidden animate-fade-in z-[1000]">
      {/* Background Pulse Effect */}
      <div className="absolute inset-0 flex justify-center items-center pointer-events-none opacity-20">
        <div className="w-[80vw] h-[80vw] bg-emerald-500 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
      </div>

      <div className="pt-12 pb-6 px-6 text-center relative z-10">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2 uppercase">Có chuyến mới!</h1>
        <p className="text-slate-400">Tự động từ chối sau <span className={`font-bold text-lg ${timeLeft <= 5 ? 'text-red-500' : 'text-emerald-400'}`}>{timeLeft}s</span></p>
        
        {/* Progress bar */}
        <div className="w-full h-1 bg-slate-800 rounded-full mt-4 overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ease-linear ${timeLeft <= 5 ? 'bg-red-500' : 'bg-emerald-500'}`}
            style={{ width: `${(timeLeft / 15) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 bg-slate-900 rounded-t-[40px] shadow-[0_-10px_50px_rgba(0,0,0,0.5)] p-6 flex flex-col relative z-10 mt-2">
        {/* Price & Distance */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-6 mb-6">
          <div>
            <p className="text-slate-400 text-sm mb-1">Giá cước</p>
            <p className="text-3xl font-bold text-emerald-400">
              {activeRide.price.toLocaleString('vi-VN')}đ
            </p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-sm mb-1">Khoảng cách</p>
            <p className="text-2xl font-bold text-white">
              {activeRide.distanceKm.toFixed(1)} <span className="text-sm font-normal text-slate-400">km</span>
            </p>
          </div>
        </div>

        {/* Route Details */}
        <div className="space-y-6 mb-8 flex-1">
          <div className="flex gap-4">
            <div className="flex flex-col items-center mt-1">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-indigo-500" />
              </div>
              <div className="w-0.5 h-12 bg-slate-800 my-1"></div>
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <div className="w-3 h-3 rounded-none bg-emerald-500" />
              </div>
            </div>
            
            <div className="flex-1 flex flex-col justify-between py-1">
              <div>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Điểm đón ({activeRide.etaToPickup} phút)</p>
                <p className="text-white font-medium line-clamp-2">{activeRide.pickup.address}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1 mt-2">Điểm đến</p>
                <p className="text-white font-medium line-clamp-2">{activeRide.dropoff.address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mini Map */}
        <div className="h-32 rounded-2xl overflow-hidden mb-8 border border-slate-800 relative pointer-events-none">
          <MapContainer 
            bounds={[[activeRide.pickup.lat, activeRide.pickup.lng], [activeRide.dropoff.lat, activeRide.dropoff.lng]]} 
            zoomControl={false}
            className="w-full h-full"
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            <Marker position={[activeRide.pickup.lat, activeRide.pickup.lng]} icon={createDotIcon('bg-indigo-500')} />
            <Marker position={[activeRide.dropoff.lat, activeRide.dropoff.lng]} icon={createDotIcon('bg-emerald-500')} />
            <Polyline positions={[[activeRide.pickup.lat, activeRide.pickup.lng], [activeRide.dropoff.lat, activeRide.dropoff.lng]]} color="#34d399" weight={3} />
          </MapContainer>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent z-[400]"></div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button 
            onClick={() => handleDecline(false)}
            disabled={isProcessing}
            className="w-16 h-16 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-50"
          >
            <Ban className="w-6 h-6 text-red-400" />
          </button>
          <button 
            onClick={handleAccept}
            disabled={isProcessing}
            className="flex-1 h-16 bg-emerald-500 hover:bg-emerald-400 rounded-2xl font-bold text-white text-lg shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Chấp nhận
                <CheckCircle2 className="w-6 h-6 ml-1" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingRideScreen;
