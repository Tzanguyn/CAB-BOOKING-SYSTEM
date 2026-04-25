import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, LogOut, Shield, MapPin, CreditCard, ChevronRight } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';

const ProfileScreen = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/customer/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-indigo-600 px-4 pt-6 pb-20 z-0">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">Cá nhân</h1>
        </div>
      </div>

      <div className="flex-1 px-4 -mt-12 z-10">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 mb-6 flex items-center gap-4">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 text-indigo-600 font-bold text-2xl">
            {user?.firstName?.charAt(0) || user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-slate-800 truncate">{user?.firstName ? `${user.firstName} ${user.lastName}` : (user?.name || 'Customer')}</h2>
            <div className="flex items-center gap-1 text-slate-500 text-sm mt-1">
              <Mail className="w-3 h-3" />
              <span className="truncate">{user?.email}</span>
            </div>
            {user?.phone && (
              <div className="flex items-center gap-1 text-slate-500 text-sm mt-1">
                <Phone className="w-3 h-3" />
                <span>{user.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Menu Items */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 overflow-hidden">
          <button onClick={() => navigate('/customer/history')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <span className="font-medium text-slate-700">Lịch sử chuyến đi</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="font-medium text-slate-700">Thanh toán</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                <Shield className="w-5 h-5 text-amber-600" />
              </div>
              <span className="font-medium text-slate-700">Bảo mật tài khoản</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full bg-white text-red-500 font-bold py-4 rounded-xl shadow-sm border border-red-100 flex justify-center items-center gap-2 hover:bg-red-50 transition-colors active:scale-95"
        >
          <LogOut className="w-5 h-5" />
          Đăng xuất
        </button>
      </div>
    </div>
  );
};

export default ProfileScreen;
