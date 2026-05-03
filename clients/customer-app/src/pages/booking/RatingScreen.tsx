import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookingStore } from '../../store/bookingStore';
import { User, ThumbsUp, Sparkles, MessageCircle } from 'lucide-react';
import showToast from '@shared/components/Toast';

const quickTags = [
  { label: 'Sạch sẽ', icon: '✨' },
  { label: 'Đúng giờ', icon: '⏰' },
  { label: 'Lịch sự', icon: '🤝' },
  { label: 'An toàn', icon: '🛡️' },
  { label: 'Biết đường', icon: '🗺️' },
  { label: 'Thân thiện', icon: '😊' },
];

const tips = [10000, 20000, 50000];

const RatingScreen = () => {
  const navigate = useNavigate();
  const { driver, estimatedPrice, distanceKm, resetBooking } = useBookingStore();
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTip, setSelectedTip] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setShowSuccess(true);
      setTimeout(() => {
        showToast.success('Cảm ơn bạn đã đánh giá!');
        resetBooking();
        navigate('/customer/home');
      }, 2000);
    } catch (error) {
      showToast.error('Có lỗi xảy ra');
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    resetBooking();
    navigate('/customer/home');
  };

  const getRatingText = () => {
    const texts: Record<number, string> = {
      1: 'Rất tệ 😞',
      2: 'Không hài lòng 😕',
      3: 'Bình thường 😐',
      4: 'Tốt 😊',
      5: 'Tuyệt vời! 🤩',
    };
    return texts[hoveredRating || rating] || '';
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center animate-fade-in-scale">
          <div className="w-24 h-24 gradient-success rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30 animate-bounce-in">
            <ThumbsUp className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Cảm ơn bạn!</h2>
          <p className="text-slate-500 text-sm">Đánh giá của bạn giúp cải thiện dịch vụ</p>
          
          {/* Confetti dots */}
          <div className="relative mt-8">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'][i],
                  left: `${20 + Math.random() * 60}%`,
                  animation: `confetti-fall ${1 + Math.random()}s ease-out ${Math.random() * 0.5}s forwards`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ── Header ── */}
      <div className="text-center pt-10 pb-6 px-6">
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Chuyến đi hoàn tất
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Đánh giá chuyến đi</h1>
        <p className="text-slate-500 text-sm">Bạn thấy tài xế phục vụ như thế nào?</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-8 hide-scrollbar">
        {/* ── Driver Card ── */}
        <div className="card-elevated p-5 flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
            <User className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">{driver?.name || 'Nguyễn Văn A'}</h2>
          <p className="text-sm text-slate-400 mt-1">{driver?.vehicle?.plateNumber || '51G-123.45'} • {driver?.vehicle?.model || 'Toyota Vios'}</p>
          
          {/* Trip Summary */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 w-full justify-center">
            <div className="text-center">
              <p className="text-xs text-slate-400">Quãng đường</p>
              <p className="text-sm font-bold text-slate-700">{distanceKm?.toFixed(1) || '0.0'} km</p>
            </div>
            <div className="w-[1px] h-8 bg-slate-100"></div>
            <div className="text-center">
              <p className="text-xs text-slate-400">Giá cước</p>
              <p className="text-sm font-bold text-slate-700">{(estimatedPrice || 0).toLocaleString('vi-VN')}₫</p>
            </div>
          </div>
          
          {/* ── Star Rating ── */}
          <div className="mt-6">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="p-0.5 transition-transform hover:scale-125 focus:outline-none touch-bounce"
                >
                  <svg
                    className={`w-11 h-11 transition-all duration-200 ${
                      star <= (hoveredRating || rating) 
                        ? 'fill-amber-400 text-amber-400 drop-shadow-sm' 
                        : 'fill-slate-100 text-slate-200'
                    }`}
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
              ))}
            </div>
            <p className="text-sm font-semibold text-slate-600 mt-2 h-5 animate-fade-in">{getRatingText()}</p>
          </div>
        </div>

        {/* ── Quick Tags ── */}
        <div className="mb-6">
          <p className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
            <MessageCircle className="w-4 h-4 text-indigo-500" />
            Nhận xét nhanh
          </p>
          <div className="flex flex-wrap gap-2">
            {quickTags.map((tag) => (
              <button
                key={tag.label}
                onClick={() => toggleTag(tag.label)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all touch-bounce ${
                  selectedTags.includes(tag.label)
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300'
                    : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:border-slate-200'
                }`}
              >
                <span>{tag.icon}</span>
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tip Section ── */}
        <div className="mb-6">
          <p className="text-sm font-bold text-slate-800 mb-3">💰 Tip cho tài xế (tùy chọn)</p>
          <div className="flex gap-2.5">
            {tips.map((tip) => (
              <button
                key={tip}
                onClick={() => setSelectedTip(selectedTip === tip ? null : tip)}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all touch-bounce ${
                  selectedTip === tip 
                    ? 'gradient-primary text-white shadow-lg shadow-indigo-500/20' 
                    : 'bg-slate-50 text-slate-600 border-2 border-slate-100 hover:border-indigo-200'
                }`}
              >
                {(tip / 1000)}k
              </button>
            ))}
          </div>
        </div>

        {/* ── Feedback Textarea ── */}
        <div className="mb-8">
          <p className="text-sm font-bold text-slate-800 mb-3">📝 Nhận xét thêm</p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Chia sẻ trải nghiệm của bạn..."
            className="w-full h-24 p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 focus:border-indigo-500 focus:bg-white focus:ring-0 resize-none transition-all text-sm placeholder:text-slate-400"
          />
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl transition-colors touch-bounce"
          >
            Bỏ qua
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-[2] py-4 gradient-primary hover:opacity-90 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all flex justify-center items-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Gửi đánh giá'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RatingScreen;
