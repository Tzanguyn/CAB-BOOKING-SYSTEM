import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookingStore } from '../../store/bookingStore';
import { Star, User } from 'lucide-react';
import showToast from '@shared/components/Toast';

const RatingScreen = () => {
  const navigate = useNavigate();
  const { driver, resetBooking } = useBookingStore();
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tips = [10000, 20000, 50000];
  const [selectedTip, setSelectedTip] = useState<number | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Simulate API call to Review Service
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showToast.success('Cảm ơn bạn đã đánh giá!');
      resetBooking();
      navigate('/customer/home');
    } catch (error) {
      showToast.error('Có lỗi xảy ra');
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    resetBooking();
    navigate('/customer/home');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pt-12 px-6">
      
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Chuyến đi hoàn tất!</h1>
      <p className="text-slate-500 mb-8">Bạn thấy tài xế phục vụ như thế nào?</p>

      {/* Driver Info */}
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl shadow-slate-200/50 p-6 flex flex-col items-center text-center mb-8">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
          <User className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">{driver?.name || 'Nguyễn Văn A'}</h2>
        <p className="text-sm text-slate-500 mt-1">{driver?.vehicle?.plateNumber || '51G-123.45'}</p>
        
        {/* Star Rating */}
        <div className="flex items-center gap-2 mt-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              onClick={() => setRating(star)}
              className="p-1 transition-transform hover:scale-110 focus:outline-none"
            >
              <Star 
                className={`w-10 h-10 transition-colors ${
                  star <= (hoveredRating || rating) 
                    ? 'fill-amber-400 text-amber-400' 
                    : 'fill-slate-100 text-slate-200'
                }`} 
              />
            </button>
          ))}
        </div>
      </div>

      <div className="w-full max-w-sm">
        {/* Tip section */}
        <div className="mb-6">
          <p className="text-sm font-medium text-slate-700 mb-3 text-center">Tặng tiền boa cho tài xế (Tùy chọn)</p>
          <div className="flex gap-3">
            {tips.map((tip) => (
              <button
                key={tip}
                onClick={() => setSelectedTip(selectedTip === tip ? null : tip)}
                className={`flex-1 py-2 rounded-xl border-2 font-medium transition-all ${
                  selectedTip === tip 
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {(tip / 1000).toLocaleString('vi-VN')}k
              </button>
            ))}
          </div>
        </div>

        {/* Feedback Textarea */}
        <div className="mb-8">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Để lại nhận xét cho tài xế..."
            className="w-full h-24 p-4 rounded-xl border-2 border-slate-200 bg-white focus:border-indigo-500 focus:ring-0 resize-none transition-colors"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 py-4 text-slate-500 font-medium hover:bg-slate-100 rounded-xl transition-colors"
          >
            Bỏ qua
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all flex justify-center items-center gap-2"
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
