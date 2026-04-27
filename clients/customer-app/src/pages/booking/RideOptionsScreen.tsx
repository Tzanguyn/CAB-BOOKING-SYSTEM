import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, ChevronRight, Zap } from 'lucide-react';
import { useBookingStore } from '../../store/bookingStore';
import { useAuth } from '@shared/contexts/AuthContext';
import { locationService } from '../../services/locationService';
import { bookingApiService } from '../../services/bookingService';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import showToast from '@shared/components/Toast';

interface VehicleOption {
  id: string;
  name: string;
  description: string;
  image: string;
  price: number;
  surge: number;
  eta: number;
  capacity: number;
}

// Custom markers for static map view
const createDotIcon = (color: string) => L.divIcon({
  html: `<div class="w-4 h-4 rounded-full border-2 border-white shadow-md ${color}"></div>`,
  className: 'custom-dot-icon',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const RideOptionsScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pickup, dropoff, setRideOptions, setActiveRide, setStatus } = useBookingStore();
  
  const [options, setOptions] = useState<VehicleOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>('standard');
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  
  const distance = pickup && dropoff 
    ? locationService.calculateDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng) 
    : 0;

  useEffect(() => {
    if (!pickup || !dropoff) {
      navigate('/customer/home');
      return;
    }
    
    fetchOptions();
  }, [pickup, dropoff]);

  const fetchOptions = async () => {
    setIsLoading(true);
    
    const vehicleTypes = [
      { id: 'economy', name: 'CAB Economy', description: 'Tiết kiệm, 4 chỗ', capacity: 4, image: '🚗' },
      { id: 'standard', name: 'CAB Standard', description: 'Tiện lợi, 4 chỗ', capacity: 4, image: '🚕' },
      { id: 'premium', name: 'CAB Premium', description: 'Sang trọng, 4 chỗ', capacity: 4, image: '🚙' },
      { id: 'suv', name: 'CAB SUV', description: 'Rộng rãi, 7 chỗ', capacity: 7, image: '🚐' }
    ];

    try {
      // Parallel requests for all vehicle types
      const promises = vehicleTypes.map(async (v) => {
        const priceRes = await bookingApiService.getEstimate(distance, v.id);
        const etaRes = await bookingApiService.getEta(distance);
        
        return {
          ...v,
          price: priceRes.estimatedFare,
          surge: priceRes.surge || 1,
          eta: etaRes.eta_minutes || Math.max(1, Math.round(distance * 3))
        };
      });

      const results = await Promise.all(promises);
      setOptions(results);
    } catch (error) {
      console.error('Failed to fetch options', error);
      showToast.error('Không thể tính giá cước');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBook = async () => {
    if (!pickup || !dropoff || !user) return;
    
    const selected = options.find(o => o.id === selectedOption);
    if (!selected) return;

    setIsBooking(true);
    try {
      const payload = {
        customerId: user.id,
        pickupLocation: { lat: pickup.lat, lng: pickup.lng, address: pickup.address },
        dropoffLocation: { lat: dropoff.lat, lng: dropoff.lng, address: dropoff.address },
        vehicleType: selected.id,
        distance_km: distance,
        paymentMethod: 'CASH', // Hardcoded for now
        autoAssign: true,
        searchRadiusKm: 5
      };

      const res = await bookingApiService.createBooking(payload);
      
      if (res.success) {
        setRideOptions(selected.id, selected.price, selected.surge, distance);
        setActiveRide(res.data._id || res.data.id || 'MOCK_ID', null, null);
        setStatus('SEARCHING');
        navigate('/customer/matching');
      } else {
        throw new Error(res.message);
      }
    } catch (error: any) {
      showToast.error(error.message || 'Lỗi đặt xe');
    } finally {
      setIsBooking(false);
    }
  };

  if (!pickup || !dropoff) return null;

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Map Header */}
      <div className="h-[35vh] relative z-0">
        <MapContainer 
          bounds={[[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]]} 
          zoomControl={false}
          dragging={false}
          scrollWheelZoom={false}
          className="w-full h-full"
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          <Marker position={[pickup.lat, pickup.lng]} icon={createDotIcon('bg-indigo-500')} />
          <Marker position={[dropoff.lat, dropoff.lng]} icon={createDotIcon('bg-emerald-500')} />
          <Polyline positions={[[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]]} color="#6366f1" weight={3} dashArray="5, 10" />
        </MapContainer>

        {/* Back Button Overlay */}
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-[400] w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
      </div>

      {/* Options Sheet */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-6 z-10 shadow-[0_-8px_30px_rgba(0,0,0,0.05)] flex flex-col relative">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3" />
        
        <div className="px-5 pb-2">
          <h2 className="text-xl font-bold text-slate-800">Chọn chuyến đi</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-24">
          {isLoading ? (
            <div className="space-y-4 mt-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-full h-20 bg-slate-100 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-3 mt-2">
              {options.map((opt) => (
                <div 
                  key={opt.id}
                  onClick={() => setSelectedOption(opt.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    selectedOption === opt.id 
                      ? 'border-indigo-500 bg-indigo-50/30 shadow-sm' 
                      : 'border-transparent bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-4xl">{opt.image}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-base">{opt.name}</h3>
                      {opt.surge > 1 && (
                        <span className="flex items-center text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                          <Zap className="w-3 h-3 mr-0.5" />
                          x{opt.surge}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-slate-500 gap-2 mt-0.5">
                      <span>{opt.eta} phút</span>
                      <span>•</span>
                      <span>{opt.capacity} chỗ</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-slate-800">
                      {opt.price.toLocaleString('vi-VN')}đ
                    </p>
                    {opt.surge > 1 && (
                      <p className="text-xs text-slate-400 line-through">
                        {Math.round(opt.price / opt.surge).toLocaleString('vi-VN')}đ
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Booking Action */}
        <div className="absolute bottom-0 left-0 w-full bg-white border-t border-slate-100 p-4 pb-6 px-5 z-20">
          <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">Tiền mặt</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>

          <button
            onClick={handleBook}
            disabled={isBooking || isLoading}
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {isBooking ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              `Đặt ${options.find(o => o.id === selectedOption)?.name || 'xe'}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RideOptionsScreen;
