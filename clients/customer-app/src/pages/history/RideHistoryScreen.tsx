import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import axios from 'axios';

const RideHistoryScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const GATEWAY_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const token = localStorage.getItem('accessToken');
        const res = await axios.get(`${GATEWAY_URL}/api/bookings/customer/${user?.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data?.data) {
          setHistory(res.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch history', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) fetchHistory();
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-white px-4 pt-6 pb-4 shadow-sm z-10 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <h1 className="text-xl font-bold text-slate-800">Lịch sử chuyến đi</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="w-full h-32 bg-slate-200 animate-pulse rounded-2xl" />)
        ) : history.length > 0 ? (
          history.map((ride: any) => (
            <div key={ride.id || ride._id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-600">{new Date(ride.createdAt || Date.now()).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' })}</span>
                </div>
                {ride.status === 'COMPLETED' ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><CheckCircle2 className="w-3 h-3" /> Hoàn thành</span>
                ) : ride.status === 'CANCELLED' ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full"><XCircle className="w-3 h-3" /> Đã hủy</span>
                ) : (
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">{ride.status}</span>
                )}
              </div>
              
              <div className="space-y-3 relative">
                <div className="absolute left-[7px] top-4 bottom-4 w-0.5 bg-slate-200"></div>
                <div className="flex gap-3 relative z-10">
                  <div className="w-4 h-4 rounded-full bg-indigo-500 border-2 border-white shadow-sm flex-shrink-0 mt-0.5"></div>
                  <p className="text-sm text-slate-700 font-medium truncate">{ride.pickupLocation?.address || 'Điểm đón'}</p>
                </div>
                <div className="flex gap-3 relative z-10">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm flex-shrink-0 mt-0.5"></div>
                  <p className="text-sm text-slate-700 font-medium truncate">{ride.dropoffLocation?.address || 'Điểm đến'}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                <div className="text-sm text-slate-500">
                  CAB {ride.vehicleType === 'premium' ? 'Premium' : ride.vehicleType === 'suv' ? 'SUV' : 'Standard'}
                </div>
                <div className="font-bold text-slate-800">
                  {ride.actualFare ? ride.actualFare.toLocaleString('vi-VN') : (ride.estimatedFare || 0).toLocaleString('vi-VN')}đ
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">Bạn chưa có chuyến đi nào</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RideHistoryScreen;
