import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookingStore } from '../../store/bookingStore';
import { Check, CreditCard, Banknote, ShieldCheck } from 'lucide-react';
import showToast from '@shared/components/Toast';

const PaymentScreen = () => {
  const navigate = useNavigate();
  const { estimatedPrice, distanceKm, driver, pickup, dropoff } = useBookingStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [method, setMethod] = useState<'CASH' | 'CARD' | 'WALLET'>('CASH');

  const finalPrice = estimatedPrice || 0;

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      // Simulate calling Payment API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      showToast.success('Thanh toán thành công!');
      navigate('/customer/rating');
    } catch (error) {
      showToast.error('Thanh toán thất bại, vui lòng thử lại');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-indigo-600 px-6 pt-12 pb-24 rounded-b-[40px] text-center relative z-0">
        <h1 className="text-white text-lg font-medium opacity-90 mb-2">Thanh toán chuyến đi</h1>
        <p className="text-white text-4xl font-bold tracking-tight">
          {finalPrice.toLocaleString('vi-VN')}đ
        </p>
      </div>

      <div className="flex-1 px-5 -mt-16 z-10">
        {/* Receipt Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 mb-6">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-dashed border-slate-200">
            <div>
              <p className="text-sm text-slate-500 mb-1">Tài xế</p>
              <p className="font-bold text-slate-800">{driver?.name || 'Nguyễn Văn A'}</p>
            </div>
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-xl">
              🚕
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="mt-1">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Điểm đón</p>
                <p className="text-sm font-medium text-slate-700">{pickup?.address}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="mt-1">
                <div className="w-2.5 h-2.5 rounded-none bg-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Điểm đến</p>
                <p className="text-sm font-medium text-slate-700">{dropoff?.address}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-sm">
            <span className="text-slate-500">Quãng đường</span>
            <span className="font-medium text-slate-800">{distanceKm.toFixed(1)} km</span>
          </div>
        </div>

        {/* Payment Methods */}
        <h3 className="font-bold text-slate-800 mb-4 px-1">Phương thức thanh toán</h3>
        <div className="space-y-3 mb-8">
          <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${method === 'CASH' ? 'border-indigo-500 bg-indigo-50/50' : 'border-transparent bg-white shadow-sm hover:border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Banknote className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="font-medium text-slate-800">Tiền mặt</span>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${method === 'CASH' ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'}`}>
              {method === 'CASH' && <Check className="w-3 h-3 text-white" />}
            </div>
            <input type="radio" name="payment" className="hidden" checked={method === 'CASH'} onChange={() => setMethod('CASH')} />
          </label>

          <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${method === 'CARD' ? 'border-indigo-500 bg-indigo-50/50' : 'border-transparent bg-white shadow-sm hover:border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <span className="font-medium text-slate-800 block">Thẻ tín dụng/Ghi nợ</span>
                <span className="text-xs text-slate-500">**** 4242</span>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${method === 'CARD' ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'}`}>
              {method === 'CARD' && <Check className="w-3 h-3 text-white" />}
            </div>
            <input type="radio" name="payment" className="hidden" checked={method === 'CARD'} onChange={() => setMethod('CARD')} />
          </label>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-xs text-slate-500">Thanh toán an toàn & bảo mật</span>
        </div>

        <button
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            `Thanh toán ${finalPrice.toLocaleString('vi-VN')}đ`
          )}
        </button>
      </div>
    </div>
  );
};

export default PaymentScreen;
