import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, CreditCard, ArrowRight, ChevronRight } from 'lucide-react';

const slides = [
  {
    icon: MapPin,
    title: 'Đặt xe dễ dàng',
    description: 'Chọn điểm đón và điểm đến, hệ thống tự động tìm tài xế gần nhất cho bạn.',
    gradient: 'from-indigo-500 to-blue-600',
    shadowColor: 'shadow-indigo-500/30',
    bgGlow: 'bg-indigo-500/8',
  },
  {
    icon: Navigation,
    title: 'Theo dõi realtime',
    description: 'Xem vị trí tài xế trực tiếp trên bản đồ, biết chính xác thời gian đến.',
    gradient: 'from-emerald-500 to-teal-600',
    shadowColor: 'shadow-emerald-500/30',
    bgGlow: 'bg-emerald-500/8',
  },
  {
    icon: CreditCard,
    title: 'Thanh toán tiện lợi',
    description: 'Hỗ trợ nhiều phương thức: tiền mặt, thẻ, ví điện tử. An toàn & nhanh chóng.',
    gradient: 'from-violet-500 to-purple-600',
    shadowColor: 'shadow-violet-500/30',
    bgGlow: 'bg-violet-500/8',
  },
];

const OnboardingPage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();
  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;
  const Icon = slide.icon;

  const handleNext = () => {
    if (isLastSlide) {
      localStorage.setItem('onboarded', 'true');
      navigate('/customer/login');
    } else {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('onboarded', 'true');
    navigate('/customer/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] ${slide.bgGlow} rounded-full blur-3xl transition-all duration-700`} />
      </div>

      {/* Skip button */}
      <div className="flex justify-end p-6 relative z-10">
        <button
          onClick={handleSkip}
          className="text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          Bỏ qua
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
        <div key={currentSlide} className="animate-fade-in text-center max-w-sm">
          {/* Icon */}
          <div className={`w-24 h-24 bg-gradient-to-br ${slide.gradient} rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl ${slide.shadowColor} transform hover:scale-105 transition-transform duration-300`}>
            <Icon className="w-12 h-12 text-white" />
          </div>

          {/* Text */}
          <h2 className="text-3xl font-bold text-white mb-4">{slide.title}</h2>
          <p className="text-slate-400 text-base leading-relaxed">{slide.description}</p>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="px-8 pb-12 relative z-10">
        {/* Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                index === currentSlide
                  ? 'w-8 bg-indigo-500'
                  : 'w-2 bg-slate-600 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>

        {/* Next / Get Started button */}
        <button
          onClick={handleNext}
          className={`w-full py-4 px-6 rounded-xl font-semibold text-white shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer ${
            isLastSlide
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-500/25'
              : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'
          }`}
        >
          {isLastSlide ? (
            <>
              Bắt đầu ngay
              <ArrowRight className="w-5 h-5" />
            </>
          ) : (
            <>
              Tiếp theo
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default OnboardingPage;
