import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, CheckCircle2, XCircle, Car, Calendar } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import axiosClient from '../../api/axiosClient';

type FilterType = 'ALL' | 'COMPLETED' | 'CANCELLED';

const RideHistoryScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('ALL');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axiosClient.get(`/api/bookings/customer/${user?.id}`);
        
        if (res.data) {
          setHistory(res.data);
        }
      } catch (error) {
        console.error('Failed to fetch history', error);
        // Mock data for demonstration
        setHistory([
          {
            _id: '1',
            status: 'COMPLETED',
            vehicleType: 'standard',
            pickupLocation: { address: '268 Lý Thường Kiệt, Q.10, HCM' },
            dropoffLocation: { address: 'Sân bay Tân Sơn Nhất, Tân Bình, HCM' },
            estimatedFare: 125000,
            actualFare: 130000,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            _id: '2',
            status: 'COMPLETED',
            vehicleType: 'premium',
            pickupLocation: { address: 'Chợ Bến Thành, Q.1, HCM' },
            dropoffLocation: { address: 'Landmark 81, Bình Thạnh, HCM' },
            estimatedFare: 85000,
            actualFare: 85000,
            createdAt: new Date(Date.now() - 172800000).toISOString(),
          },
          {
            _id: '3',
            status: 'CANCELLED',
            vehicleType: 'economy',
            pickupLocation: { address: 'ĐH Bách Khoa, Q.10, HCM' },
            dropoffLocation: { address: 'Quận 7, HCM' },
            estimatedFare: 95000,
            createdAt: new Date(Date.now() - 259200000).toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) fetchHistory();
    else {
      setLoading(false);
    }
  }, [user]);

  const filteredHistory = filter === 'ALL' 
    ? history 
    : history.filter(r => r.status === filter);

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: 'ALL', label: 'Tất cả', count: history.length },
    { key: 'COMPLETED', label: 'Hoàn thành', count: history.filter(r => r.status === 'COMPLETED').length },
    { key: 'CANCELLED', label: 'Đã hủy', count: history.filter(r => r.status === 'CANCELLED').length },
  ];

  const getVehicleLabel = (type: string) => {
    const map: Record<string, string> = { economy: 'Economy', standard: 'Standard', premium: 'Premium', suv: 'SUV' };
    return `CAB ${map[type] || 'Standard'}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col page-with-nav">
      {/* ── Header ── */}
      <div className="bg-white px-5 pt-5 pb-4 shadow-sm z-10">
        <div className="flex items-center gap-3 mb-4">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors touch-bounce"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <h1 className="text-lg font-extrabold text-slate-900">Lịch sử chuyến đi</h1>
        </div>

        {/* ── Filter Tabs ── */}
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all touch-bounce ${
                filter === f.key 
                  ? 'gradient-primary text-white shadow-sm shadow-indigo-500/20' 
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {f.label}
              <span className={`ml-1.5 text-xs ${filter === f.key ? 'text-white/80' : 'text-slate-400'}`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── List ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="w-full h-[160px] animate-shimmer rounded-2xl" />
          ))
        ) : filteredHistory.length > 0 ? (
          filteredHistory.map((ride: any, index: number) => (
            <div 
              key={ride.id || ride._id} 
              className="card-premium p-4 animate-fade-in"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              {/* Top row: Date + Status */}
              <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-600 font-medium">
                    {new Date(ride.createdAt || Date.now()).toLocaleDateString('vi-VN', { 
                      day: '2-digit', month: '2-digit', year: 'numeric', 
                      hour: '2-digit', minute: '2-digit' 
                    })}
                  </span>
                </div>
                {ride.status === 'COMPLETED' ? (
                  <span className="status-pill bg-emerald-50 text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" /> Hoàn thành
                  </span>
                ) : ride.status === 'CANCELLED' ? (
                  <span className="status-pill bg-rose-50 text-rose-600">
                    <XCircle className="w-3 h-3" /> Đã hủy
                  </span>
                ) : (
                  <span className="status-pill bg-amber-50 text-amber-700">{ride.status}</span>
                )}
              </div>
              
              {/* Route */}
              <div className="space-y-2.5 relative mb-4">
                <div className="absolute left-[7px] top-[10px] bottom-[10px] w-[2px] bg-gradient-to-b from-indigo-300 to-emerald-300"></div>
                <div className="flex gap-3 relative z-10">
                  <div className="w-4 h-4 rounded-full bg-indigo-500 border-2 border-white shadow-sm flex-shrink-0 mt-0.5"></div>
                  <p className="text-sm text-slate-700 font-medium truncate">{ride.pickupLocation?.address || 'Điểm đón'}</p>
                </div>
                <div className="flex gap-3 relative z-10">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm flex-shrink-0 mt-0.5"></div>
                  <p className="text-sm text-slate-700 font-medium truncate">{ride.dropoffLocation?.address || 'Điểm đến'}</p>
                </div>
              </div>

              {/* Bottom row: Vehicle + Price */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Car className="w-4 h-4" />
                  <span className="font-medium">{getVehicleLabel(ride.vehicleType)}</span>
                </div>
                <div className="font-extrabold text-slate-900">
                  {(ride.actualFare || ride.estimatedFare || 0).toLocaleString('vi-VN')}₫
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-600 font-bold">Chưa có chuyến đi nào</p>
            <p className="text-slate-400 text-sm mt-1">Đặt chuyến đầu tiên của bạn ngay!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RideHistoryScreen;
