import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookingStore } from '../../store/bookingStore';
import { Check, CreditCard, Banknote, Wallet, ShieldCheck, AlertTriangle, Car, ArrowLeft } from 'lucide-react';
import showToast from '@shared/components/Toast';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '@shared/contexts/AuthContext';
import { bookingApiService } from '../../services/bookingService';
import { StripePaymentModal } from '../../components/payment/StripePaymentModal';

const PaymentScreen = () => {
  const navigate = useNavigate();
  const { estimatedPrice, distanceKm, pickup, dropoff, surgeMultiplier, vehicleType, setStatus, setActiveRide } = useBookingStore();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [method, setMethod] = useState<'CASH' | 'CARD' | 'WALLET'>('CASH');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  const finalPrice = estimatedPrice || 0;
  const baseFare = 15000;
  const distanceFare = Math.max(0, Math.round((finalPrice / (surgeMultiplier || 1)) - baseFare));
  const surgeFare = surgeMultiplier > 1 ? Math.round(finalPrice - finalPrice / surgeMultiplier) : 0;

  const handleCreateBooking = async (methodId: string) => {
    if (!pickup || !dropoff || !user) return;
    
    try {
      const payload = {
        customerId: user.id,
        customerName: user.name || user.email || 'Khách hàng',
        customerPhone: user.phone || '',
        pickupLocation: { lat: pickup.lat, lng: pickup.lng, address: pickup.address },
        dropoffLocation: { lat: dropoff.lat, lng: dropoff.lng, address: dropoff.address },
        vehicleType: vehicleType || 'standard',
        distance_km: distanceKm,
        paymentMethod: methodId,
        autoAssign: true,
        searchRadiusKm: 5
      };

      const res = await bookingApiService.createBooking(payload);
      
      if (res.success) {
        const mongoId = res.data._id || res.data.id || '';
        const bookingCode = res.data.bookingId || '';
        
        setActiveRide(String(mongoId), null, null);
        useBookingStore.getState().setBookingIds(String(mongoId), bookingCode);
        setStatus('SEARCHING');
        navigate('/customer/matching');
      } else {
        throw new Error(res.message);
      }
    } catch (error: any) {
      showToast.error(error.message || 'Lỗi đặt xe');
      throw error;
    }
  };

  const handlePayment = async (forceFail = false) => {
    setIsProcessing(true);
    try {
      if (forceFail) {
        throw new Error('Giả lập lỗi từ Payment Gateway (Timeout/Rate Limit)');
      }
      
      if (method === 'CARD' || method === 'WALLET') {
        const payload = {
          rideId: `BKG-TEMP-${Date.now()}`,
          amount: finalPrice,
          currency: 'vnd',
          method: method
        };
        
        const res: any = await axiosClient.post('/api/payments/create-intent', payload);
        if (res?.clientSecret) {
          setClientSecret(res.clientSecret);
        } else {
          throw new Error('Không thể khởi tạo thanh toán Stripe');
        }
      } else {
        // CASH
        await handleCreateBooking('CASH');
      }
    } catch (error: any) {
      console.error('Payment Error:', error);
      setErrorMsg(error.response?.data?.error || error.message || 'Lỗi kết nối cổng thanh toán');
      setShowErrorModal(true);
      setIsProcessing(false);
    }
  };

  const handleStripeSuccess = async () => {
    setClientSecret('');
    setShowSuccessOverlay(true);
    try {
      await handleCreateBooking(method);
    } catch (e) {
      setShowSuccessOverlay(false);
      setIsProcessing(false);
    }
  };

  const paymentMethods = [
    { id: 'CASH' as const, label: 'Tiền mặt', desc: 'Thanh toán cho tài xế', icon: Banknote, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
    { id: 'CARD' as const, label: 'Thẻ tín dụng', desc: '**** **** **** 4242', icon: CreditCard, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
    { id: 'WALLET' as const, label: 'Ví CAB', desc: 'Số dư: 500,000₫', icon: Wallet, iconBg: 'bg-violet-100', iconColor: 'text-violet-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      {/* ── Gradient Header ── */}
      <div className="gradient-primary px-6 pt-12 pb-28 text-center relative overflow-hidden">
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-[400] w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors touch-bounce"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4"></div>
        
        <p className="text-white/80 text-sm font-medium mb-3">Tổng thanh toán</p>
        <p className="text-white text-4xl font-extrabold tracking-tight animate-fade-in">
          {finalPrice.toLocaleString('vi-VN')}₫
        </p>
        <p className="text-white/60 text-xs mt-2 font-medium">
          {vehicleType ? `CAB ${vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1)}` : 'CAB Standard'} • {distanceKm.toFixed(1)} km
        </p>
      </div>

      <div className="flex-1 px-5 -mt-20 z-10 pb-8">
        {/* ── Receipt Card ── */}
        <div className="card-elevated p-5 mb-6 animate-fade-in">
          {/* Ride Info */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-dashed border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center shadow-sm">
                <Car className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Chuyến đi mới</p>
                <p className="text-[11px] text-slate-400">{vehicleType ? `CAB ${vehicleType.toUpperCase()}` : 'CAB STANDARD'}</p>
              </div>
            </div>
          </div>

          {/* Route */}
          <div className="space-y-3 mb-5">
            <div className="flex gap-3 items-start">
              <div className="mt-1 flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/30" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Điểm đón</p>
                <p className="text-xs font-medium text-slate-700 mt-0.5">{pickup?.name || pickup?.address?.split(',')[0]}</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="mt-1 flex-shrink-0">
                <div className="w-3 h-3 bg-emerald-500 shadow-sm shadow-emerald-500/30" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Điểm đến</p>
                <p className="text-xs font-medium text-slate-700 mt-0.5">{dropoff?.name || dropoff?.address?.split(',')[0]}</p>
              </div>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Cước cơ bản</span>
              <span className="font-semibold text-slate-800">{baseFare.toLocaleString('vi-VN')}₫</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Phí quãng đường</span>
              <span className="font-semibold text-slate-800">{distanceFare.toLocaleString('vi-VN')}₫</span>
            </div>
            {surgeFare > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-amber-600 font-medium">⚡ Phí cao điểm</span>
                <span className="font-semibold text-amber-600">+{surgeFare.toLocaleString('vi-VN')}₫</span>
              </div>
            )}
            <div className="border-t border-dashed border-slate-200 pt-2.5 flex justify-between">
              <span className="font-bold text-slate-900">Tổng cộng</span>
              <span className="font-extrabold text-lg text-slate-900">{finalPrice.toLocaleString('vi-VN')}₫</span>
            </div>
          </div>
        </div>

        {/* ── Payment Methods ── */}
        <h3 className="font-extrabold text-slate-900 mb-3 px-1">Phương thức thanh toán</h3>
        <div className="space-y-2.5 mb-6">
          {paymentMethods.map((pm) => {
            const Icon = pm.icon;
            return (
              <label 
                key={pm.id}
                className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all touch-bounce ${
                  method === pm.id 
                    ? 'border-indigo-500 bg-indigo-50/40 shadow-sm shadow-indigo-500/10' 
                    : 'border-transparent bg-white shadow-sm hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${pm.iconBg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${pm.iconColor}`} />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 text-sm block">{pm.label}</span>
                    <span className="text-[11px] text-slate-400">{pm.desc}</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  method === pm.id ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'
                }`}>
                  {method === pm.id && <Check className="w-3 h-3 text-white" />}
                </div>
                <input type="radio" name="payment" className="hidden" checked={method === pm.id} onChange={() => setMethod(pm.id)} />
              </label>
            );
          })}
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-[11px] text-slate-400 font-medium">Thanh toán an toàn & bảo mật SSL</span>
        </div>

        {/* Pay Button */}
        <div className="flex gap-3">
          <button
            onClick={() => handlePayment(false)}
            disabled={isProcessing}
            className="flex-1 py-4 gradient-primary hover:opacity-90 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isProcessing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              `Thanh toán ${finalPrice.toLocaleString('vi-VN')}₫`
            )}
          </button>
          
          <button
            onClick={() => handlePayment(true)}
            disabled={isProcessing}
            title="Demo: Giả lập lỗi Payment Gateway"
            className="w-14 h-[56px] bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-500 rounded-2xl flex items-center justify-center touch-bounce"
          >
            <AlertTriangle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Success Overlay ── */}
      {showSuccessOverlay && (
        <div className="fixed inset-0 z-[600] bg-white flex items-center justify-center animate-fade-in">
          <div className="text-center">
            <div className="w-24 h-24 gradient-success rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-in shadow-xl shadow-emerald-500/30">
              <Check className="w-12 h-12 text-white" strokeWidth={3} />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Thanh toán thành công!</h2>
            <p className="text-slate-500 text-sm">Đang tìm tài xế...</p>
          </div>
        </div>
      )}

      {/* ── Error Modal ── */}
      {showErrorModal && (
        <div className="fixed inset-0 z-[500] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in-scale">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-2">Thanh toán thất bại</h3>
              <p className="text-sm text-slate-500 mb-6">{errorMsg}</p>
              
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-left mb-6">
                <p className="text-amber-800 text-sm font-bold mb-1">💡 Gợi ý (Fallback)</p>
                <p className="text-amber-700/80 text-xs">Chuyển sang thanh toán bằng tiền mặt cho tài xế?</p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowErrorModal(false)}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors touch-bounce"
                >
                  Thử lại
                </button>
                <button 
                  onClick={() => {
                    setMethod('CASH');
                    setShowErrorModal(false);
                    setTimeout(() => handlePayment(false), 500);
                  }}
                  className="flex-1 py-3.5 gradient-primary text-white font-bold rounded-xl transition-colors touch-bounce shadow-lg shadow-indigo-500/20"
                >
                  Tiền mặt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Stripe Payment Modal */}
      {clientSecret && (
        <StripePaymentModal
          clientSecret={clientSecret}
          amount={finalPrice}
          onSuccess={handleStripeSuccess}
          onClose={() => setClientSecret('')}
        />
      )}
    </div>
  );
};

export default PaymentScreen;
