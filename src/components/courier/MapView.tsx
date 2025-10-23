import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Delivery, VehicleType } from '@/types';
import { geocodeAddressWithCache, getRoute, decodePolyline, LatLng } from '@/services/geocodingService';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const createCustomIcon = (color: string, icon: string = '📦') => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    ">${icon}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

const pickupIcon = createCustomIcon('#3b82f6', '🏪');
const deliveryIcon = createCustomIcon('#f59e0b', '📦');
const courierIcon = createCustomIcon('#10b981', '🚴');

// Component to update map view when route changes
function MapUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

interface MapViewProps {
  deliveries: Delivery[];
  isAvailable: boolean;
  onDeliveryClick: (delivery: Delivery) => void;
  selectedDelivery: Delivery | null;
  courierVehicleType: VehicleType;
}

export default function MapView({ 
  selectedDelivery,
  courierVehicleType 
}: MapViewProps) {
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [pickupLocation, setPickupLocation] = useState<LatLng | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState<LatLng | null>(null);
  const [routeToPickupPolyline, setRouteToPickupPolyline] = useState<LatLng[]>([]);
  const [routeToDeliveryPolyline, setRouteToDeliveryPolyline] = useState<LatLng[]>([]);
  const [routeToPickupInfo, setRouteToPickupInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [routeToDeliveryInfo, setRouteToDeliveryInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          // Default to Tel Aviv if location access denied
          setUserLocation({ lat: 32.0853, lng: 34.7818 });
        }
      );
    } else {
      // Default to Tel Aviv
      setUserLocation({ lat: 32.0853, lng: 34.7818 });
    }
  }, []);

  // Load routes when selected delivery changes
  useEffect(() => {
    if (!selectedDelivery || !userLocation) {
      setPickupLocation(null);
      setDeliveryLocation(null);
      setRouteToPickupPolyline([]);
      setRouteToDeliveryPolyline([]);
      setRouteToPickupInfo(null);
      setRouteToDeliveryInfo(null);
      return;
    }

    const loadRoutes = async () => {
      console.log(`🗺️ [MapView] Loading routes for delivery ${selectedDelivery.id}`);
      setIsLoadingRoute(true);

      try {
        // Geocode pickup and delivery addresses
        const [pickup, delivery] = await Promise.all([
          geocodeAddressWithCache(selectedDelivery.pickup_address),
          geocodeAddressWithCache(selectedDelivery.delivery_address)
        ]);
        
        if (!pickup) {
          console.error('[MapView] Failed to geocode pickup address');
          setIsLoadingRoute(false);
          return;
        }

        if (!delivery) {
          console.error('[MapView] Failed to geocode delivery address');
          setIsLoadingRoute(false);
          return;
        }

        setPickupLocation(pickup);
        setDeliveryLocation(delivery);

        // Get both routes in parallel
        const [routeToPickup, routeToDelivery] = await Promise.all([
          getRoute(userLocation, pickup, courierVehicleType),
          getRoute(pickup, delivery, courierVehicleType)
        ]);
        
        // Handle route to pickup
        if (routeToPickup) {
          const decodedPolyline = decodePolyline(routeToPickup.polyline);
          setRouteToPickupPolyline(decodedPolyline);
          setRouteToPickupInfo({
            distance: routeToPickup.distance,
            duration: routeToPickup.duration
          });
          console.log(`✅ [MapView] Route to pickup loaded: ${routeToPickup.distance}, ${routeToPickup.duration}`);
        } else {
          console.warn('[MapView] Failed to get route to pickup');
          setRouteToPickupPolyline([]);
          setRouteToPickupInfo(null);
        }

        // Handle route to delivery
        if (routeToDelivery) {
          const decodedPolyline = decodePolyline(routeToDelivery.polyline);
          setRouteToDeliveryPolyline(decodedPolyline);
          setRouteToDeliveryInfo({
            distance: routeToDelivery.distance,
            duration: routeToDelivery.duration
          });
          console.log(`✅ [MapView] Route to delivery loaded: ${routeToDelivery.distance}, ${routeToDelivery.duration}`);
        } else {
          console.warn('[MapView] Failed to get route to delivery');
          setRouteToDeliveryPolyline([]);
          setRouteToDeliveryInfo(null);
        }
      } catch (error) {
        console.error('[MapView] Error loading routes:', error);
      } finally {
        setIsLoadingRoute(false);
      }
    };

    loadRoutes();
  }, [selectedDelivery, userLocation, courierVehicleType]);

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

  // Calculate map center and zoom
  const getMapCenterAndZoom = (): { center: [number, number]; zoom: number } => {
    if (pickupLocation && deliveryLocation && userLocation) {
      // Center between all three points
      const centerLat = (userLocation.lat + pickupLocation.lat + deliveryLocation.lat) / 3;
      const centerLng = (userLocation.lng + pickupLocation.lng + deliveryLocation.lng) / 3;
      return { center: [centerLat, centerLng], zoom: 12 };
    }
    if (pickupLocation && userLocation) {
      // Center between courier and pickup
      const centerLat = (userLocation.lat + pickupLocation.lat) / 2;
      const centerLng = (userLocation.lng + pickupLocation.lng) / 2;
      return { center: [centerLat, centerLng], zoom: 13 };
    }
    if (userLocation) {
      return { center: [userLocation.lat, userLocation.lng], zoom: 14 };
    }
    return { center: [32.0853, 34.7818], zoom: 14 };
  };

  const mapSettings = getMapCenterAndZoom();

  return (
    <div className="h-full w-full relative" style={{ pointerEvents: 'auto' }}>
      {isLoadingRoute && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">טוען מסלולים...</span>
        </div>
      )}


      <MapContainer
        center={mapSettings.center}
        zoom={mapSettings.zoom}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        className="map-container"
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
        touchZoom={true}
        boxZoom={true}
        keyboard={true}
        attributionControl={false}
        preferCanvas={false}
      >
        <MapUpdater center={mapSettings.center} zoom={mapSettings.zoom} />
        
        {/* Dark mode tiles with light labels for better visibility */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains={['a', 'b', 'c', 'd']}
          zIndex={2}
        />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains={['a', 'b', 'c', 'd']}
          zIndex={1}
        />
        
        {/* Courier location marker */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={courierIcon}>
            <Popup>
              <div className="text-center">
                <p className="font-semibold">המיקום שלך</p>
                <p className="text-sm text-gray-600">🚴 השליח</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Pickup location marker */}
        {pickupLocation && selectedDelivery && (
          <Marker position={[pickupLocation.lat, pickupLocation.lng]} icon={pickupIcon}>
            <Popup>
              <div className="text-right min-w-[200px]">
                <p className="font-semibold text-lg mb-2">🏪 נקודת איסוף</p>
                <p className="text-sm text-gray-600 mb-1">{selectedDelivery.customer_name}</p>
                <p className="text-xs text-gray-500">{selectedDelivery.pickup_address}</p>
                {routeToPickupInfo && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="text-xs text-gray-600">
                      <div>מרחק: {routeToPickupInfo.distance}</div>
                      <div>זמן הגעה: {routeToPickupInfo.duration}</div>
                    </div>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Delivery location marker */}
        {deliveryLocation && selectedDelivery && (
          <Marker position={[deliveryLocation.lat, deliveryLocation.lng]} icon={deliveryIcon}>
            <Popup>
              <div className="text-right min-w-[200px]">
                <p className="font-semibold text-lg mb-2">📦 יעד המשלוח</p>
                <p className="text-sm text-gray-600 mb-1">{selectedDelivery.customer_name}</p>
                <p className="text-xs text-gray-500">{selectedDelivery.delivery_address}</p>
                {routeToDeliveryInfo && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="text-xs text-gray-600">
                      <div>מרחק: {routeToDeliveryInfo.distance}</div>
                      <div>זמן הגעה: {routeToDeliveryInfo.duration}</div>
                    </div>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route to pickup (blue) */}
        {routeToPickupPolyline.length > 0 && (
          <Polyline
            positions={routeToPickupPolyline.map(p => [p.lat, p.lng])}
            color="#3b82f6"
            weight={4}
            opacity={0.8}
          />
        )}

        {/* Route to delivery (bright green) */}
        {routeToDeliveryPolyline.length > 0 && (
          <Polyline
            positions={routeToDeliveryPolyline.map(p => [p.lat, p.lng])}
            color="#00ff88"
            weight={4}
            opacity={0.8}
          />
        )}
      </MapContainer>
    </div>
  );
}
