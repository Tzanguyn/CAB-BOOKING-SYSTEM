import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, MapPin, Navigation } from 'lucide-react';

interface VoiceNavWidgetProps {
  destinationAddress: string;
  distanceLeft?: string;
  etaMinutes?: number;
  isPickingUp?: boolean;
}

export const VoiceNavWidget: React.FC<VoiceNavWidgetProps> = ({ 
  destinationAddress, 
  distanceLeft = '1.2 km', 
  etaMinutes = 3,
  isPickingUp = true
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [instruction, setInstruction] = useState('Đi thẳng 200m');
  const [showWave, setShowWave] = useState(false);

  // Simulate changing navigation instructions
  useEffect(() => {
    const instructions = [
      'Đi thẳng 200m',
      'Rẽ trái vào Lê Lợi',
      'Giữ làn trái',
      'Rẽ phải vào Nguyễn Huệ',
      'Điểm đến ở bên phải bạn'
    ];
    let idx = 0;
    
    const interval = setInterval(() => {
      idx = (idx + 1) % instructions.length;
      setInstruction(instructions[idx]);
      
      // Simulate voice speaking wave
      if (!isMuted) {
        setShowWave(true);
        setTimeout(() => setShowWave(false), 2000);
      }
    }, 8000); // Change instruction every 8 seconds

    return () => clearInterval(interval);
  }, [isMuted]);

  return (
    <div className="absolute top-4 left-4 right-4 z-[500] pointer-events-auto">
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700 shadow-2xl rounded-3xl p-4 flex items-center gap-4">
        
        {/* Direction Icon */}
        <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
          <Navigation className="w-8 h-8 text-white rotate-45" />
        </div>

        {/* Text Instructions */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-extrabold text-lg truncate">
              {instruction}
            </span>
            {showWave && (
              <div className="flex items-center gap-1">
                <div className="w-1 h-3 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-4 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                <div className="w-1 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
              </div>
            )}
          </div>
          
          <div className="flex items-center text-slate-400 text-sm gap-2">
            <span className="font-bold text-indigo-400">{distanceLeft}</span>
            <span className="w-1 h-1 bg-slate-600 rounded-full" />
            <span>{etaMinutes} phút</span>
            <span className="w-1 h-1 bg-slate-600 rounded-full" />
            <div className="flex items-center gap-1 truncate max-w-[150px]">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{destinationAddress}</span>
            </div>
          </div>
        </div>

        {/* Voice Toggle */}
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
            isMuted ? 'bg-slate-800 text-slate-500' : 'bg-emerald-500/20 text-emerald-400'
          }`}
        >
          {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
        </button>
      </div>
      
      {/* Label showing phase */}
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
        {isPickingUp ? 'ĐANG ĐÓN KHÁCH' : 'ĐANG CHỞ KHÁCH'}
      </div>
    </div>
  );
};
