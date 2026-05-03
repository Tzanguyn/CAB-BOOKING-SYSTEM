import React from 'react';
import { Wallet, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface IncomeWidgetProps {
  amount: number;
  rides: number;
}

export const IncomeWidget: React.FC<IncomeWidgetProps> = ({ amount }) => {
  const navigate = useNavigate();

  return (
    <button 
      onClick={() => navigate('/driver/earnings')}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] bg-white/90 backdrop-blur-md px-5 py-2.5 rounded-full shadow-lg border border-slate-200 flex items-center gap-3 active:scale-95 transition-transform"
    >
      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
        <Wallet className="w-4 h-4 text-emerald-600" />
      </div>
      <div className="text-left">
        <p className="text-xs text-slate-500 font-medium leading-none mb-1">Hôm nay</p>
        <p className="font-extrabold text-slate-900 leading-none">
          {amount.toLocaleString('vi-VN')}đ
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400 ml-1" />
    </button>
  );
};
