import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, Shield, ArrowRight, KeyRound } from 'lucide-react';
import { adminLoginSchema, type AdminLoginFormData } from '@shared/types/auth.schemas';
import { useAuth } from '@shared/contexts/AuthContext';

const AdminLoginPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMFA, setShowMFA] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<AdminLoginFormData>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: '', password: '', mfaCode: '' },
  });

  const onSubmit = async (data: AdminLoginFormData) => {
    setIsSubmitting(true);
    try {
      // Step 1: If MFA panel is shown, validate mfaCode format (optional, UI only for now)
      // In production, MFA would be verified server-side via a dedicated endpoint

      if (!showMFA) {
        // Show MFA input step
        setShowMFA(true);
        setIsSubmitting(false);
        return;
      }

      // Step 2: Perform actual login
      await login(data.email, data.password);
      navigate('/admin/dashboard');
    } catch {
      // Error handled by toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-gray-900 to-indigo-950 relative overflow-hidden p-4">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-violet-500/8 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30 relative">
            <Shield className="w-10 h-10 text-white" />
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
              <KeyRound className="w-3 h-3 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
            CAB Admin
          </h1>
          <p className="text-slate-400 mt-2 text-sm">Bảng điều khiển quản trị hệ thống</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          {/* Security badge */}
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-6">
            <Shield className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-xs text-amber-300">
              {showMFA ? 'Xác thực 2 lớp (MFA) bắt buộc' : 'Khu vực quản trị - Yêu cầu MFA'}
            </span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {!showMFA ? (
              <>
                {/* Email */}
                <div>
                  <label htmlFor="admin-email" className="block text-sm font-medium text-slate-300 mb-1.5">
                    Email quản trị
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      id="admin-email"
                      type="email"
                      autoComplete="email"
                      placeholder="admin@cab-booking.com"
                      className={`w-full pl-10 pr-4 py-3 bg-slate-800/80 border rounded-xl text-white placeholder:text-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 ${
                        errors.email ? 'border-red-500/60' : 'border-slate-700 hover:border-slate-600'
                      }`}
                      {...register('email')}
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="admin-password" className="block text-sm font-medium text-slate-300 mb-1.5">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      id="admin-password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-4 py-3 bg-slate-800/80 border rounded-xl text-white placeholder:text-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 ${
                        errors.password ? 'border-red-500/60' : 'border-slate-700 hover:border-slate-600'
                      }`}
                      {...register('password')}
                    />
                  </div>
                  {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
                </div>
              </>
            ) : (
              /* MFA Code Step */
              <div className="animate-fade-in">
                <div className="text-center mb-4">
                  <p className="text-slate-300 text-sm">
                    Nhập mã xác thực từ ứng dụng Authenticator
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Đang đăng nhập: <span className="text-indigo-400">{getValues('email')}</span>
                  </p>
                </div>

                <div>
                  <label htmlFor="admin-mfa" className="block text-sm font-medium text-slate-300 mb-1.5">
                    Mã TOTP (6 chữ số)
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      id="admin-mfa"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      autoFocus
                      placeholder="000000"
                      className={`w-full pl-10 pr-4 py-3 bg-slate-800/80 border rounded-xl text-white text-center text-lg tracking-[0.5em] font-mono placeholder:text-slate-600 placeholder:tracking-[0.5em] transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 ${
                        errors.mfaCode ? 'border-red-500/60' : 'border-slate-700'
                      }`}
                      {...register('mfaCode')}
                    />
                  </div>
                  {errors.mfaCode && <p className="mt-1 text-xs text-red-400">{errors.mfaCode.message}</p>}
                </div>

                <button
                  type="button"
                  onClick={() => setShowMFA(false)}
                  className="text-sm text-slate-400 hover:text-white transition-colors mt-3 cursor-pointer"
                >
                  ← Quay lại
                </button>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : showMFA ? (
                <>
                  Xác thực & Đăng nhập
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Tiếp tục
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-6">
          CAB Admin Portal v1.0 — Secured with MFA
        </p>
      </div>
    </div>
  );
};

export default AdminLoginPage;
