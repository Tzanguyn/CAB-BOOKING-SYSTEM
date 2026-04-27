import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookingStore } from '../../store/bookingStore';
import { useSocket } from '@shared/contexts/SocketContext';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { User, Phone, MessageSquare, Shield, AlertTriangle } from 'lucide-react';
import { BottomSheet } from '@shared/components';

const createDotIcon = (color: string) => L.divIcon({
  html: `<div class="w-4 h-4 rounded-full border-2 border-white shadow-md ${color}"></div>`,
  className: 'custom-dot-icon',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const driverCarIcon = L.divIcon({
  html: `<div class="text-3xl filter drop-shadow-lg transform -scale-x-100">🚕</div>`,
  className: 'custom-car-icon bg-transparent border-none',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

// Auto-fit map to show all markers
const MapBoundsUpdater = ({ positions }: { positions: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [positions, map]);
  return null;
};

const RideTrackingScreen = () => {
  const navigate = useNavigate();
  const { pickup, dropoff, driver, status, setStatus, updateDriverLocation, bookingId, resetBooking } = useBookingStore();
  const { socket } = useSocket();
  const [currentEta, setCurrentEta] = useState<number>(5); // Mock ETA

  useEffect(() => {
    if (!pickup || !dropoff || !driver) {
      navigate('/customer/home');
      return;
    }

    if (socket) {
      // Listen to driver location updates
      socket.on('driver.location.updated', (data: any) => {
        if (data.driverId === driver.driverId && data.lat && data.lng) {
          updateDriverLocation(data.lat, data.lng);
        }
      });

      // Listen to ride status updates
      socket.on('ride.status.updated', (data: any) => {
        if (data.bookingId === bookingId) {
          if (data.status === 'ARRIVED') {
            setStatus('ARRIVED');
            setCurrentEta(0);
          } else if (data.status === 'IN_PROGRESS') {
            setStatus('IN_PROGRESS');
          } else if (data.status === 'COMPLETED') {
            setStatus('COMPLETED');
            navigate('/customer/payment');
          } else if (data.status === 'CANCELLED') {
            alert('Chuyến đi đã bị hủy');
            resetBooking();
            navigate('/customer/home');
          }
        }
      });

      // Listen to ETA updates
      socket.on('ride.eta.updated', (data: any) => {
        if (data.bookingId === bookingId && data.eta) {
          setCurrentEta(data.eta);
        }
      });

      // Simulate ride progress for demonstration (if backend not emitting)
      let simStep = 0;
      const simInterval = setInterval(() => {
        simStep++;
        if (status === 'ACCEPTED' && simStep === 2) setStatus('ARRIVED');
        if (status === 'ARRIVED' && simStep === 4) setStatus('IN_PROGRESS');
        if (status === 'IN_PROGRESS' && simStep === 8) {
          setStatus('COMPLETED');
          navigate('/customer/payment');
        }
      }, 5000);

      return () => {
        socket.off('driver.location.updated');
        socket.off('ride.status.updated');
        socket.off('ride.eta.updated');
        clearInterval(simInterval);
      };
    }
  }, [socket, pickup, dropoff, driver, bookingId, status]);

  if (!pickup || !dropoff || !driver) return null;

  const driverLoc = driver.location ? [driver.location.lat, driver.location.lng] : [pickup.lat + 0.005, pickup.lng + 0.005];
  const boundsPositions: [number, number][] = [[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng], driverLoc as [number, number]];

  const getStatusText = () => {
    switch (status) {
      case 'ACCEPTED': return `Tài xế đang đến • ${currentEta} phút`;
      case 'ARRIVED': return 'Tài xế đã đến điểm đón!';
      case 'IN_PROGRESS': return `Đang di chuyển đến điểm đến • ${currentEta * 2} phút`;
      default: return 'Đang xử lý chuyến đi...';
    }
  };

  return (
    <div className="h-screen w-full relative flex flex-col bg-slate-50 overflow-hidden">
      
      {/* Top Floating Status */}
      <div className="absolute top-4 left-4 right-4 z-[400] bg-white rounded-2xl shadow-lg p-4 flex items-center justify-between pointer-events-auto">
        <div>
          <h2 className="font-bold text-slate-800">{getStatusText()}</h2>
          <p className="text-xs text-slate-500 mt-0.5">Biển số: <span className="font-bold text-slate-700">{driver.vehicle?.plateNumber}</span></p>
        </div>
        <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center">
          <span className="text-lg font-bold text-indigo-600">{status === 'ARRIVED' ? '0' : currentEta}</span>
          <span className="text-[10px] text-indigo-600 ml-0.5 mt-2">p</span>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 w-full relative z-[0]">
        <MapContainer 
          center={[pickup.lat, pickup.lng]} 
          zoom={15} 
          zoomControl={false}
          className="w-full h-full"
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          
          <MapBoundsUpdater positions={boundsPositions} />
          
          <Marker position={[pickup.lat, pickup.lng]} icon={createDotIcon('bg-indigo-500')} />
          <Marker position={[dropoff.lat, dropoff.lng]} icon={createDotIcon('bg-emerald-500')} />
          
          {/* Driver Marker */}
          <Marker position={driverLoc as [number, number]} icon={driverCarIcon} />

          {/* Route line */}
          <Polyline positions={[[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]]} color="#94a3b8" weight={3} dashArray="5, 10" />
        </MapContainer>
        
        {/* Safety Tools Button */}
        <button className="absolute bottom-[200px] right-4 z-[400] w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center">
          <Shield className="w-5 h-5 text-blue-500" />
        </button>
        <button className="absolute bottom-[260px] right-4 z-[400] w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
        </button>
      </div>

      {/* Driver Info Sheet */}
      <BottomSheet 
        isOpen={true} 
        onClose={() => {}} 
        title=""
      >
        <div className="px-5 pb-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-white shadow-sm">
              <User className="w-6 h-6 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-800 truncate">{driver.name}</h3>
              <div className="flex items-center gap-1 text-amber-500 mt-0.5">
                <span>★</span>
                <span className="text-sm font-medium text-slate-600">{driver.rating}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-slate-800">{driver.vehicle?.color}</p>
              <p className="text-xs text-slate-500">{driver.vehicle?.model}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors">
              <Phone className="w-4 h-4" />
              Gọi điện
            </button>
            <button className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-600/20">
              <MessageSquare className="w-4 h-4" />
              Nhắn tin
            </button>
          </div>
        </div>
      </BottomSheet>

    </div>
  );
};

export default RideTrackingScreen;
