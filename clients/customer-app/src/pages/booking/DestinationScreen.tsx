import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Search, Clock, Navigation, TrendingUp } from 'lucide-react';
import { useBookingStore } from '../../store/bookingStore';
import { locationService } from '../../services/locationService';
import type { LocationResult } from '../../services/locationService';

const DestinationScreen = () => {
  const navigate = useNavigate();
  const { pickup, setDropoff } = useBookingStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus search input
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = window.setTimeout(async () => {
      const searchResults = await locationService.searchAddress(query);
      setResults(searchResults);
      setIsSearching(false);
    }, 800);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query]);

  const handleSelectLocation = (loc: LocationResult) => {
    setDropoff(loc);
    navigate('/customer/options');
  };

  const popularDestinations = [
    { name: 'Sân bay Tân Sơn Nhất', address: 'Đường Trường Sơn, Phường 2, Tân Bình, HCM', lat: 10.816667, lng: 106.666667, icon: '✈️' },
    { name: 'Chợ Bến Thành', address: 'Đường Lê Lợi, Phường Bến Thành, Quận 1, HCM', lat: 10.7725, lng: 106.6981, icon: '🏪' },
    { name: 'Bến xe Miền Đông', address: '292 Đinh Bộ Lĩnh, Phường 26, Bình Thạnh, HCM', lat: 10.8115, lng: 106.7118, icon: '🚌' },
  ];

  const recentDestinations = [
    { name: 'Landmark 81', address: 'Vinhomes Central Park, Bình Thạnh, HCM', lat: 10.7952, lng: 106.7219 },
    { name: 'Đại học Bách Khoa', address: '268 Lý Thường Kiệt, Quận 10, HCM', lat: 10.7731, lng: 106.6590 },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ── Header ── */}
      <div className="bg-white px-4 pt-5 pb-4 z-10 animate-slide-down">
        <div className="flex items-center gap-3 mb-5">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors touch-bounce"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <h1 className="text-lg font-extrabold text-slate-900">Chọn điểm đến</h1>
        </div>

        {/* ── Route Inputs ── */}
        <div className="relative pl-10">
          {/* Timeline decoration */}
          <div className="absolute left-[14px] top-[18px] bottom-[18px] flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/40 flex-shrink-0"></div>
            <div className="flex-1 w-[2px] bg-gradient-to-b from-indigo-300 via-slate-200 to-emerald-300 my-1.5"></div>
            <div className="w-3 h-3 bg-emerald-500 shadow-sm shadow-emerald-500/40 flex-shrink-0" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}></div>
          </div>

          <div className="space-y-3">
            {/* Pickup (Readonly) */}
            <div className="w-full bg-slate-50 px-4 py-3.5 rounded-xl flex items-center">
              <span className="text-slate-600 text-sm truncate flex-1 font-medium">
                {pickup?.name || pickup?.address || 'Vị trí hiện tại'}
              </span>
            </div>

            {/* Dropoff (Active Search) */}
            <div className="w-full bg-white border-2 border-indigo-500 px-4 py-3.5 rounded-xl flex items-center gap-3 shadow-lg shadow-indigo-500/10">
              <input 
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nhập điểm đến..."
                className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none font-medium"
              />
              {isSearching ? (
                <div className="w-5 h-5 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin flex-shrink-0" />
              ) : (
                <Search className="w-5 h-5 text-indigo-500 flex-shrink-0" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="h-2 bg-slate-50"></div>

      {/* ── Results / Suggestions ── */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {query.trim().length >= 3 ? (
          <div className="py-2 animate-fade-in">
            <div className="px-5 py-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                Kết quả tìm kiếm
              </span>
            </div>
            {results.length > 0 ? (
              results.map((loc, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectLocation(loc)}
                  className="w-full flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left touch-bounce border-b border-slate-50"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900 font-semibold text-sm truncate">{loc.name || loc.address.split(',')[0]}</p>
                    <p className="text-slate-400 text-xs truncate mt-1">{loc.address}</p>
                  </div>
                </button>
              ))
            ) : (
              !isSearching && (
                <div className="px-5 py-12 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Search className="w-7 h-7 text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-medium text-sm">Không tìm thấy kết quả</p>
                  <p className="text-slate-400 text-xs mt-1">Thử nhập từ khóa khác</p>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="py-2">
            {/* Choose on Map */}
            <button 
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-indigo-50/50 transition-colors border-b border-slate-50 touch-bounce"
            >
              <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-sm shadow-indigo-500/20">
                <Navigation className="w-5 h-5 text-white" />
              </div>
              <p className="text-indigo-600 font-bold text-sm">Chọn trên bản đồ</p>
            </button>

            {/* Popular */}
            <div className="px-5 pt-5 pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Phổ biến</span>
              </div>
            </div>
            {popularDestinations.map((loc, index) => (
              <button
                key={`pop-${index}`}
                onClick={() => handleSelectLocation({ ...loc })}
                className="w-full flex items-start gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left touch-bounce border-b border-slate-50"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 text-xl">
                  {loc.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 font-semibold text-sm truncate">{loc.name}</p>
                  <p className="text-slate-400 text-xs truncate mt-0.5">{loc.address}</p>
                </div>
              </button>
            ))}

            {/* Recent */}
            <div className="px-5 pt-5 pb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Gần đây</span>
              </div>
            </div>
            {recentDestinations.map((loc, index) => (
              <button
                key={`rec-${index}`}
                onClick={() => handleSelectLocation({ ...loc })}
                className="w-full flex items-start gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left touch-bounce border-b border-slate-50"
              >
                <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 font-semibold text-sm truncate">{loc.name}</p>
                  <p className="text-slate-400 text-xs truncate mt-0.5">{loc.address}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DestinationScreen;
