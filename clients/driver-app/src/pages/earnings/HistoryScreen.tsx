import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { driverApiService } from '../../services/driverService';

const HistoryScreen = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await driverApiService.getEarnings('week'); // we use getEarnings to fetch history for now
        setHistory(res.history || []);
      } catch (error) {
        console.error('Failed to fetch history', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 px-4 pt-6 pb-6 shadow-md z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <h1 className="text-xl font-bold text-white">Lịch sử chuyến đi</h1>
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 p-4 overflow-y-auto">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="w-full h-32 bg-slate-200 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : history.length > 0 ? (
          <div className="space-y-4">
            {history.map((item: any) => (
              <div key={item.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-[40px] flex items-start justify-end p-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(item.date).toLocaleDateString('vi-VN')}</span>
                    <span>•</span>
                    <span>{new Date(item.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800">{item.amount.toLocaleString('vi-VN')}đ</h3>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center mt-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <div className="w-0.5 h-8 bg-slate-200 my-1" />
                    <div className="w-2.5 h-2.5 rounded-none bg-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800 mb-4 line-clamp-1">{item.pickup}</p>
                    <p className="text-sm font-medium text-slate-800 line-clamp-1">{item.dropoff}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <MapPin className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">Chưa có chuyến đi nào</h3>
            <p className="text-slate-500">Bạn chưa hoàn thành chuyến đi nào. Hãy bắt đầu nhận chuyến ngay!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryScreen;
