import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, useMap, useMapEvents, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { Search, Navigation, Menu, Home as HomeIcon, Briefcase, ChevronRight, MapPin } from 'lucide-react';
import { useBookingStore } from '../../store/bookingStore';
import { locationService } from '../../services/locationService';
import { useAuth } from '@shared/contexts/AuthContext';

// Fix Leaflet's default icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map center changes
const MapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 15, { animate: true, duration: 1 });
  }, [center, map]);
  return null;
};

// Component to handle drag events
const MapEvents = ({ onDragEnd }: { onDragEnd: (lat: number, lng: number) => void }) => {
  useMapEvents({
    dragend: (e: any) => {
      const center = e.target.getCenter();
      onDragEnd(center.lat, center.lng);
    }
  });
  return null;
};

// Mock nearby drivers
const nearbyDrivers = [
  { lat: 10.764, lng: 106.662 },
  { lat: 10.760, lng: 106.658 },
  { lat: 10.766, lng: 106.665 },
  { lat: 10.758, lng: 106.663 },
  { lat: 10.763, lng: 106.657 },
];

const HomeScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setPickup, resetBooking } = useBookingStore();
  const [mapCenter, setMapCenter] = useState<[number, number]>([10.762622, 106.660172]); // Default HCMC
  const [isLocating, setIsLocating] = useState(false);
  const [addressText, setAddressText] = useState('Đang tìm vị trí...');

  // Initialize
  useEffect(() => {
    resetBooking();
    handleGetLocation();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  const handleGetLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter([latitude, longitude]);
          updateAddress(latitude, longitude);
          setIsLocating(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          updateAddress(mapCenter[0], mapCenter[1]);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      updateAddress(mapCenter[0], mapCenter[1]);
      setIsLocating(false);
    }
  };

  const updateAddress = async (lat: number, lng: number) => {
    setAddressText('Đang cập nhật...');
    const result = await locationService.getAddressFromCoords(lat, lng);
    if (result) {
      setAddressText(result.name || result.address.split(',')[0]);
      setPickup(result);
    } else {
      setAddressText('Vị trí không xác định');
      setPickup({ lat, lng, address: 'Vị trí không xác định' });
    }
  };

  const handleDragEnd = (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    updateAddress(lat, lng);
  };

  const goToDestinationSearch = () => {
    navigate('/customer/destination');
  };

  const userName = user?.firstName || user?.name?.split(' ')[0] || 'bạn';

  return (
    <div className="h-screen w-full relative flex flex-col bg-slate-100 overflow-hidden page-with-nav">
      {/* ── Top Header ── */}
      <div className="absolute top-0 left-0 w-full px-4 pt-4 pb-2 z-[400] flex justify-between items-start pointer-events-none">
        {/* Menu / Profile Button */}
        <button 
          onClick={() => navigate('/customer/profile')}
          className="w-11 h-11 glass rounded-2xl shadow-lg flex items-center justify-center pointer-events-auto touch-bounce"
        >
          <Menu className="w-5 h-5 text-slate-700" />
        </button>

        {/* Status Badge */}
        <div className="glass px-4 py-2.5 rounded-2xl shadow-lg pointer-events-auto flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold text-slate-700 tracking-wide">CAB Booking</span>
        </div>
      </div>

      {/* ── Map Container ── */}
      <div className="flex-1 w-full relative z-[0]">
        <MapContainer 
          center={mapCenter} 
          zoom={15} 
          zoomControl={false}
          className="w-full h-full"
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          />
          <MapUpdater center={mapCenter} />
          <MapEvents onDragEnd={handleDragEnd} />
          
          {/* Nearby Driver Dots */}
          {nearbyDrivers.map((d, i) => (
            <CircleMarker 
              key={i} 
              center={[d.lat + (mapCenter[0] - 10.762622), d.lng + (mapCenter[1] - 106.660172)]} 
              radius={4}
              pathOptions={{ 
                fillColor: '#6366f1', 
                fillOpacity: 0.7, 
                color: '#4f46e5', 
                weight: 2 
              }}
            />
          ))}
        </MapContainer>
        
        {/* ── Fixed Center Pickup Pin ── */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[100%] z-[400] pointer-events-none">
          <div className="relative flex flex-col items-center animate-pin-bounce">
            {/* Pin */}
            <div className="w-12 h-12 gradient-primary rounded-full rounded-br-none -rotate-45 shadow-xl flex items-center justify-center animate-pulse-glow">
              <div className="w-5 h-5 bg-white rounded-full rotate-45"></div>
            </div>
          </div>
          {/* Pin Shadow */}
          <div className="pin-shadow mx-auto mt-1"></div>
        </div>

        {/* ── Current Location Button ── */}
        <button 
          onClick={handleGetLocation}
          className="absolute bottom-[260px] right-4 z-[400] w-12 h-12 glass rounded-2xl shadow-lg flex items-center justify-center touch-bounce"
        >
          <Navigation className={`w-5 h-5 text-indigo-600 ${isLocating ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Bottom Sheet ── */}
      <div className="absolute bottom-[72px] left-0 w-full z-[400] animate-slide-up">
        <div className="bg-white rounded-t-[28px] shadow-[0_-4px_30px_rgba(0,0,0,0.08)] px-5 pt-5 pb-4">
          {/* Handle */}
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4"></div>
          
          {/* Greeting */}
          <div className="mb-4">
            <h2 className="text-xl font-extrabold text-slate-900">
              {getGreeting()}, <span className="text-indigo-600">{userName}</span>! 👋
            </h2>
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-500" />
              <span className="truncate">{addressText}</span>
            </p>
          </div>
          
          {/* Search Bar Trigger */}
          <div 
            onClick={goToDestinationSearch}
            className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center gap-3 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all mb-4 touch-bounce group"
          >
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-lg group-hover:shadow-indigo-500/20 transition-shadow">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-slate-800 font-semibold text-sm">Bạn muốn đi đâu?</p>
              <p className="text-slate-400 text-xs mt-0.5">Tìm kiếm điểm đến...</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </div>

          {/* Saved Locations Shortcuts */}
          <div className="flex gap-3">
            <button className="flex-1 flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl hover:border-indigo-200 hover:bg-indigo-50/30 transition-all touch-bounce group">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                <HomeIcon className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">Nhà riêng</p>
                <p className="text-[11px] text-slate-400 truncate">Thêm địa chỉ</p>
              </div>
            </button>
            <button className="flex-1 flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:bg-emerald-50/30 transition-all touch-bounce group">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                <Briefcase className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">Văn phòng</p>
                <p className="text-[11px] text-slate-400 truncate">Thêm địa chỉ</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
