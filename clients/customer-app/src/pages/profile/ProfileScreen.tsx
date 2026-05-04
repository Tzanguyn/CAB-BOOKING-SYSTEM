import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, LogOut, Shield, MapPin, CreditCard, ChevronRight, 
         Wallet, Settings, Bell, Globe, Heart, Star, Edit3, Home as HomeIcon, Briefcase } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';

type Tab = 'profile' | 'wallet' | 'settings';

const ProfileScreen = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const handleLogout = () => {
    logout();
    navigate('/customer/login');
  };

  const userName = user?.firstName ? `${user.firstName} ${user.lastName || ''}` : (user?.name || 'Customer');
  const userInitial = user?.firstName?.charAt(0) || user?.name?.charAt(0) || 'U';

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'profile', label: 'Hồ sơ', icon: Edit3 },
    { key: 'wallet', label: 'Ví', icon: Wallet },
    { key: 'settings', label: 'Cài đặt', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col page-with-nav">
      {/* ── Header ── */}
      <div className="gradient-primary px-5 pt-5 pb-20 relative overflow-hidden">
        {/* Decorative */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 transition-colors touch-bounce"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-extrabold text-white">Tài khoản</h1>
        </div>
      </div>

      <div className="flex-1 px-4 -mt-14 z-10 pb-4">
        {/* ── Profile Card ── */}
        <div className="card-elevated p-5 mb-5 flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-2xl flex items-center justify-center flex-shrink-0 text-white font-extrabold text-2xl shadow-lg shadow-indigo-500/20">
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-extrabold text-slate-900 truncate">{userName}</h2>
            <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-1">
              <Mail className="w-3.5 h-3.5" />
              <span className="truncate">{user?.email || 'email@example.com'}</span>
            </div>
            {user?.phone && (
              <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-0.5">
                <Phone className="w-3.5 h-3.5" />
                <span>{user.phone}</span>
              </div>
            )}
          </div>
          <button className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center touch-bounce hover:bg-slate-200 transition-colors">
            <Edit3 className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-2xl">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all touch-bounce ${
                  activeTab === tab.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ── */}
        <div className="animate-fade-in">
          {activeTab === 'profile' && (
            <div className="space-y-3">
              {/* Saved Locations */}
              <div className="card-premium p-1 overflow-hidden">
                <div className="px-4 pt-3 pb-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Địa chỉ đã lưu</p>
                </div>
                <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors touch-bounce">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                      <HomeIcon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-slate-800 text-sm block">Nhà riêng</span>
                      <span className="text-[11px] text-slate-400">Thêm địa chỉ nhà</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </button>
                <div className="h-[1px] bg-slate-100 mx-4"></div>
                <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors touch-bounce">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-slate-800 text-sm block">Văn phòng</span>
                      <span className="text-[11px] text-slate-400">Thêm địa chỉ công ty</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </button>
              </div>

              {/* Menu Items */}
              <div className="card-premium p-1 overflow-hidden">
                <MenuItem icon={MapPin} iconBg="bg-blue-100" iconColor="text-blue-600" label="Lịch sử chuyến đi" onClick={() => navigate('/customer/history')} />
                <div className="h-[1px] bg-slate-100 mx-4"></div>
                <MenuItem icon={Star} iconBg="bg-amber-100" iconColor="text-amber-600" label="Đánh giá của tôi" />
                <div className="h-[1px] bg-slate-100 mx-4"></div>
                <MenuItem icon={Heart} iconBg="bg-rose-100" iconColor="text-rose-500" label="Địa điểm yêu thích" />
              </div>
            </div>
          )}

          {activeTab === 'wallet' && (
            <div className="space-y-4">
              {/* Balance Card */}
              <div className="gradient-primary rounded-3xl p-6 text-white relative overflow-hidden shadow-lg shadow-indigo-500/25">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <p className="text-sm text-white/70 font-medium mb-1">Số dư ví CAB</p>
                <p className="text-3xl font-extrabold mb-4">500,000₫</p>
                <div className="flex gap-3">
                  <button className="flex-1 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl text-sm transition-colors touch-bounce">
                    Nạp tiền
                  </button>
                  <button className="flex-1 py-2.5 bg-white text-indigo-600 font-bold rounded-xl text-sm transition-colors touch-bounce">
                    Rút tiền
                  </button>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="card-premium p-1 overflow-hidden">
                <div className="px-4 pt-3 pb-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Phương thức thanh toán</p>
                </div>
                <MenuItem icon={CreditCard} iconBg="bg-blue-100" iconColor="text-blue-600" label="Thẻ Visa ****4242" desc="Mặc định" />
                <div className="h-[1px] bg-slate-100 mx-4"></div>
                <button className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors touch-bounce">
                  <div className="w-10 h-10 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center">
                    <span className="text-slate-400 text-lg">+</span>
                  </div>
                  <span className="font-semibold text-indigo-600 text-sm">Thêm phương thức</span>
                </button>
              </div>

              {/* Recent Transactions */}
              <div className="card-premium p-1 overflow-hidden">
                <div className="px-4 pt-3 pb-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Giao dịch gần đây</p>
                </div>
                {[
                  { label: 'Chuyến đi - Tân Sơn Nhất', amount: '-130,000₫', time: 'Hôm qua', color: 'text-rose-500' },
                  { label: 'Nạp tiền', amount: '+500,000₫', time: '2 ngày trước', color: 'text-emerald-600' },
                  { label: 'Chuyến đi - Landmark 81', amount: '-85,000₫', time: '3 ngày trước', color: 'text-rose-500' },
                ].map((tx, i) => (
                  <div key={i}>
                    {i > 0 && <div className="h-[1px] bg-slate-100 mx-4"></div>}
                    <div className="flex items-center justify-between p-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{tx.label}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{tx.time}</p>
                      </div>
                      <span className={`font-bold text-sm ${tx.color}`}>{tx.amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-3">
              <div className="card-premium p-1 overflow-hidden">
                <MenuItem icon={Bell} iconBg="bg-amber-100" iconColor="text-amber-600" label="Thông báo" desc="Bật" />
                <div className="h-[1px] bg-slate-100 mx-4"></div>
                <MenuItem icon={Globe} iconBg="bg-cyan-100" iconColor="text-cyan-600" label="Ngôn ngữ" desc="Tiếng Việt" />
                <div className="h-[1px] bg-slate-100 mx-4"></div>
                <MenuItem icon={Shield} iconBg="bg-indigo-100" iconColor="text-indigo-600" label="Bảo mật tài khoản" />
              </div>

              <button 
                onClick={handleLogout}
                className="w-full bg-white text-rose-500 font-bold py-4 rounded-2xl shadow-sm border border-rose-100 flex justify-center items-center gap-2 hover:bg-rose-50 transition-colors touch-bounce"
              >
                <LogOut className="w-5 h-5" />
                Đăng xuất
              </button>

              <p className="text-center text-[11px] text-slate-400 mt-4">
                CAB Booking v1.0.0 • Made with ❤️
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Reusable menu item
const MenuItem = ({ 
  icon: Icon, iconBg, iconColor, label, desc, onClick 
}: { 
  icon: React.ElementType; iconBg: string; iconColor: string; label: string; desc?: string; onClick?: () => void 
}) => (
  <button 
    onClick={onClick} 
    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors touch-bounce"
  >
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="text-left">
        <span className="font-semibold text-slate-800 text-sm block">{label}</span>
        {desc && <span className="text-[11px] text-slate-400">{desc}</span>}
      </div>
    </div>
    <ChevronRight className="w-5 h-5 text-slate-300" />
  </button>
);

export default ProfileScreen;
