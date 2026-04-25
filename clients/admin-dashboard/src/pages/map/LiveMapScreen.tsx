import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Car, MapPin, RefreshCw } from 'lucide-react';

const createCarIcon = (status: 'idle' | 'in_progress') => L.divIcon({
  html: `
    <div class="relative w-10 h-10 flex items-center justify-center">
      <div class="absolute inset-0 bg-${status === 'idle' ? 'emerald' : 'indigo'}-500 opacity-20 rounded-full animate-ping"></div>
      <div class="relative w-8 h-8 bg-white rounded-full border-2 border-${status === 'idle' ? 'emerald' : 'indigo'}-500 shadow-md flex items-center justify-center text-sm">
        🚕
      </div>
    </div>
  `,
  className: 'custom-marker-icon',
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

// Mock active drivers
const mockDrivers = [
  { id: '1', name: 'Nguyễn Văn A', lat: 10.762622, lng: 106.660172, status: 'idle', vehicle: 'CAB Economy - 51F-12345' },
  { id: '2', name: 'Trần Văn C', lat: 10.771234, lng: 106.671234, status: 'in_progress', vehicle: 'CAB Standard - 51H-67890', customer: 'Lê Thị B' },
  { id: '3', name: 'Hoàng Văn E', lat: 10.751234, lng: 106.651234, status: 'idle', vehicle: 'CAB SUV - 51A-11111' },
];

const LiveMapScreen = () => {
  const [drivers, setDrivers] = useState(mockDrivers);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate fetching new locations
    setTimeout(() => {
      setDrivers(drivers.map(d => ({
        ...d,
        lat: d.lat + (Math.random() - 0.5) * 0.01,
        lng: d.lng + (Math.random() - 0.5) * 0.01,
      })));
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <div className="h-[calc(100vh-8rem)] w-full relative bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
      
      {/* Top Bar Overlay */}
      <div className="absolute top-4 left-4 right-4 z-[400] flex justify-between items-start pointer-events-none">
        <div className="bg-white/90 backdrop-blur px-4 py-3 rounded-xl shadow-lg pointer-events-auto flex items-center gap-4">
          <div>
            <p className="text-xs text-slate-500 font-medium">Tài xế Online</p>
            <p className="text-lg font-bold text-slate-800">{drivers.length}</p>
          </div>
          <div className="w-px h-8 bg-slate-200"></div>
          <div className="flex gap-3">
            <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div> Rảnh (2)
            </div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-indigo-600">
              <div className="w-3 h-3 rounded-full bg-indigo-500"></div> Đang chở (1)
            </div>
          </div>
        </div>
        
        <button 
          onClick={handleRefresh}
          className="bg-white/90 backdrop-blur w-12 h-12 rounded-xl shadow-lg pointer-events-auto flex items-center justify-center hover:bg-white transition-colors"
        >
          <RefreshCw className={`w-5 h-5 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 w-full relative z-[0]">
        <MapContainer 
          center={[10.762622, 106.660172]} 
          zoom={13} 
          zoomControl={false}
          className="w-full h-full"
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          
          {drivers.map(driver => (
            <Marker 
              key={driver.id} 
              position={[driver.lat, driver.lng]} 
              icon={createCarIcon(driver.status as any)}
            >
              <Popup className="custom-popup">
                <div className="p-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                      <Car className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 m-0 leading-tight">{driver.name}</h4>
                      <p className="text-xs text-slate-500 m-0">{driver.vehicle}</p>
                    </div>
                  </div>
                  
                  <div className={`text-xs font-medium px-2 py-1 rounded inline-block mb-2 ${
                    driver.status === 'idle' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {driver.status === 'idle' ? 'Đang rảnh' : 'Đang chở khách'}
                  </div>
                  
                  {driver.customer && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 border-t border-slate-100 pt-2 mt-1">
                      <MapPin className="w-3 h-3" />
                      Khách: {driver.customer}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default LiveMapScreen;
