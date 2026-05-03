import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookingStore } from '../../store/bookingStore';
import { bookingApiService } from '../../services/bookingService';
import { useSocket } from '@shared/contexts/SocketContext';
import { X, User, Star, Phone, MessageSquare, Car } from 'lucide-react';
import showToast from '@shared/components/Toast';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import axiosClient from '../../api/axiosClient';

const MatchingScreen = () => {
  const navigate = useNavigate();
  const { pickup, bookingId, bookingCode, setStatus, setActiveRide, resetBooking } = useBookingStore();
  const { socket, isConnected, connect } = useSocket();
  const [isMatched, setIsMatched] = useState(false);
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const timerRef = useRef<number | null>(null);
  const pollRef = useRef<number | null>(null);
  const matchedRef = useRef(false);

  // Timer for search duration
  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setSearchTime(prev => prev + 1);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Check if an incoming event matches our booking
  const isOurBooking = useCallback((data: any) => {
    const eventBookingId = data.bookingId || data.booking_id || '';
    const eventMongoId = data.booking_id || data._id || '';
    
    // Match against MongoDB _id
    if (bookingId && (eventBookingId === bookingId || eventMongoId === bookingId)) return true;
    // Match against custom BKG-xxx bookingCode
    if (bookingCode && (eventBookingId === bookingCode || eventMongoId === bookingCode)) return true;
    
    return false;
  }, [bookingId, bookingCode]);

  const handleMatchSuccess = useCallback((data: any) => {
    if (matchedRef.current) return; // Prevent duplicate handling
    matchedRef.current = true;
    
    setIsMatched(true);
    setDriverInfo(data.driver);
    setActiveRide(bookingId as string, data.rideId, data.driver);
    setStatus('ACCEPTED');
    if (timerRef.current) clearInterval(timerRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
    
    setTimeout(() => {
      navigate('/customer/tracking');
    }, 3500);
  }, [bookingId, setActiveRide, setStatus, navigate]);

  // Socket listener for ride.matched
  useEffect(() => {
    if (!pickup || (!bookingId && !bookingCode)) {
      navigate('/customer/home');
      return;
    }

    if (!isConnected) {
      connect();
    }
  }, [pickup, bookingId, bookingCode, isConnected, connect, navigate]);

  // Attach socket listeners in a separate effect that depends on `socket`
  useEffect(() => {
    if (!socket) return;

    const handleRideMatched = (data: any) => {
      console.log('[MatchingScreen] ride.matched received:', data);
      if (isOurBooking(data)) {
        handleMatchSuccess(data);
      }
    };

    const handleBookingFailed = (data: any) => {
      if (isOurBooking(data)) {
        showToast.error('Không tìm thấy tài xế. Vui lòng thử lại.');
        resetBooking();
        navigate('/customer/home');
      }
    };

    socket.on('ride.matched', handleRideMatched);
    socket.on('booking.failed', handleBookingFailed);

    return () => {
      socket.off('ride.matched', handleRideMatched);
      socket.off('booking.failed', handleBookingFailed);
    };
  }, [socket, isOurBooking, handleMatchSuccess, resetBooking, navigate]);

  // Polling fallback: if no socket event within 5s, start polling the booking API
  useEffect(() => {
    if (matchedRef.current || (!bookingId && !bookingCode)) return;

    const startPolling = () => {
      pollRef.current = window.setInterval(async () => {
        if (matchedRef.current) {
          if (pollRef.current) clearInterval(pollRef.current);
          return;
        }

        try {
          const lookupId = bookingId || bookingCode;
          if (!lookupId) return;
          
          const res: any = await axiosClient.get(`/api/bookings/${lookupId}`);
          const booking = res?.data || res;
          
          if (booking && (booking.status === 'ACCEPTED' || booking.status === 'IN_PROGRESS')) {
            console.log('[MatchingScreen] Polling found ACCEPTED booking:', booking);
            handleMatchSuccess({
              bookingId: booking.bookingId || booking._id,
              booking_id: String(booking._id),
              rideId: booking.rideId || null,
              driver: {
                driverId: booking.driverId || '',
                name: booking.driverName || 'Tài xế CAB',
                phone: booking.driverPhone || '',
                rating: 4.9,
                vehicle: {
                  plateNumber: booking.vehiclePlate || 'N/A',
                  model: booking.vehicleModel || 'Xe hơi',
                  color: booking.vehicleColor || 'Trắng',
                },
                location: null,
              },
            });
          }
        } catch (err) {
          console.warn('[MatchingScreen] Polling error:', err);
        }
      }, 5000);
    };

    // Start polling after 5 seconds delay
    const pollDelay = window.setTimeout(startPolling, 5000);

    return () => {
      clearTimeout(pollDelay);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [bookingId, bookingCode, handleMatchSuccess]);

  const handleCancel = async () => {
    if (!bookingId && !bookingCode) return;
    setIsCancelling(true);
    try {
      const cancelId = bookingId || bookingCode || '';
      await bookingApiService.cancelBooking(cancelId);
      showToast.success('Đã hủy chuyến');
      resetBooking();
      navigate('/customer/home');
    } catch (error) {
      showToast.error('Lỗi khi hủy chuyến');
    } finally {
      setIsCancelling(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // Simulated nearby driver positions
  const mockDrivers = [
    { lat: (pickup?.lat || 10.762) + 0.008, lng: (pickup?.lng || 106.66) - 0.004 },
    { lat: (pickup?.lat || 10.762) - 0.006, lng: (pickup?.lng || 106.66) + 0.007 },
    { lat: (pickup?.lat || 10.762) + 0.003, lng: (pickup?.lng || 106.66) + 0.009 },
  ];

  return (
    <div className="h-screen w-full relative flex flex-col overflow-hidden bg-slate-950">
      
      {/* ── Map Background ── */}
      <div className="absolute inset-0 z-0 opacity-40">
        {pickup && (
          <MapContainer 
            center={[pickup.lat, pickup.lng]} 
            zoom={14} 
            zoomControl={false}
            dragging={false}
            scrollWheelZoom={false}
            className="w-full h-full"
            attributionControl={false}
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            
            {/* Nearby drivers */}
            {!isMatched && mockDrivers.map((d, i) => (
              <CircleMarker 
                key={i} 
                center={[d.lat, d.lng]} 
                radius={5}
                pathOptions={{ fillColor: '#818cf8', fillOpacity: 0.8, color: '#6366f1', weight: 2 }}
              />
            ))}
          </MapContainer>
        )}
      </div>

      {/* ── Radar Animation Overlay ── */}
      {!isMatched && (
        <div className="absolute inset-0 flex items-center justify-center z-[1] pointer-events-none">
          <div className="relative w-72 h-72">
            {/* Ripple rings */}
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500/30 animate-radar-ripple"></div>
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-radar-ripple-delayed"></div>
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500/10 animate-radar-ripple-delayed-2"></div>
            
            {/* Center pulse */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center shadow-xl shadow-indigo-500/30 animate-pulse-glow">
                <Car className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {!isMatched ? (
          <div className="text-center animate-fade-in mt-40">
            <h2 className="text-2xl font-extrabold text-white mb-2">Đang tìm tài xế</h2>
            <p className="text-slate-400 text-sm">Hệ thống đang ghép bạn với tài xế gần nhất</p>
            
            {/* Search timer */}
            <div className="mt-6 inline-flex items-center gap-2 bg-white/10 backdrop-blur px-5 py-2.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
              <span className="text-sm font-mono font-bold text-white">{formatTime(searchTime)}</span>
            </div>

            {/* Connection status indicator */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
              <span className="text-xs text-slate-500">
                {isConnected ? 'Đã kết nối realtime' : 'Đang kết nối...'}
              </span>
            </div>

            {/* Status dots */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-indigo-300 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        ) : (
          <div className="text-center animate-fade-in-scale w-full max-w-sm mt-20">
            {/* Success Icon */}
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-in">
              <div className="w-14 h-14 gradient-success text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-1">Đã tìm thấy tài xế!</h2>
            <p className="text-slate-400 text-sm mb-8">Tài xế đang trên đường đến đón bạn</p>

            {/* ── Driver Card ── */}
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-5 text-left shadow-2xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white truncate">{driverInfo?.name}</h3>
                  <div className="flex items-center gap-1 text-amber-400 mt-0.5">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm font-semibold">{driverInfo?.rating}</span>
                  </div>
                </div>
              </div>

              {/* Vehicle Info */}
              <div className="flex items-center justify-between bg-slate-800/60 rounded-2xl p-3.5 mb-4">
                <div>
                  <p className="text-xl font-extrabold text-white tracking-wider">{driverInfo?.vehicle?.plateNumber}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{driverInfo?.vehicle?.color} • {driverInfo?.vehicle?.model}</p>
                </div>
                <div className="w-14 h-14 bg-slate-700/50 rounded-xl flex items-center justify-center">
                  <Car className="w-7 h-7 text-indigo-400" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl flex items-center justify-center gap-2 transition-colors touch-bounce">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm font-semibold">Gọi điện</span>
                </button>
                <button className="flex-1 py-3 gradient-primary hover:opacity-90 text-white rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-600/20 touch-bounce">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-sm font-semibold">Nhắn tin</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Cancel Button ── */}
      {!isMatched && (
        <div className="p-6 relative z-10 animate-fade-in">
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="w-full py-4 bg-white/10 hover:bg-white/15 backdrop-blur text-white/80 font-semibold rounded-2xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 touch-bounce"
          >
            {isCancelling ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            ) : (
              <>
                <X className="w-5 h-5" />
                Hủy tìm kiếm
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default MatchingScreen;
