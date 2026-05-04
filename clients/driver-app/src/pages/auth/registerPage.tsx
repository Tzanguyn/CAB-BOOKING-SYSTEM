import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, User, Phone, ArrowRight, Truck } from 'lucide-react';
import { registerSchema, type RegisterFormData } from '@shared/types/auth.schemas';
import { useAuth } from '@shared/contexts/AuthContext';

const DriverRegisterPage = () => {
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
      email: '', password: '', confirmPassword: '',
      firstName: '', lastName: '', phone: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    try {
      await authRegister({
        email: data.email, password: data.password,
        firstName: data.firstName, lastName: data.lastName,
        phone: data.phone, role: 'driver',
      });
      navigate('/driver/login');
    } catch {
      // handled by toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-gray-900 to-emerald-950 relative overflow-hidden p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/30">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Đăng ký Tài xế</h1>
          <p className="text-slate-400 mt-1 text-sm">Tham gia đội ngũ tài xế CAB</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-7 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="drv-firstName" className="block text-sm font-medium text-slate-300 mb-1.5">Họ</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input id="drv-firstName" type="text" placeholder="Nguyễn"
                    className={`w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${errors.firstName ? 'border-red-500/60' : 'border-slate-700'}`}
                    {...register('firstName')} />
                </div>
                {errors.firstName && <p className="mt-1 text-xs text-red-400">{errors.firstName.message}</p>}
              </div>
              <div>
                <label htmlFor="drv-lastName" className="block text-sm font-medium text-slate-300 mb-1.5">Tên</label>
                <input id="drv-lastName" type="text" placeholder="Văn A"
                  className={`w-full px-3 py-2.5 bg-slate-800/80 border rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${errors.lastName ? 'border-red-500/60' : 'border-slate-700'}`}
                  {...register('lastName')} />
                {errors.lastName && <p className="mt-1 text-xs text-red-400">{errors.lastName.message}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="drv-email" className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input id="drv-email" type="email" placeholder="driver@example.com"
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${errors.email ? 'border-red-500/60' : 'border-slate-700'}`}
                  {...register('email')} />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="drv-phone" className="block text-sm font-medium text-slate-300 mb-1.5">Số điện thoại</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input id="drv-phone" type="tel" placeholder="0912345678"
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${errors.phone ? 'border-red-500/60' : 'border-slate-700'}`}
                  {...register('phone')} />
              </div>
              {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone.message}</p>}
            </div>

            <div>
              <label htmlFor="drv-password" className="block text-sm font-medium text-slate-300 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input id="drv-password" type="password" placeholder="Ít nhất 8 ký tự"
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${errors.password ? 'border-red-500/60' : 'border-slate-700'}`}
                  {...register('password')} />
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <div>
              <label htmlFor="drv-confirm" className="block text-sm font-medium text-slate-300 mb-1.5">Xác nhận mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input id="drv-confirm" type="password" placeholder="Nhập lại mật khẩu"
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${errors.confirmPassword ? 'border-red-500/60' : 'border-slate-700'}`}
                  {...register('confirmPassword')} />
              </div>
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{errors.confirmPassword.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
              {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><span>Đăng ký</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-5">
            Đã có tài khoản?{' '}
            <Link to="/driver/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DriverRegisterPage;
