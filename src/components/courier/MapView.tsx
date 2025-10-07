import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Delivery } from '@/types';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different delivery types
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      font-weight: bold;
    ">₪</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

interface MapViewProps {
  deliveries: Delivery[];
  isAvailable: boolean;
  onDeliveryClick: (delivery: Delivery) => void;
}

export default function MapView({ deliveries, isAvailable, onDeliveryClick }: MapViewProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        () => {
          // Default to Tel Aviv if location access denied
          setUserLocation([32.0853, 34.7818]);
        }
      );
    } else {
      // Default to Tel Aviv
      setUserLocation([32.0853, 34.7818]);
    }
  }, []);

  // Mock coordinates for deliveries (in real app, these would come from the delivery data)
  const deliveryCoordinates: { [key: string]: [number, number] } = {
    '1': [32.0853, 34.7818], // Tel Aviv center
    '2': [32.0753, 34.7718], // Tel Aviv south
    '3': [32.0953, 34.7918], // Tel Aviv north
  };

  if (!userLocation) {
    return (
      <div className="h-full bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-600">טוען מפה...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={userLocation}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
      >
        {/* Use Google Maps style tiles for better UX */}
        <TileLayer
          url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          attribution='&copy; Google Maps'
        />
        
        {/* User location marker */}
        <Marker position={userLocation}>
          <Popup>
            <div className="text-center">
              <p className="font-semibold">מיקום שלך</p>
              <p className="text-sm text-gray-600">אתה כאן</p>
            </div>
          </Popup>
        </Marker>

        {/* Delivery markers - only show if user is available */}
        {isAvailable && deliveries.map((delivery) => {
          const coords = deliveryCoordinates[delivery.id];
          if (!coords) return null;

          const iconColor = (delivery.payment_amount || 0) > 30 ? '#10b981' : (delivery.payment_amount || 0) > 20 ? '#f59e0b' : '#3b82f6';

          return (
            <Marker key={delivery.id} position={coords} icon={createCustomIcon(iconColor)}>
              <Popup>
                <div className="text-right min-w-[200px]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-lg">{delivery.order_number}</p>
                    <span className="text-lg font-bold text-green-600">₪{delivery.payment_amount}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{delivery.package_description}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                    <span>📍 {delivery.estimated_distance}</span>
                    <span>⏱️ {delivery.estimated_duration}</span>
                  </div>
                  <button
                    onClick={() => onDeliveryClick(delivery)}
                    className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    צפה בפרטים מלאים
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      
    </div>
  );
}
