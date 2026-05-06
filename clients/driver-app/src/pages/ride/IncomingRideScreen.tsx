import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { CheckCircle2, MapPin } from 'lucide-react';
import { useDriverStore } from '../../store/driverStore';
import { driverApiService } from '../../services/driverService';
import { useAuth } from '@shared/contexts/AuthContext';
import { useSocket } from '@shared/contexts/SocketContext';
import showToast from '@shared/components/Toast';
import { routeService } from '../../services/routeService';

const createDotIcon = (color: string) => L.divIcon({
  html: `<div class="w-4 h-4 rounded-full border-2 border-white shadow-md ${color}"></div>`,
  className: 'custom-dot-icon',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const IncomingRideScreen = () => {
  const navigate = useNavigate();
  const { activeRide, rideStatus, currentLocation, acceptRide, declineRide } = useDriverStore();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [timeLeft, setTimeLeft] = useState(15);
  const [isProcessing, setIsProcessing] = useState(false);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const fetchedForRideId = useRef<string | null>(null);

  useEffect(() => {
    if (rideStatus === 'IDLE' || !activeRide) {
      navigate('/driver/home');
      return;
    }

    // Fetch route path once per unique ride
    if (fetchedForRideId.current !== activeRide.id) {
      fetchedForRideId.current = activeRide.id;
      setRoutePath([]);
      routeService.getRoutePath(
        { lat: activeRide.pickup.lat, lng: activeRide.pickup.lng },
        { lat: activeRide.dropoff.lat, lng: activeRide.dropoff.lng }
      ).then(path => setRoutePath(path));
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
      const driverData = {
        driverId: user?.id,
        driverName: user?.name || 'Tài xế CAB',
        driverPhone: user?.phone || '',
        driverRating: 4.9,
        driverLocation: currentLocation || null,
      };

      // 1. Call HTTP API to confirm the booking
      const res = await driverApiService.acceptRide(activeRide.id, driverData);

      // 2. Also emit socket event for instant notification (doesn't wait for RabbitMQ)
      if (socket) {
        socket.emit('booking:accept', {
          bookingId: activeRide.id,
          booking_id: activeRide.id,
          rideId: res?.data?.rideId || `RIDE-${Date.now()}`,
          driver: {
            driverId: user?.id || '',
            name: user?.name || 'Tài xế CAB',
            phone: user?.phone || '',
            rating: 4.9,
            vehicle: {
              plateNumber: 'N/A',
              model: 'Xe hơi',
              color: 'Trắng',
            },
            location: currentLocation || null,
          },
        });
      }

      acceptRide(); // change state to PICKING_UP
      navigate('/driver/pickup');
    } catch (error) {
      console.error('[IncomingRide] Accept error:', error);
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
    <div className="h-screen w-full relative flex flex-col items-center justify-end p-4 overflow-hidden bg-slate-900 z-[1000]">
      
      {/* Background Map Simulation */}
      <div className="absolute inset-0 z-[0] pointer-events-none opacity-50 blur-[2px]">
        <MapContainer 
          center={[activeRide.pickup.lat, activeRide.pickup.lng]} 
          zoom={15} 
          zoomControl={false}
          className="w-full h-full"
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          <Marker position={[activeRide.pickup.lat, activeRide.pickup.lng]} icon={createDotIcon('bg-indigo-500')} />
          <Marker position={[activeRide.dropoff.lat, activeRide.dropoff.lng]} icon={createDotIcon('bg-emerald-500')} />
          <Polyline 
            positions={routePath.length > 0 ? routePath : [[activeRide.pickup.lat, activeRide.pickup.lng], [activeRide.dropoff.lat, activeRide.dropoff.lng]]} 
            pathOptions={{ color: '#6366f1', weight: 4, opacity: 0.8 }} 
          />
        </MapContainer>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-900/40 z-[10]"></div>
      </div>

      {/* Radar Ping Animation */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10]">
        <div className="w-32 h-32 bg-indigo-500/20 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-indigo-500/40 rounded-full animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-4 border-indigo-500/30 rounded-full"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.5)]">
          <MapPin className="w-8 h-8 text-white" />
        </div>
      </div>

      <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center z-10 w-full px-6">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2 uppercase drop-shadow-md">Có chuyến mới!</h1>
        <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full inline-block border border-slate-700">
          <p className="text-slate-300 text-sm">Tự động từ chối sau <span className={`font-bold text-lg ${timeLeft <= 5 ? 'text-red-500' : 'text-emerald-400'}`}>{timeLeft}s</span></p>
        </div>
        
        {/* Progress bar */}
        <div className="w-full max-w-[200px] mx-auto h-1.5 bg-slate-800 rounded-full mt-4 overflow-hidden shadow-inner">
          <div 
            className={`h-full transition-all duration-1000 ease-linear ${timeLeft <= 5 ? 'bg-red-500' : 'bg-emerald-500'}`}
            style={{ width: `${(timeLeft / 15) * 100}%` }}
          />
        </div>
      </div>

      {/* Info Card */}
      <div className="w-full bg-slate-900/95 backdrop-blur-xl border border-slate-700 p-6 rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative z-[20] flex flex-col mb-4">
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

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 mt-4">
          <button 
            onClick={handleAccept}
            disabled={isProcessing}
            className="w-full h-20 bg-emerald-500 hover:bg-emerald-400 rounded-3xl font-black text-white text-2xl shadow-[0_10px_30px_rgba(16,185,129,0.3)] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isProcessing ? (
              <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                NHẬN CHUYẾN NGAY
                <CheckCircle2 className="w-8 h-8" />
              </>
            )}
          </button>
          <button 
            onClick={() => handleDecline(false)}
            disabled={isProcessing}
            className="w-full h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-300 font-bold transition-colors disabled:opacity-50"
          >
            Từ chối chuyến này
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingRideScreen;
