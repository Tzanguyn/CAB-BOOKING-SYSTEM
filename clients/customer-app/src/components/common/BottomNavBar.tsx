import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Clock, Wallet, User } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Trang chủ', icon: Home, path: '/customer/home' },
  { id: 'history', label: 'Lịch sử', icon: Clock, path: '/customer/history' },
  { id: 'wallet', label: 'Ví', icon: Wallet, path: '/customer/wallet' },
  { id: 'profile', label: 'Cá nhân', icon: User, path: '/customer/profile' },
];

const BottomNavBar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Don't show nav during booking flow
  const bookingPaths = ['/customer/destination', '/customer/options', '/customer/matching', '/customer/tracking', '/customer/payment', '/customer/rating'];
  if (bookingPaths.some(p => location.pathname.startsWith(p))) {
    return null;
  }

  const getActiveTab = (): string => {
    if (location.pathname.includes('/history')) return 'history';
    if (location.pathname.includes('/wallet')) return 'wallet';
    if (location.pathname.includes('/profile')) return 'profile';
    return 'home';
  };

  const activeTab = getActiveTab();

  return (
    <nav className="bottom-nav">
      <div className="flex items-stretch h-full max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`bottom-nav-item touch-bounce ${isActive ? 'active' : ''}`}
              aria-label={item.label}
            >
              <Icon
                className={`w-5 h-5 transition-all duration-200 ${
                  isActive ? 'text-indigo-600' : 'text-slate-400'
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={`text-[10px] font-semibold transition-colors duration-200 ${
                  isActive ? 'text-indigo-600' : 'text-slate-400'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavBar;
