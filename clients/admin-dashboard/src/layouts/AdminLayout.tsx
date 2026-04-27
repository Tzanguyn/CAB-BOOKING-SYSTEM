import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Map as MapIcon, 
  DollarSign, 
  ScrollText, 
  LogOut, 
  Menu,
  X,
  Bell
} from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';

const SIDEBAR_ITEMS = [
  { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Tổng quan' },
  { path: '/admin/users', icon: Users, label: 'Người dùng' },
  { path: '/admin/map', icon: MapIcon, label: 'Bản đồ trực tiếp' },
  { path: '/admin/pricing', icon: DollarSign, label: 'Cấu hình giá (Surge)' },
  { path: '/admin/logs', icon: ScrollText, label: 'System Logs' },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-white">C</div>
        <span className="text-white font-bold text-xl tracking-tight">CAB Admin</span>
      </div>
      
      <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = location.pathname.includes(item.path);
          return (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setIsMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive 
                  ? 'bg-indigo-500/10 text-indigo-400 font-medium' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-white font-bold">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name || 'Admin User'}</p>
            <p className="text-slate-500 text-xs truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Đăng xuất
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 flex-col z-20">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />
          <aside className="w-72 bg-slate-900 relative flex-col shadow-2xl animate-fade-in-right">
            <button 
              onClick={() => setIsMobileOpen(false)}
              className="absolute top-6 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-slate-800 hidden sm:block">
              {SIDEBAR_ITEMS.find(item => location.pathname.includes(item.path))?.label || 'Dashboard'}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-slate-50/50 p-4 md:p-8">
          <div className="max-w-7xl mx-auto h-full animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
