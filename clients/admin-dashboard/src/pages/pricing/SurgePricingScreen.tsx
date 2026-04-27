import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, useMapEvents } from 'react-leaflet';
import { Settings, Save, Trash2, ShieldAlert } from 'lucide-react';
import showToast from '@shared/components/Toast';

// Component to handle map clicks and draw polygon points
const MapClickHandler = ({ onAddPoint }: { onAddPoint: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onAddPoint(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const SurgePricingScreen = () => {
  const [polygonPoints, setPolygonPoints] = useState<[number, number][]>([]);
  const [multiplier, setMultiplier] = useState('1.5');
  const [reason, setReason] = useState('Giờ cao điểm / Mưa lớn');
  const [isSaving, setIsSaving] = useState(false);

  // Mock existing zones
  const [savedZones, setSavedZones] = useState([
    {
      id: '1',
      points: [[10.771, 106.698], [10.778, 106.705], [10.771, 106.711], [10.765, 106.705]] as [number, number][],
      multiplier: 1.2,
      reason: 'Khu vực trung tâm'
    }
  ]);

  const handleAddPoint = useCallback((lat: number, lng: number) => {
    setPolygonPoints(prev => [...prev, [lat, lng]]);
  }, []);

  const handleClearPoints = () => {
    setPolygonPoints([]);
  };

  const handleSaveZone = () => {
    if (polygonPoints.length < 3) {
      showToast.error('Vui lòng chọn ít nhất 3 điểm để tạo vùng');
      return;
    }
    
    setIsSaving(true);
    setTimeout(() => {
      setSavedZones(prev => [...prev, {
        id: Date.now().toString(),
        points: polygonPoints,
        multiplier: parseFloat(multiplier),
        reason
      }]);
      setPolygonPoints([]);
      setIsSaving(false);
      showToast.success('Đã lưu cấu hình giá vùng');
    }, 800);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      
      {/* Map Area */}
      <div className="flex-[2] bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center z-10 relative">
          <div>
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-500" />
              Bản đồ cấu hình Surge Pricing
            </h2>
            <p className="text-xs text-slate-500">Click trên bản đồ để tạo các điểm bao quanh vùng giá</p>
          </div>
          <button 
            onClick={handleClearPoints}
            className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            Xóa nháp
          </button>
        </div>
        
        <div className="flex-1 w-full relative z-[0]">
          <MapContainer 
            center={[10.762622, 106.660172]} 
            zoom={13} 
            className="w-full h-full cursor-crosshair"
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            
            <MapClickHandler onAddPoint={handleAddPoint} />
            
            {/* Existing Zones */}
            {savedZones.map(zone => (
              <Polygon 
                key={zone.id} 
                positions={zone.points} 
                pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.2 }} 
              />
            ))}
            
            {/* Draft Zone */}
            {polygonPoints.length > 0 && (
              <Polygon 
                positions={polygonPoints} 
                pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.4, dashArray: '5, 5' }} 
              />
            )}
            
            {/* Draw Points */}
            {polygonPoints.map((_, idx) => (
              <div 
                key={idx} 
                style={{ 
                  position: 'absolute', 
                  zIndex: 1000, 
                  pointerEvents: 'none' 
                  // In a real app we'd use Leaflet markers, but this is simpler for pure React
                }}
              />
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 overflow-y-auto">
        <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-500" />
          Thiết lập Vùng mới
        </h3>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Số điểm đã chọn</label>
            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-medium flex items-center gap-2">
              <div className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs">
                {polygonPoints.length}
              </div>
              {polygonPoints.length < 3 ? (
                <span className="text-sm text-amber-600">Cần ít nhất 3 điểm</span>
              ) : (
                <span className="text-sm text-emerald-600">Hợp lệ</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hệ số nhân giá (Surge Multiplier)</label>
            <div className="relative">
              <input 
                type="number" 
                step="0.1" 
                min="1.0"
                value={multiplier}
                onChange={e => setMultiplier(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 pl-4 pr-12 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
              />
              <span className="absolute right-4 top-3 text-slate-400 font-bold">x</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">VD: 1.5x nghĩa là giá tăng 50%</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Lý do / Sự kiện</label>
            <input 
              type="text" 
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
              placeholder="VD: Mưa lớn, Giờ tan tầm..."
            />
          </div>

          <button 
            onClick={handleSaveZone}
            disabled={polygonPoints.length < 3 || isSaving}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors flex justify-center items-center gap-2 mt-4"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                Lưu cấu hình
              </>
            )}
          </button>
        </div>

        <hr className="my-8 border-slate-100" />

        <h3 className="font-bold text-slate-800 mb-4">Các vùng đang hiệu lực ({savedZones.length})</h3>
        <div className="space-y-3">
          {savedZones.map(zone => (
            <div key={zone.id} className="border border-slate-200 rounded-xl p-4 flex justify-between items-center bg-slate-50">
              <div>
                <p className="font-bold text-slate-800">{zone.reason}</p>
                <p className="text-xs text-slate-500">Khu vực {zone.points.length} điểm</p>
              </div>
              <div className="bg-red-100 text-red-700 px-3 py-1 rounded-lg font-bold text-sm">
                {zone.multiplier}x
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SurgePricingScreen;
