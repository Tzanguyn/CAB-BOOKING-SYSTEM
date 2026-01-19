import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface MapProps {
  center?: Location;
  zoom?: number;
  onLocationSelect?: (location: Location) => void;
  markers?: Location[];
  className?: string;
  height?: string;
}

const LocationSelector: React.FC<{ onLocationSelect: (location: Location) => void }> = ({
  onLocationSelect
}) => {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onLocationSelect({ lat, lng });
    },
  });

  return null;
};

export const Map: React.FC<MapProps> = ({
  center = { lat: 10.762622, lng: 106.660172 }, // Default to Ho Chi Minh City
  zoom = 13,
  onLocationSelect,
  markers = [],
  className = '',
  height = '400px'
}) => {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    if (onLocationSelect) {
      onLocationSelect(location);
    }
  };

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {onLocationSelect && (
          <LocationSelector onLocationSelect={handleLocationSelect} />
        )}

        {/* Selected location marker */}
        {selectedLocation && (
          <Marker position={[selectedLocation.lat, selectedLocation.lng]}>
            <Popup>
              <div className="text-center">
                <p className="font-semibold">Selected Location</p>
                <p className="text-sm text-gray-600">
                  {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Additional markers */}
        {markers.map((marker, index) => (
          <Marker key={index} position={[marker.lat, marker.lng]}>
            <Popup>
              <div className="text-center">
                <p className="font-semibold">{marker.address || 'Location'}</p>
                <p className="text-sm text-gray-600">
                  {marker.lat.toFixed(6)}, {marker.lng.toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {onLocationSelect && (
        <div className="absolute top-2 left-2 bg-white p-2 rounded shadow-md z-[1000]">
          <p className="text-sm text-gray-600">Click on the map to select location</p>
        </div>
      )}
    </div>
  );
};

export default Map;