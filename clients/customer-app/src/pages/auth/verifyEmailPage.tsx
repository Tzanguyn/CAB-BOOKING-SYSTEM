import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import axios from 'axios';
import showToast from '@shared/components/Toast';

const VerifyEmailPage = () => {
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string })?.email || '';

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only digits

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Take only last char
    setCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits filled
    if (newCode.every((d) => d !== '') && newCode.join('').length === 6) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
      handleVerify(pasted);
    }
  };

  const handleVerify = async (verificationCode: string) => {
    setIsSubmitting(true);
    try {
      await axios.post(`${apiUrl}/auth/verify-email`, {
        email,
        code: verificationCode,
      });
      showToast.success('Email đã được xác thực thành công!');
      navigate('/customer/onboarding');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      showToast.error(err.response?.data?.error || 'Mã xác thực không hợp lệ');
      setCode(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    try {
      // Re-register would send new code; or use a separate resend endpoint if available
      showToast.info('Đang gửi lại mã xác thực...');
      setCountdown(60);
      setCanResend(false);
      setCode(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } catch {
      showToast.error('Không thể gửi lại mã');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 relative overflow-hidden p-4">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-24 w-80 h-80 bg-emerald-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-24 w-80 h-80 bg-indigo-500/8 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </button>

        {/* Icon */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Xác thực Email</h1>
          <p className="text-slate-400 mt-2 text-sm">
            Nhập mã 6 chữ số đã gửi đến{' '}
            <span className="text-indigo-400 font-medium">{email || 'email của bạn'}</span>
          </p>
        </div>

        {/* OTP Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          {/* 6 digit inputs */}
          <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={isSubmitting}
                className={`w-12 h-14 text-center text-xl font-bold rounded-xl border bg-slate-800/80 text-white
                  transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500
                  ${digit ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-slate-700'}
                  ${isSubmitting ? 'opacity-50' : ''}
                `}
              />
            ))}
          </div>

          {/* Loading indicator */}
          {isSubmitting && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-4 h-4 border-2 border-indigo-300/30 border-t-indigo-400 rounded-full animate-spin" />
              <span className="text-sm text-slate-400">Đang xác thực...</span>
            </div>
          )}

          {/* Resend */}
          <div className="text-center">
            {canResend ? (
              <button
                onClick={handleResend}
                className="flex items-center gap-2 mx-auto text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Gửi lại mã
              </button>
            ) : (
              <p className="text-sm text-slate-500">
                Gửi lại mã sau{' '}
                <span className="text-indigo-400 font-mono font-medium">{countdown}s</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
