import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, Lock, Loader2 } from 'lucide-react';
import showToast from '@shared/components/Toast';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface StripeFormProps {
  clientSecret: string;
  amount: number;
  onSuccess: () => void;
  onClose: () => void;
}

const StripeForm = ({ amount, onSuccess, onClose }: StripeFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Return URL is required but we'll try to handle it without full page reload if possible
        // using redirect: 'if_required' for cards.
      },
      redirect: 'if_required',
    });

    if (error) {
      console.error('[Stripe Error]', error);
      showToast.error(error.message || 'Thanh toán thất bại');
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess();
    } else {
      showToast.error('Trạng thái thanh toán không xác định');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 flex flex-col h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-extrabold text-slate-900">Thanh toán thẻ</h3>
          <p className="text-sm text-slate-500 mt-1">Bảo mật bởi Stripe</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors"
          disabled={isProcessing}
        >
          <X className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      <div className="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-100">
        <div className="flex justify-between items-center">
          <span className="text-slate-600 font-medium">Tổng thanh toán</span>
          <span className="text-xl font-extrabold text-indigo-600">{amount.toLocaleString('vi-VN')}₫</span>
        </div>
      </div>

      <div className="flex-1">
        <PaymentElement 
          options={{
            layout: 'tabs',
            defaultValues: {
              billingDetails: {
                address: {
                  country: 'VN'
                }
              }
            }
          }} 
        />
      </div>

      <div className="mt-8 mb-4">
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="w-full gradient-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 touch-bounce disabled:opacity-70 disabled:pointer-events-none"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Đang xử lý...
            </>
          ) : (
            <>
              <Lock className="w-5 h-5" />
              Thanh toán {amount.toLocaleString('vi-VN')}₫
            </>
          )}
        </button>
        <div className="flex items-center justify-center gap-1 mt-4 text-xs text-slate-400 font-medium">
          <Lock className="w-3 h-3" />
          <span>Mã hóa bảo mật 256-bit SSL</span>
        </div>
      </div>
    </form>
  );
};

export const StripePaymentModal = ({ clientSecret, amount, onSuccess, onClose }: StripeFormProps) => {
  if (!clientSecret) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Bottom Sheet Modal */}
      <div className="relative bg-white w-full rounded-t-3xl max-h-[90vh] flex flex-col animate-slide-up shadow-2xl">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 shrink-0" />
        
        <Elements 
          stripe={stripePromise} 
          options={{ 
            clientSecret,
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: '#6366f1',
                colorBackground: '#ffffff',
                colorText: '#1e293b',
                colorDanger: '#ef4444',
                fontFamily: 'Inter, system-ui, sans-serif',
                spacingUnit: '4px',
                borderRadius: '12px',
              }
            }
          }}
        >
          <StripeForm amount={amount} onSuccess={onSuccess} onClose={onClose} clientSecret={clientSecret} />
        </Elements>
      </div>
    </div>
  );
};
