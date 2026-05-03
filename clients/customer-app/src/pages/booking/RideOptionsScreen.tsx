import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, Clock, Users, Info } from 'lucide-react';
import { useBookingStore } from '../../store/bookingStore';
import { useAuth } from '@shared/contexts/AuthContext';
import { locationService } from '../../services/locationService';
import { bookingApiService } from '../../services/bookingService';
import { routeService } from '../../services/routeService';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import showToast from '@shared/components/Toast';
import VehicleIcon from '../../components/common/VehicleIcon';

interface VehicleOption {
  id: string;
  name: string;
  description: string;
  type: 'economy' | 'standard' | 'premium' | 'suv';
  price: number;
  surge: number;
  eta: number;
  capacity: number;
}

const createDotIcon = (color: string, size: number = 14) => L.divIcon({
  html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.2)"></div>`,
  className: 'custom-dot-icon',
  iconSize: [size, size],
  iconAnchor: [size/2, size/2]
});

const RideOptionsScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pickup, dropoff, setRideOptions } = useBookingStore();
  
  const [options, setOptions] = useState<VehicleOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>('standard');
  const [isLoading, setIsLoading] = useState(true);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  
  const distance = pickup && dropoff 
    ? locationService.calculateDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng) 
    : 0;

  useEffect(() => {
    if (!pickup || !dropoff) {
      navigate('/customer/home');
      return;
    }
    
    fetchOptions();
    
    // Fetch route path for map
    routeService.getRoutePath(
      { lat: pickup.lat, lng: pickup.lng },
      { lat: dropoff.lat, lng: dropoff.lng }
    ).then(path => setRoutePath(path));
  }, [pickup, dropoff]);

  const fetchOptions = async () => {
    setIsLoading(true);
    
    const vehicleTypes: { id: string; name: string; description: string; type: 'economy' | 'standard' | 'premium' | 'suv'; capacity: number }[] = [
      { id: 'economy', name: 'CAB Economy', description: 'Tiết kiệm nhất', type: 'economy', capacity: 4 },
      { id: 'standard', name: 'CAB Standard', description: 'Phổ biến', type: 'standard', capacity: 4 },
      { id: 'premium', name: 'CAB Premium', description: 'Sang trọng', type: 'premium', capacity: 4 },
      { id: 'suv', name: 'CAB SUV', description: 'Rộng rãi, 7 chỗ', type: 'suv', capacity: 7 }
    ];

    try {
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

    // Save options to store and navigate to payment
    setRideOptions(selected.id, selected.price, selected.surge, distance);
    navigate('/customer/payment');
  };

  if (!pickup || !dropoff) return null;

  const selectedVehicle = options.find(o => o.id === selectedOption);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* ── Map Header ── */}
      <div className="h-[32vh] relative z-0">
        <MapContainer 
          bounds={[[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]]} 
          zoomControl={false}
          dragging={false}
          scrollWheelZoom={false}
          className="w-full h-full"
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          <Marker position={[pickup.lat, pickup.lng]} icon={createDotIcon('#6366f1', 16)} />
          <Marker position={[dropoff.lat, dropoff.lng]} icon={createDotIcon('#10b981', 16)} />
          <Polyline 
            positions={routePath.length > 0 ? routePath : [[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]]} 
            pathOptions={{ color: '#6366f1', weight: 4, opacity: 0.8 }} 
          />
        </MapContainer>

        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-[400] w-10 h-10 glass rounded-xl shadow-md flex items-center justify-center touch-bounce"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>

        {/* Distance Badge */}
        <div className="absolute top-4 right-4 z-[400] glass px-3 py-2 rounded-xl shadow-md">
          <span className="text-xs font-bold text-slate-700">{distance.toFixed(1)} km</span>
        </div>
      </div>

      {/* ── Options Sheet ── */}
      <div className="flex-1 bg-white rounded-t-[28px] -mt-6 z-10 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] flex flex-col relative">
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-3" />
        
        {/* Route Summary */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
              <div className="w-[2px] h-4 bg-slate-200"></div>
              <div className="w-2.5 h-2.5 bg-emerald-500" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 truncate">{pickup.name || pickup.address.split(',')[0]}</p>
              <div className="h-[1px] bg-slate-100 my-1.5"></div>
              <p className="text-xs font-semibold text-slate-800 truncate">{dropoff.name || dropoff.address.split(',')[0]}</p>
            </div>
          </div>
        </div>

        {/* Vehicle Options */}
        <div className="flex-1 overflow-y-auto px-5 pb-[180px] hide-scrollbar">
          <h2 className="text-base font-extrabold text-slate-900 mb-3">Chọn loại xe</h2>
          
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-full h-[80px] animate-shimmer rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {options.map((opt) => (
                <div 
                  key={opt.id}
                  onClick={() => setSelectedOption(opt.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all cursor-pointer touch-bounce ${
                    selectedOption === opt.id 
                      ? 'border-indigo-500 bg-indigo-50/40 shadow-sm shadow-indigo-500/10' 
                      : 'border-transparent bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex-shrink-0">
                    <VehicleIcon type={opt.type} size={52} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">{opt.name}</h3>
                      {opt.surge > 1 && (
                        <span className="flex items-center text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md">
                          <Zap className="w-3 h-3 mr-0.5" />
                          x{opt.surge.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-[11px] text-slate-500 gap-2 mt-1">
                      <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{opt.eta} phút</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{opt.capacity} chỗ</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-extrabold text-base text-slate-900">
                      {opt.price.toLocaleString('vi-VN')}₫
                    </p>
                    {opt.surge > 1 && (
                      <p className="text-[11px] text-slate-400 line-through">
                        {Math.round(opt.price / opt.surge).toLocaleString('vi-VN')}₫
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Bottom Booking Action ── */}
        <div className="absolute bottom-0 left-0 w-full bg-white border-t border-slate-100 p-4 pb-6 px-5 z-20">
          {/* Payment Method removed from here because we will select it in the Payment screen */}

          {/* Price Breakdown Link */}
          {selectedVehicle && (
            <button 
              onClick={() => setShowPriceBreakdown(!showPriceBreakdown)}
              className="w-full flex items-center justify-center gap-1.5 mb-3 text-xs text-indigo-600 font-medium"
            >
              <Info className="w-3.5 h-3.5" />
              Xem chi tiết giá
            </button>
          )}

          {/* Book Button */}
          <button
            onClick={handleBook}
            disabled={isLoading}
            className="w-full py-4 gradient-primary hover:opacity-90 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
              `Tiếp tục thanh toán`
          </button>
        </div>
      </div>

      {/* ── Price Breakdown Modal ── */}
      {showPriceBreakdown && selectedVehicle && (
        <div className="fixed inset-0 z-[500] bg-slate-900/50 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowPriceBreakdown(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
            <h3 className="text-lg font-extrabold text-slate-900 mb-4">Chi tiết giá cước</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Cước cơ bản</span>
                <span className="font-semibold text-slate-800">15,000₫</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Phí quãng đường ({distance.toFixed(1)} km)</span>
                <span className="font-semibold text-slate-800">{Math.round((selectedVehicle.price - 15000) / (selectedVehicle.surge || 1)).toLocaleString('vi-VN')}₫</span>
              </div>
              {selectedVehicle.surge > 1 && (
                <div className="flex justify-between text-sm">
                  <span className="text-amber-600 flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Phí cao điểm (x{selectedVehicle.surge.toFixed(1)})</span>
                  <span className="font-semibold text-amber-600">+{Math.round(selectedVehicle.price - selectedVehicle.price / selectedVehicle.surge).toLocaleString('vi-VN')}₫</span>
                </div>
              )}
              <div className="border-t border-dashed border-slate-200 pt-3 flex justify-between">
                <span className="font-bold text-slate-900">Tổng cộng</span>
                <span className="font-extrabold text-lg text-slate-900">{selectedVehicle.price.toLocaleString('vi-VN')}₫</span>
              </div>
            </div>

            <button 
              onClick={() => setShowPriceBreakdown(false)}
              className="w-full mt-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors touch-bounce"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RideOptionsScreen;
