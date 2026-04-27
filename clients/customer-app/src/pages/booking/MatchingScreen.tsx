import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookingStore } from '../../store/bookingStore';
import { bookingApiService } from '../../services/bookingService';
import { useSocket } from '@shared/contexts/SocketContext';
import { X, User, Star, Phone, MessageSquare } from 'lucide-react';
import showToast from '@shared/components/Toast';

const MatchingScreen = () => {
  const navigate = useNavigate();
  const { pickup, bookingId, setStatus, setActiveRide, resetBooking } = useBookingStore();
  const { socket, isConnected, connect } = useSocket();
  const [isMatched, setIsMatched] = useState(false);
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!pickup || !bookingId) {
      navigate('/customer/home');
      return;
    }

    if (!isConnected) {
      connect();
    }

    if (socket) {
      // Mock event or real event based on backend implementation
      socket.on('ride.matched', (data: any) => {
        if (data.bookingId === bookingId || data.booking_id === bookingId) {
          handleMatchSuccess(data);
        }
      });

      socket.on('booking.failed', (data: any) => {
        if (data.bookingId === bookingId) {
          showToast.error('Không tìm thấy tài xế. Vui lòng thử lại.');
          resetBooking();
          navigate('/customer/home');
        }
      });

      // Fallback timeout simulation for testing (if backend doesn't emit)
      const timeout = setTimeout(() => {
        if (!isMatched) {
          // Simulate match after 5 seconds for demonstration
          handleMatchSuccess({
            driver: {
              driverId: 'drv-123',
              name: 'Nguyễn Văn Tài Xế',
              phone: '0901234567',
              rating: 4.9,
              vehicle: {
                plateNumber: '51G-123.45',
                model: 'Toyota Vios',
                color: 'Trắng'
              },
              location: { lat: pickup.lat + 0.005, lng: pickup.lng + 0.005 }
            },
            rideId: 'ride-' + Date.now()
          });
        }
      }, 5000);

      return () => {
        socket.off('ride.matched');
        socket.off('booking.failed');
        clearTimeout(timeout);
      };
    }
  }, [socket, isConnected, bookingId]);

  const handleMatchSuccess = (data: any) => {
    setIsMatched(true);
    setDriverInfo(data.driver);
    setActiveRide(bookingId as string, data.rideId, data.driver);
    setStatus('ACCEPTED');
    
    // Auto navigate to tracking after showing driver info for 3 seconds
    setTimeout(() => {
      navigate('/customer/tracking');
    }, 3000);
  };

  const handleCancel = async () => {
    if (!bookingId) return;
    setIsCancelling(true);
    try {
      await bookingApiService.cancelBooking(bookingId);
      showToast.success('Đã hủy chuyến');
      resetBooking();
      navigate('/customer/home');
    } catch (error) {
      showToast.error('Lỗi khi hủy chuyến');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Radar sweeping effect */}
        {!isMatched && (
          <div className="relative w-64 h-64">
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500/30 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
            <div className="absolute inset-4 rounded-full border-2 border-indigo-500/20 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
            <div className="absolute inset-8 rounded-full border-2 border-indigo-500/10 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
            
            {/* Center dot */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {!isMatched ? (
          <div className="text-center animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-2">Đang tìm tài xế</h2>
            <p className="text-slate-400">Vui lòng đợi trong giây lát...</p>
            <div className="mt-8 text-indigo-400">
              <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
            </div>
          </div>
        ) : (
          <div className="text-center animate-fade-in w-full max-w-sm">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/30">
                ✓
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Đã tìm thấy tài xế!</h2>
            <p className="text-slate-400 mb-8">Tài xế đang trên đường đến đón bạn</p>

            {/* Driver Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-left shadow-2xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white truncate">{driverInfo?.name}</h3>
                  <div className="flex items-center gap-1 text-amber-400 mt-0.5">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm font-medium">{driverInfo?.rating}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-800/50 rounded-xl p-3 mb-4">
                <div>
                  <p className="text-xl font-bold text-white tracking-wider">{driverInfo?.vehicle?.plateNumber}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{driverInfo?.vehicle?.color} • {driverInfo?.vehicle?.model}</p>
                </div>
                <div className="text-3xl">🚕</div>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl flex items-center justify-center gap-2 transition-colors">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm font-medium">Gọi điện</span>
                </button>
                <button className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-600/20">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-sm font-medium">Nhắn tin</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Button (Bottom) */}
      {!isMatched && (
        <div className="p-6 relative z-10">
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isCancelling ? (
              <div className="w-5 h-5 border-2 border-slate-500/30 border-t-slate-400 rounded-full animate-spin" />
            ) : (
              <>
                <X className="w-5 h-5" />
                Hủy chuyến
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default MatchingScreen;
