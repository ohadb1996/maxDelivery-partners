import { ref, set } from 'firebase/database';
import { db } from '@/api/config/firebase.config';

interface Location {
  lat: number;
  lng: number;
  timestamp: number;
  address?: string; // Reverse geocoded address
}

let watchId: number | null = null;
let currentCourierId: string | null = null;
let currentDeliveryId: string | null = null;

/**
 * Reverse geocode coordinates to address using Nominatim (OpenStreetMap)
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Address string in Hebrew if available
 */
const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=he`,
      {
        headers: {
          'User-Agent': 'MaxDelivery Courier App'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Geocoding failed');
    }
    
    const data = await response.json();
    
    // Build address from components
    const address = data.address;
    const parts: string[] = [];
    
    // Add street and house number
    if (address.road) {
      parts.push(address.road);
      if (address.house_number) {
        parts[0] += ` ${address.house_number}`;
      }
    }
    
    // Add city/town
    if (address.city) {
      parts.push(address.city);
    } else if (address.town) {
      parts.push(address.town);
    } else if (address.village) {
      parts.push(address.village);
    }
    
    return parts.length > 0 ? parts.join(', ') : data.display_name;
  } catch (error) {
    console.error('❌ [ReverseGeocode] Error:', error);
    throw error;
  }
};

/**
 * Start tracking courier location and update Firebase
 * @param courierId - The courier's user ID
 * @param deliveryId - The active delivery ID
 */
export const startLocationTracking = (courierId: string, deliveryId: string) => {
  console.log(`📍 [LocationTracking] Starting location tracking for courier: ${courierId}, delivery: ${deliveryId}`);
  
  currentCourierId = courierId;
  currentDeliveryId = deliveryId;

  if (!navigator.geolocation) {
    console.error('❌ [LocationTracking] Geolocation not supported');
    return;
  }

  // Stop any existing tracking
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
  }

  // Watch position with high accuracy
  watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const location: Location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        timestamp: Date.now(),
      };

      // Get address from coordinates (reverse geocoding)
      try {
        const address = await reverseGeocode(location.lat, location.lng);
        location.address = address;
      } catch (error) {
        console.log('⚠️ [LocationTracking] Could not reverse geocode location');
      }

      // Update Firebase with current location
      updateLocationInFirebase(location);
    },
    (error) => {
      console.error('❌ [LocationTracking] Error getting location:', error);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000, // Cache position for max 5 seconds
    }
  );
};

/**
 * Update courier's current location in Firebase
 */
const updateLocationInFirebase = async (location: Location) => {
  if (!currentCourierId || !currentDeliveryId) return;

  try {
    // Update courier's current location
    const courierLocationRef = ref(db, `Couriers/${currentCourierId}/current_location`);
    await set(courierLocationRef, location);

    // Also update on the delivery record for quick access
    const deliveryLocationRef = ref(db, `Deliveries/${currentDeliveryId}/courier_current_location`);
    await set(deliveryLocationRef, location);

    console.log(`📍 [LocationTracking] Updated location: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
  } catch (error) {
    console.error('❌ [LocationTracking] Error updating location:', error);
  }
};

/**
 * Stop tracking courier location
 */
export const stopLocationTracking = () => {
  console.log('🛑 [LocationTracking] Stopping location tracking');
  
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  // Clear location from Firebase when stopped
  if (currentCourierId && currentDeliveryId) {
    try {
      const courierLocationRef = ref(db, `Couriers/${currentCourierId}/current_location`);
      set(courierLocationRef, null);

      const deliveryLocationRef = ref(db, `Deliveries/${currentDeliveryId}/courier_current_location`);
      set(deliveryLocationRef, null);
    } catch (error) {
      console.error('❌ [LocationTracking] Error clearing location:', error);
    }
  }

  currentCourierId = null;
  currentDeliveryId = null;
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @returns Distance in kilometers
 */
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

/**
 * Calculate estimated time of arrival
 * @param distanceKm - Distance in kilometers
 * @param averageSpeedKmh - Average speed in km/h (default: 30 km/h for city delivery)
 * @returns ETA in minutes
 */
export const calculateETA = (distanceKm: number, averageSpeedKmh: number = 30): number => {
  const hours = distanceKm / averageSpeedKmh;
  const minutes = Math.ceil(hours * 60);
  return minutes;
};

/**
 * Format ETA for display
 * @param minutes - ETA in minutes
 * @returns Formatted string like "5 דקות", "1 שעה 15 דקות"
 */
export const formatETA = (minutes: number): string => {
  if (minutes < 1) {
    return "פחות מדקה";
  } else if (minutes === 1) {
    return "דקה אחת";
  } else if (minutes < 60) {
    return `${minutes} דקות`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return hours === 1 ? "שעה אחת" : `${hours} שעות`;
    } else {
      return `${hours} שעות ${remainingMinutes} דקות`;
    }
  }
};


