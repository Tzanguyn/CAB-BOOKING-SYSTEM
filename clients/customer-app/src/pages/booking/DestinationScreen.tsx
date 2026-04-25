import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Search, Clock, Navigation } from 'lucide-react';
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

  // Use a debounced search
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white px-4 pt-6 pb-4 shadow-sm z-10">
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <h1 className="text-xl font-bold text-slate-800">Điểm đến</h1>
        </div>

        {/* Search Inputs */}
        <div className="relative pl-8">
          {/* Timeline decoration */}
          <div className="absolute left-3 top-3 bottom-3 flex flex-col items-center">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            <div className="flex-1 w-0.5 bg-slate-200 my-1"></div>
            <div className="w-2 h-2 rounded-none bg-emerald-500"></div>
          </div>

          <div className="space-y-3">
            {/* Pickup (Readonly) */}
            <div className="w-full bg-slate-100 px-4 py-3 rounded-xl flex items-center gap-3">
              <span className="text-slate-700 text-sm truncate flex-1 font-medium">
                {pickup?.name || pickup?.address || 'Vị trí hiện tại'}
              </span>
            </div>

            {/* Dropoff (Active) */}
            <div className="w-full bg-white border-2 border-indigo-500 px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm shadow-indigo-100">
              <input 
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm kiếm điểm đến..."
                className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
              {isSearching ? (
                <div className="w-4 h-4 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4 text-indigo-500" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results / History */}
      <div className="flex-1 overflow-y-auto">
        {query.trim().length >= 3 ? (
          <div className="p-2">
            <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Kết quả tìm kiếm
            </div>
            {results.length > 0 ? (
              results.map((loc, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectLocation(loc)}
                  className="w-full flex items-start gap-4 p-4 hover:bg-slate-100 transition-colors border-b border-slate-100 text-left active:bg-slate-200"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 font-medium truncate">{loc.name || loc.address.split(',')[0]}</p>
                    <p className="text-slate-500 text-sm truncate mt-0.5">{loc.address}</p>
                  </div>
                </button>
              ))
            ) : (
              !isSearching && (
                <div className="p-8 text-center text-slate-500">
                  Không tìm thấy kết quả nào cho "{query}"
                </div>
              )
            )}
          </div>
        ) : (
          <div className="p-2">
            <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Gợi ý & Lịch sử
            </div>
            
            <button className="w-full flex items-center gap-4 p-4 hover:bg-slate-100 transition-colors border-b border-slate-100">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <Navigation className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-indigo-600 font-medium">Chọn trên bản đồ</p>
              </div>
            </button>

            {/* Mock History Items */}
            {[
              { name: 'Sân bay Tân Sơn Nhất', address: 'Đường Trường Sơn, Phường 2, Tân Bình, Hồ Chí Minh', lat: 10.816667, lng: 106.666667 },
              { name: 'Chợ Bến Thành', address: 'Đường Lê Lợi, Phường Bến Thành, Quận 1, Hồ Chí Minh', lat: 10.7725, lng: 106.6981 },
              { name: 'Bến xe Miền Đông', address: '292 Đinh Bộ Lĩnh, Phường 26, Bình Thạnh, Hồ Chí Minh', lat: 10.8115, lng: 106.7118 },
            ].map((loc, index) => (
              <button
                key={index}
                onClick={() => handleSelectLocation({ ...loc })}
                className="w-full flex items-start gap-4 p-4 hover:bg-slate-100 transition-colors border-b border-slate-100 text-left"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 font-medium truncate">{loc.name}</p>
                  <p className="text-slate-500 text-sm truncate mt-0.5">{loc.address}</p>
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
