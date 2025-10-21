export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export type VehicleType = 'bike' | 'motorcycle' | 'car' | 'truck';

// היררכיה של רכבים - כל רמה יכולה לקחת משלוחים של הרמות הנמוכות ממנה
export const VEHICLE_HIERARCHY: Record<VehicleType, number> = {
  bike: 1,
  motorcycle: 2,
  car: 3,
  truck: 4
};

// פונקציה לבדיקה אם רכב יכול לקחת משלוח מסוים
export const canVehicleTakeDelivery = (courierVehicle: VehicleType, requiredVehicle: VehicleType): boolean => {
  return VEHICLE_HIERARCHY[courierVehicle] >= VEHICLE_HIERARCHY[requiredVehicle];
};

export interface Courier {
  id: string;
  business_email: string;
  phone: string;
  vehicle_type: VehicleType;
  is_available: boolean;
  rating?: number;
  created_at: string;
  updated_at: string;
}

export interface Delivery {
  id: string;
  order_number?: string;
  customer_name: string;
  customer_phone: string;
  package_description: string;
  pickup_address: string;
  pickup_phone?: string;
  delivery_address: string;
  delivery_notes?: string;
  payment_amount?: number;
  price?: number; // מחיר משלוח מחושב
  distance_km?: number; // מרחק בק"מ
  status: 'available' | 'accepted' | 'arrived_pickup' | 'picked_up' | 'arrived_delivery' | 'delivered' | 'cancelled';
  assigned_courier?: string;
  required_vehicle_type: VehicleType; // רמת הרכב הנדרשת למשלוח
  accepted_time?: string;
  pickup_time?: string;
  delivery_time?: string;
  estimated_distance?: string;
  estimated_duration?: string;
  created_at: string;
  updated_at: string;
  // Business identification fields (for batching)
  business_name?: string;
  business_email?: string;
  // Coordinate fields (for batching and mapping)
  delivery_coordinates?: {
    lat: number;
    lng: number;
  };
  pickup_coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface DeliveryStats {
  total: number;
  thisWeek: number;
  rating: number;
}
