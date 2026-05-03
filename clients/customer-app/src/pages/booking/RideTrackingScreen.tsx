import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookingStore } from '../../store/bookingStore';
import { useSocket } from '@shared/contexts/SocketContext';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { User, Phone, MessageSquare, Shield, Share2, Car, MapPin, Navigation } from 'lucide-react';
import { routeService } from '../../services/routeService';
import showToast from '@shared/components/Toast';

const createDotIcon = (color: string, size: number = 14) => L.divIcon({
  html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.2)"></div>`,
  className: 'custom-dot-icon',
  iconSize: [size, size],
  iconAnchor: [size/2, size/2]
});

const driverCarIcon = L.divIcon({
  html: `<div style="font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));transform:scaleX(-1)">🚕</div>`,
  className: 'custom-car-icon bg-transparent border-none',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

// Auto-fit map
const MapBoundsUpdater = ({ positions }: { positions: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [positions, map]);
  return null;
};

type TrackingStep = 'ACCEPTED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED';

const steps: { key: TrackingStep; label: string }[] = [
  { key: 'ACCEPTED', label: 'Đang đến' },
  { key: 'ARRIVED', label: 'Đã đến' },
  { key: 'IN_PROGRESS', label: 'Đang đi' },
  { key: 'COMPLETED', label: 'Hoàn tất' },
];

const RideTrackingScreen = () => {
  const navigate = useNavigate();
  const { pickup, dropoff, driver, status, setStatus, updateDriverLocation, bookingId, bookingCode, resetBooking } = useBookingStore();
  const { socket } = useSocket();
  const [currentEta, setCurrentEta] = useState<number>(5);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);

  // Check if event matches our booking
  const isOurBooking = (data: any) => {
    const eventId = data.bookingId || data.booking_id || '';
    if (bookingId && (eventId === bookingId)) return true;
    if (bookingCode && (eventId === bookingCode)) return true;
    // Also check booking_id field
    const eventMongoId = data.booking_id || '';
    if (bookingId && eventMongoId === bookingId) return true;
    return false;
  };

  useEffect(() => {
    if (!pickup || !dropoff || !driver) {
      navigate('/customer/home');
      return;
    }

    // Fetch route path
    routeService.getRoutePath(
      { lat: pickup.lat, lng: pickup.lng },
      { lat: dropoff.lat, lng: dropoff.lng }
    ).then(path => setRoutePath(path));

    // If status is already COMPLETED (e.g. navigated back), redirect
    if (status === 'COMPLETED') {
      showToast.success('Chuyến đi đã hoàn thành!');
      navigate('/customer/rating');
      return;
    }

    if (socket) {
      socket.on('driver.location.updated', (data: any) => {
        if (data.driverId === driver.driverId && data.lat && data.lng) {
          updateDriverLocation(data.lat, data.lng);
        }
      });

      // Also listen for ride:location:update from the GPS tracker
      socket.on('ride:location:update', (data: any) => {
        if (data.location?.coordinates) {
          updateDriverLocation(data.location.coordinates.lat, data.location.coordinates.lng);
        }
      });

      // Primary status update listener (from direct socket emit by driver app)
      socket.on('ride.status.updated', (data: any) => {
        if (isOurBooking(data)) {
          if (data.status === 'ARRIVED') {
            setStatus('ARRIVED');
            setCurrentEta(0);
          } else if (data.status === 'IN_PROGRESS') {
            setStatus('IN_PROGRESS');
          } else if (data.status === 'COMPLETED') {
            setStatus('COMPLETED');
            showToast.success('Chuyến đi đã hoàn thành!');
            // Không gọi resetBooking() ở đây vì trang rating cần thông tin tài xế
            navigate('/customer/rating');
          } else if (data.status === 'CANCELLED') {
            alert('Chuyến đi đã bị hủy');
            resetBooking();
            navigate('/customer/home');
          }
        }
      });

      // Backup listeners for MqBridge events (redundancy path)
      socket.on('booking.started', (data: any) => {
        if (isOurBooking(data)) {
          setStatus('IN_PROGRESS');
        }
      });

      socket.on('booking.completed', (data: any) => {
        if (isOurBooking(data)) {
          setStatus('COMPLETED');
          showToast.success('Chuyến đi đã hoàn thành!');
          navigate('/customer/rating');
        }
      });

      socket.on('booking.cancelled', (data: any) => {
        if (isOurBooking(data)) {
          alert('Chuyến đi đã bị hủy');
          resetBooking();
          navigate('/customer/home');
        }
      });

      socket.on('ride.eta.updated', (data: any) => {
        if (isOurBooking(data) && data.eta) {
          setCurrentEta(data.eta);
        }
      });

      return () => {
        socket.off('driver.location.updated');
        socket.off('ride:location:update');
        socket.off('ride.status.updated');
        socket.off('ride.eta.updated');
        socket.off('booking.started');
        socket.off('booking.completed');
        socket.off('booking.cancelled');
      };
    }
  }, [socket, pickup, dropoff, driver, bookingId, bookingCode, status]);

  if (!pickup || !dropoff || !driver) return null;

  const driverLoc = driver.location ? [driver.location.lat, driver.location.lng] : [pickup.lat + 0.005, pickup.lng + 0.005];
  const boundsPositions: [number, number][] = [[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng], driverLoc as [number, number]];

  const getCurrentStepIndex = () => {
    const map: Record<string, number> = { 'ACCEPTED': 0, 'ARRIVED': 1, 'IN_PROGRESS': 2, 'COMPLETED': 3 };
    return map[status] ?? 0;
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'ACCEPTED': return 'Tài xế đang trên đường đến đón bạn';
      case 'ARRIVED': return 'Tài xế đã đến điểm đón!';
      case 'IN_PROGRESS': return 'Đang di chuyển đến điểm đến';
      default: return 'Đang xử lý chuyến đi...';
    }
  };

  const currentStepIdx = getCurrentStepIndex();

  return (
    <div className="h-screen w-full relative flex flex-col bg-white overflow-hidden">
      
      {/* ── Step Indicator ── */}
      <div className="absolute top-0 left-0 right-0 z-[400] animate-slide-down">
        <div className="glass shadow-lg mx-4 mt-4 rounded-2xl p-4">
          {/* Steps */}
          <div className="flex items-center mb-3 px-1">
            {steps.map((step, i) => (
              <div key={step.key} className="flex items-center flex-1 last:flex-initial">
                <div className={`step-dot ${i < currentStepIdx ? 'completed' : i === currentStepIdx ? 'active' : ''}`}>
                  {i < currentStepIdx && (
                    <svg className="w-full h-full text-white p-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div className={`step-line ${i < currentStepIdx ? 'completed' : ''}`} />
                )}
              </div>
            ))}
          </div>

          {/* Status Text + ETA */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">{getStatusMessage()}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                <Car className="w-3 h-3" />
                {driver.vehicle?.plateNumber} • {driver.vehicle?.color} {driver.vehicle?.model}
              </p>
            </div>
            {status !== 'ARRIVED' && (
              <div className="w-14 h-14 gradient-primary rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
                <span className="text-lg font-extrabold text-white leading-none">{currentEta}</span>
                <span className="text-[9px] text-white/80 font-medium">phút</span>
              </div>
            )}
            {status === 'ARRIVED' && (
              <div className="w-14 h-14 gradient-success rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0 animate-pulse-glow-success">
                <MapPin className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Map ── */}
      <div className="flex-1 w-full relative z-[0]">
        <MapContainer 
          center={[pickup.lat, pickup.lng]} 
          zoom={15} 
          zoomControl={false}
          className="w-full h-full"
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          
          <MapBoundsUpdater positions={boundsPositions} />
          
          <Marker position={[pickup.lat, pickup.lng]} icon={createDotIcon('#6366f1', 16)} />
          <Marker position={[dropoff.lat, dropoff.lng]} icon={createDotIcon('#10b981', 16)} />
          <Marker position={driverLoc as [number, number]} icon={driverCarIcon} />

          <Polyline 
            positions={routePath.length > 0 ? routePath : [[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]]} 
            pathOptions={{ color: '#94a3b8', weight: 4, opacity: 0.8 }} 
          />
        </MapContainer>
        
        {/* Floating Safety Buttons */}
        <div className="absolute bottom-[220px] right-4 z-[400] flex flex-col gap-3">
          <button className="w-12 h-12 glass rounded-2xl shadow-lg flex items-center justify-center touch-bounce" title="Chia sẻ chuyến đi">
            <Share2 className="w-5 h-5 text-slate-600" />
          </button>
          <button className="w-12 h-12 bg-rose-50 border border-rose-200 rounded-2xl shadow-lg flex items-center justify-center touch-bounce" title="SOS">
            <Shield className="w-5 h-5 text-rose-500" />
          </button>
        </div>
      </div>

      {/* ── Driver Info Bottom Sheet ── */}
      <div className="bg-white rounded-t-[28px] -mt-4 z-[400] shadow-[0_-4px_30px_rgba(0,0,0,0.08)] relative animate-slide-up">
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-4" />
        
        <div className="px-5 pb-6">
          <div className="flex items-center gap-4 mb-5">
            {/* Driver Avatar */}
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-extrabold text-slate-900 truncate">{driver.name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="flex items-center gap-0.5 text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span className="text-xs font-bold text-slate-600">{driver.rating}</span>
                </div>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500">{driver.vehicle?.model}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-extrabold text-slate-900">{driver.vehicle?.plateNumber}</p>
              <p className="text-[11px] text-slate-400">{driver.vehicle?.color}</p>
            </div>
          </div>

          {/* Route info */}
          <div className="flex items-center gap-3 mb-5 p-3 bg-slate-50 rounded-xl">
            <div className="flex flex-col items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
              <div className="w-[1.5px] h-3 bg-slate-300"></div>
              <Navigation className="w-3 h-3 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-400 truncate">{pickup.name || pickup.address.split(',')[0]}</p>
              <div className="h-[1px] bg-slate-200 my-1"></div>
              <p className="text-[11px] font-semibold text-slate-700 truncate">{dropoff.name || dropoff.address.split(',')[0]}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors touch-bounce">
              <Phone className="w-4 h-4" />
              <span className="text-sm">Gọi điện</span>
            </button>
            <button className="flex-1 py-3.5 gradient-primary hover:opacity-90 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-600/20 touch-bounce">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm">Nhắn tin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Star icon inline for driver rating
const Star = ({ className }: { className: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

export default RideTrackingScreen;
