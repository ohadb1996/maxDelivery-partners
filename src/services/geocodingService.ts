import { VehicleType } from '@/types';

// הגדרת סוגי המסלול לפי סוג רכב
// const TRAVEL_MODE_MAP: Record<VehicleType, string> = {
//   bike: 'bicycling',
//   motorcycle: 'driving', // אופנוע נחשב כנהיגה
//   car: 'driving',
//   truck: 'driving'
// };

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteData {
  pickupLocation: LatLng;
  polyline: string; // encoded polyline from Google
  distance: string;
  duration: string;
}

/**
 * המרת כתובת למיקום (Geocoding)
 */
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  try {
    // שימוש ב-Nominatim (OpenStreetMap) - חינמי וללא API key
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(address + ', Israel')}` +
      `&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'MaxDelivery Courier App'
        }
      }
    );

    if (!response.ok) {
      console.error('[Geocoding] Failed to fetch:', response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      const location = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
      console.log(`✅ [Geocoding] Found location for "${address}":`, location);
      return location;
    }

    console.warn(`⚠️ [Geocoding] No results for address: "${address}"`);
    return null;
  } catch (error) {
    console.error('[Geocoding] Error:', error);
    return null;
  }
}

/**
 * קבלת מסלול מנקודת התחלה לנקודת סיום
 * משתמש ב-OpenRouteService API (חינמי, צריך רישום)
 */
export async function getRoute(
  from: LatLng,
  to: LatLng,
  vehicleType: VehicleType
): Promise<RouteData | null> {
  try {
    // נשתמש ב-OSRM (Open Source Routing Machine) - חינמי לחלוטין
    // זה רק לנהיגה/אופניים, אבל זה מספיק לצרכים שלנו
    
    const profile = vehicleType === 'bike' ? 'bike' : 'car';
    
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/${profile}/` +
      `${from.lng},${from.lat};${to.lng},${to.lat}` +
      `?overview=full&geometries=polyline&steps=true`
    );

    if (!response.ok) {
      console.error('[Route] Failed to fetch:', response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      
      const routeData: RouteData = {
        pickupLocation: to,
        polyline: route.geometry, // encoded polyline
        distance: formatDistance(route.distance),
        duration: formatDuration(route.duration)
      };
      
      console.log(`✅ [Route] Got route:`, routeData);
      return routeData;
    }

    console.warn(`⚠️ [Route] No route found`);
    return null;
  } catch (error) {
    console.error('[Route] Error:', error);
    return null;
  }
}

/**
 * פענוח polyline מקודד (Google format)
 */
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({
      lat: lat / 1e5,
      lng: lng / 1e5
    });
  }

  return points;
}

/**
 * עיצוב מרחק למטרים/קילומטרים
 */
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * עיצוב זמן לדקות/שעות
 */
function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} דק'`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}:${remainingMinutes.toString().padStart(2, '0')} שעות`;
}

/**
 * cache למיקומים כדי לא לבצע geocoding מיותר
 */
const geocodeCache: Map<string, LatLng> = new Map();

export async function geocodeAddressWithCache(address: string): Promise<LatLng | null> {
  const cacheKey = address.toLowerCase().trim();
  
  if (geocodeCache.has(cacheKey)) {
    console.log(`📦 [Geocoding] Using cached location for "${address}"`);
    return geocodeCache.get(cacheKey)!;
  }
  
  const location = await geocodeAddress(address);
  if (location) {
    geocodeCache.set(cacheKey, location);
  }
  
  return location;
}

