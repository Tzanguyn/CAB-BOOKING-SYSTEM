import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Search, Navigation, Menu, Home as HomeIcon, Briefcase } from 'lucide-react';
import { useBookingStore } from '../../store/bookingStore';
import { locationService } from '../../services/locationService';
import { BottomSheet } from '@shared/components';

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

const HomeScreen = () => {
  const navigate = useNavigate();
  const { setPickup, resetBooking } = useBookingStore();
  const [mapCenter, setMapCenter] = useState<[number, number]>([10.762622, 106.660172]); // Default HCMC
  const [isLocating, setIsLocating] = useState(false);
  const [addressText, setAddressText] = useState('Đang tìm vị trí...');
  const [isSheetOpen] = useState(true);

  // Initialize
  useEffect(() => {
    resetBooking(); // Reset any previous unfinished booking
    handleGetLocation();
  }, []);

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
          // Fallback to default
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
    setAddressText('Đang cập nhật địa chỉ...');
    const result = await locationService.getAddressFromCoords(lat, lng);
    if (result) {
      setAddressText(result.name || result.address);
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

  return (
    <div className="h-screen w-full relative flex flex-col bg-slate-100 overflow-hidden">
      {/* Top Header/Nav */}
      <div className="absolute top-0 left-0 w-full p-4 z-[400] flex justify-between items-start pointer-events-none">
        <button 
          onClick={() => navigate('/customer/profile')}
          className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center pointer-events-auto active:scale-95 transition-transform"
        >
          <Menu className="w-6 h-6 text-slate-700" />
        </button>
        <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg pointer-events-auto flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-sm font-semibold text-slate-700">CAB Standard</span>
        </div>
      </div>

      {/* Map Container */}
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
          
          {/* We don't use a draggable marker, we keep the map center as the pickup point */}
        </MapContainer>
        
        {/* Fixed Center Marker Overlay (Simulates picking a location by moving the map) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[100%] z-[400] pointer-events-none">
          <div className="relative flex flex-col items-center">
            {/* Address Bubble */}
            <div className="bg-slate-900 text-white text-xs font-medium px-3 py-1.5 rounded-full mb-2 shadow-lg whitespace-nowrap max-w-[200px] truncate">
              {addressText}
            </div>
            {/* Marker Pin */}
            <div className="w-10 h-10 bg-indigo-600 rounded-full rounded-br-none -rotate-45 shadow-xl flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Current Location Button */}
        <button 
          onClick={handleGetLocation}
          className="absolute bottom-32 right-4 z-[400] w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          <Navigation className={`w-5 h-5 text-slate-700 ${isLocating ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Bottom Sheet for Action */}
      <BottomSheet 
        isOpen={isSheetOpen} 
        onClose={() => {}} // Can't close
        title=""
      >
        <div className="px-5 pb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Bạn muốn đi đâu?</h2>
          
          {/* Search Bar Trigger */}
          <div 
            onClick={goToDestinationSearch}
            className="w-full bg-slate-100 p-4 rounded-2xl flex items-center gap-3 cursor-text hover:bg-slate-200 transition-colors mb-6"
          >
            <Search className="w-5 h-5 text-slate-500" />
            <span className="text-slate-500 text-base flex-1">Tìm kiếm điểm đến...</span>
          </div>

          {/* Shortcuts */}
          <div className="flex gap-4 mb-2">
            <button className="flex-1 flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/50 transition-all">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mb-2">
                <HomeIcon className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="text-sm font-medium text-slate-700">Nhà riêng</span>
            </button>
            <button className="flex-1 flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/50 transition-all">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
                <Briefcase className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-sm font-medium text-slate-700">Văn phòng</span>
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};

export default HomeScreen;
