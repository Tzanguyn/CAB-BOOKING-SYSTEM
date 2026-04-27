import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Car, 
  MapPin, 
  ArrowUpRight, 
  ArrowDownRight,
  MoreVertical
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

// Mock data
const revenueData = [
  { name: 'T2', total: 4000 },
  { name: 'T3', total: 3000 },
  { name: 'T4', total: 2000 },
  { name: 'T5', total: 2780 },
  { name: 'T6', total: 1890 },
  { name: 'T7', total: 2390 },
  { name: 'CN', total: 3490 },
];

const recentTrips = [
  { id: 'TRIP-001', driver: 'Nguyễn Văn A', customer: 'Lê Thị B', amount: 150000, status: 'completed', time: '10 phút trước' },
  { id: 'TRIP-002', driver: 'Trần Văn C', customer: 'Hoàng Văn D', amount: 85000, status: 'in_progress', time: '15 phút trước' },
  { id: 'TRIP-003', driver: 'Phạm Thị E', customer: 'Ngô Văn F', amount: 210000, status: 'completed', time: '1 giờ trước' },
  { id: 'TRIP-004', driver: 'Vũ Văn G', customer: 'Đinh Thị H', amount: 45000, status: 'cancelled', time: '2 giờ trước' },
];

const StatCard = ({ title, value, change, isPositive, icon: Icon, colorClass }: any) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between h-40">
    <div className="flex justify-between items-start">
      <div className={`p-3 rounded-xl ${colorClass}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
        {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
        {change}%
      </div>
    </div>
    <div>
      <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{value}</h3>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
    </div>
  </div>
);

const DashboardScreen = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-slate-200 animate-pulse rounded-2xl" />)}
        </div>
        <div className="h-[400px] bg-slate-200 animate-pulse rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard 
          title="Tổng doanh thu" 
          value="45.2M ₫" 
          change="12.5" 
          isPositive={true} 
          icon={TrendingUp} 
          colorClass="bg-indigo-50 text-indigo-600"
        />
        <StatCard 
          title="Chuyến hoàn thành" 
          value="1,245" 
          change="8.2" 
          isPositive={true} 
          icon={MapPin} 
          colorClass="bg-emerald-50 text-emerald-600"
        />
        <StatCard 
          title="Khách hàng mới" 
          value="382" 
          change="3.1" 
          isPositive={true} 
          icon={Users} 
          colorClass="bg-blue-50 text-blue-600"
        />
        <StatCard 
          title="Tài xế Online" 
          value="142" 
          change="1.4" 
          isPositive={false} 
          icon={Car} 
          colorClass="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Biểu đồ doanh thu</h2>
              <p className="text-sm text-slate-500">7 ngày gần nhất</p>
            </div>
            <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 outline-none">
              <option>Tuần này</option>
              <option>Tháng này</option>
              <option>Năm nay</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dx={-10} tickFormatter={(value) => `${value}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`${value}k ₫`, 'Doanh thu']}
                />
                <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Trips */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800">Chuyến đi gần đây</h2>
            <button className="text-indigo-600 text-sm font-medium hover:text-indigo-700">Xem tất cả</button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {recentTrips.map((trip) => (
              <div key={trip.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Car className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{trip.driver}</p>
                    <p className="text-xs text-slate-500">{trip.customer} • {trip.time}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{trip.amount.toLocaleString('vi-VN')}đ</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      trip.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      trip.status === 'in_progress' ? 'bg-indigo-100 text-indigo-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {trip.status === 'completed' ? 'Hoàn thành' : trip.status === 'in_progress' ? 'Đang chạy' : 'Đã hủy'}
                    </span>
                  </div>
                  <button className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-slate-600">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
