export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Courier {
  id: string;
  created_by: string;
  phone: string;
  vehicle_type: 'bike' | 'motorcycle' | 'car' | 'van';
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
  status: 'available' | 'accepted' | 'arrived_pickup' | 'picked_up' | 'arrived_delivery' | 'delivered' | 'cancelled';
  assigned_courier?: string;
  accepted_time?: string;
  pickup_time?: string;
  delivery_time?: string;
  estimated_distance?: string;
  estimated_duration?: string;
  created_at: string;
  updated_at: string;
}

export interface DeliveryStats {
  total: number;
  thisWeek: number;
  rating: number;
}
