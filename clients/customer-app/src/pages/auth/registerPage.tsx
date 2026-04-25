import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, User, Phone, ArrowRight, Car } from 'lucide-react';
import { registerSchema, type RegisterFormData } from '@shared/types/auth.schemas';
import { useAuth } from '@shared/contexts/AuthContext';

const RegisterPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { register: authRegister } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      phone: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    try {
      await authRegister({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: 'customer',
      });
      // Navigate to verify email page
      navigate('/customer/verify-email', { state: { email: data.email } });
    } catch {
      // Error handled by AuthContext toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 relative overflow-hidden p-4">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/30 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
            <Car className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Tạo tài khoản</h1>
          <p className="text-slate-400 mt-1 text-sm">Đăng ký để bắt đầu đặt xe</p>
        </div>

        {/* Register Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-7 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="reg-firstName" className="block text-sm font-medium text-slate-300 mb-1.5">
                  Họ
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="reg-firstName"
                    type="text"
                    placeholder="Nguyễn"
                    className={`w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border rounded-xl text-white text-sm placeholder:text-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                      errors.firstName ? 'border-red-500/60' : 'border-slate-700'
                    }`}
                    {...register('firstName')}
                  />
                </div>
                {errors.firstName && <p className="mt-1 text-xs text-red-400">{errors.firstName.message}</p>}
              </div>
              <div>
                <label htmlFor="reg-lastName" className="block text-sm font-medium text-slate-300 mb-1.5">
                  Tên
                </label>
                <input
                  id="reg-lastName"
                  type="text"
                  placeholder="Văn A"
                  className={`w-full px-3 py-2.5 bg-slate-800/80 border rounded-xl text-white text-sm placeholder:text-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                    errors.lastName ? 'border-red-500/60' : 'border-slate-700'
                  }`}
                  {...register('lastName')}
                />
                {errors.lastName && <p className="mt-1 text-xs text-red-400">{errors.lastName.message}</p>}
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border rounded-xl text-white text-sm placeholder:text-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                    errors.email ? 'border-red-500/60' : 'border-slate-700'
                  }`}
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="reg-phone" className="block text-sm font-medium text-slate-300 mb-1.5">
                Số điện thoại <span className="text-slate-500">(tùy chọn)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  id="reg-phone"
                  type="tel"
                  placeholder="0912345678"
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border rounded-xl text-white text-sm placeholder:text-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                    errors.phone ? 'border-red-500/60' : 'border-slate-700'
                  }`}
                  {...register('phone')}
                />
              </div>
              {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Ít nhất 6 ký tự"
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border rounded-xl text-white text-sm placeholder:text-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                    errors.password ? 'border-red-500/60' : 'border-slate-700'
                  }`}
                  {...register('password')}
                />
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="reg-confirm" className="block text-sm font-medium text-slate-300 mb-1.5">
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  id="reg-confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Nhập lại mật khẩu"
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border rounded-xl text-white text-sm placeholder:text-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                    errors.confirmPassword ? 'border-red-500/60' : 'border-slate-700'
                  }`}
                  {...register('confirmPassword')}
                />
              </div>
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{errors.confirmPassword.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Đăng ký
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center text-sm text-slate-400 mt-5">
            Đã có tài khoản?{' '}
            <Link
              to="/customer/login"
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;