import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import toast from 'react-hot-toast';

export const OfflineDetector = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-emerald-500 text-white shadow-lg rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-400 rounded-full flex items-center justify-center flex-shrink-0">
                <Wifi className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold">Đã khôi phục kết nối</p>
                <p className="text-xs text-emerald-100">Hệ thống đang hoạt động bình thường</p>
              </div>
            </div>
          </div>
        </div>
      ), { duration: 3000, id: 'network-status' });
    };

    const handleOffline = () => {
      setIsOffline(true);
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-red-500 text-white shadow-lg rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-400 rounded-full flex items-center justify-center flex-shrink-0">
                <WifiOff className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-bold">Mất kết nối mạng</p>
                <p className="text-xs text-red-100">Vui lòng kiểm tra lại đường truyền internet</p>
              </div>
            </div>
          </div>
        </div>
      ), { duration: Infinity, id: 'network-status' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 w-full bg-red-500 text-white text-xs font-bold text-center py-1.5 z-[9999] flex items-center justify-center gap-2">
      <WifiOff className="w-3.5 h-3.5" />
      Không có kết nối Internet
    </div>
  );
};
