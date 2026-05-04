import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, TrendingUp, Calendar, MapPin, LogOut } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import { driverApiService } from '../../services/driverService';

const EarningsScreen = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [period, setPeriod] = useState<'day' | 'week'>('day');
  const [data, setData] = useState<any>({ total: 0, rides: 0, history: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const res = await driverApiService.getEarnings(period);
      setData(res);
      setLoading(false);
    };
    fetchData();
  }, [period]);

  const handleLogout = () => {
    logout();
    navigate('/driver/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header Profile & Earnings Summary */}
      <div className="bg-slate-900 px-4 pt-6 pb-20 rounded-b-[40px] z-0">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-white font-medium">{user?.firstName || user?.name || 'Tài xế'}</span>
            <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold border-2 border-slate-800">
              {user?.firstName?.charAt(0) || user?.name?.charAt(0) || 'D'}
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-slate-400 text-sm mb-1 flex items-center justify-center gap-1">
            <Wallet className="w-4 h-4" />
            Tổng thu nhập {period === 'day' ? 'hôm nay' : 'tuần này'}
          </p>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            {loading ? '...' : data.total.toLocaleString('vi-VN')}đ
          </h1>
        </div>
      </div>

      <div className="flex-1 px-4 -mt-10 z-10 flex flex-col">
        {/* Stats Row */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Số chuyến</p>
              <p className="font-bold text-slate-800 text-lg">{loading ? '-' : data.rides}</p>
            </div>
          </div>
          <div className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Thời gian</p>
              <p className="font-bold text-slate-800 text-lg">{loading ? '-' : (period === 'day' ? '4.5h' : '32h')}</p>
            </div>
          </div>
        </div>

        {/* Period Tabs */}
        <div className="bg-slate-200/50 p-1 rounded-xl flex mb-6">
          <button 
            onClick={() => setPeriod('day')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${period === 'day' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
          >
            Hôm nay
          </button>
          <button 
            onClick={() => setPeriod('week')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${period === 'week' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
          >
            Tuần này
          </button>
        </div>

        {/* History List Link */}
        <div className="flex-1 mb-6">
          <button 
            onClick={() => navigate('/driver/history')}
            className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-4 rounded-xl flex items-center justify-between px-6 transition-colors active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5" />
              <span>Xem lịch sử chuyến đi</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </div>
          </button>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full bg-white text-red-500 font-bold py-4 rounded-xl shadow-sm border border-red-100 flex justify-center items-center gap-2 hover:bg-red-50 transition-colors active:scale-95 mb-6"
        >
          <LogOut className="w-5 h-5" />
          Đăng xuất
        </button>
      </div>
    </div>
  );
};

export default EarningsScreen;
