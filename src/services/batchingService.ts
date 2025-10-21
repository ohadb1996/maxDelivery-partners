/**
 * Delivery Batching Service
 * מאפשר לשליח לקבל 2 משלוחים מאותו עסק אם היעדים קרובים
 */

import { Delivery } from '@/types';

export interface DeliveryBatch {
  id: string; // Unique batch ID
  business_name: string;
  business_email: string;
  deliveries: [Delivery, Delivery]; // Always exactly 2 deliveries
  distance_between_dropoffs: number; // Distance in km between the two drop-offs
  total_earnings: number; // Combined payment
  total_distance: number; // Total distance (pickup to first, first to second)
}

/**
 * חישוב מרחק ישר בין שתי נקודות (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // רדיוס כדור הארץ בק"מ
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * מוצא קבוצות של משלוחים שניתן לבצע ביחד (batching)
 * כללים:
 * - 2 משלוחים בדיוק
 * - מאותו עסק
 * - יעדים במרחק של עד 2 ק"מ זה מזה
 */
export function findBatchableDeliveries(
  availableDeliveries: Delivery[],
  maxDistanceKm: number = 2
): DeliveryBatch[] {
  const batches: DeliveryBatch[] = [];
  
  // קיבוץ משלוחים לפי עסק
  const deliveriesByBusiness = new Map<string, Delivery[]>();
  
  availableDeliveries.forEach(delivery => {
    const businessKey = delivery.business_email || delivery.business_name;
    
    if (!businessKey) {
      console.warn(`⚠️ [Batching] Delivery ${delivery.id} missing business identifier`);
      return;
    }
    
    if (!deliveriesByBusiness.has(businessKey)) {
      deliveriesByBusiness.set(businessKey, []);
    }
    deliveriesByBusiness.get(businessKey)!.push(delivery);
    
    console.log(`📦 [Batching] Delivery ${delivery.id} → Business: ${businessKey}, Has coords: ${!!delivery.delivery_coordinates}`);
  });
  
  console.log(`🔍 [Batching] Found ${deliveriesByBusiness.size} businesses with deliveries`);
  
  // בדיקת זוגות משלוחים מכל עסק
  deliveriesByBusiness.forEach((deliveries, businessKey) => {
    if (deliveries.length < 2) return; // צריך לפחות 2 משלוחים
    
    console.log(`🔍 [Batching] Business ${businessKey} has ${deliveries.length} deliveries`);
    
    // בדיקת כל זוג אפשרי
    for (let i = 0; i < deliveries.length; i++) {
      for (let j = i + 1; j < deliveries.length; j++) {
        const delivery1 = deliveries[i];
        const delivery2 = deliveries[j];
        
        // בדיקה שלשניהם יש קואורדינטות
        const coords1 = delivery1.delivery_coordinates;
        const coords2 = delivery2.delivery_coordinates;
        
        if (!coords1 || !coords2) {
          console.warn(`⚠️ [Batching] Missing coordinates:`, {
            delivery1: delivery1.id,
            has_coords1: !!coords1,
            delivery2: delivery2.id,
            has_coords2: !!coords2
          });
          continue;
        }
        
        // חישוב מרחק בין היעדים
        const distance = calculateDistance(
          coords1.lat,
          coords1.lng,
          coords2.lat,
          coords2.lng
        );
        
        console.log(`📏 [Batching] Distance between ${delivery1.id} and ${delivery2.id}: ${distance.toFixed(2)} km`);
        
        // אם המרחק קטן או שווה למקסימום - זה בטח!
        if (distance <= maxDistanceKm) {
          const batch: DeliveryBatch = {
            id: `batch_${delivery1.id}_${delivery2.id}`,
            business_name: delivery1.business_name || 'Unknown Business',
            business_email: businessKey,
            deliveries: [delivery1, delivery2],
            distance_between_dropoffs: Math.round(distance * 100) / 100,
            total_earnings: (delivery1.payment_amount || 0) + (delivery2.payment_amount || 0),
            total_distance: (delivery1.distance_km || 0) + (delivery2.distance_km || 0) + distance
          };
          
          batches.push(batch);
          console.log(`✅ [Batching] Created batch ${batch.id}:`, {
            distance: `${distance.toFixed(2)} km`,
            delivery1: delivery1.customer_name,
            delivery2: delivery2.customer_name,
            total_earnings: `₪${batch.total_earnings}`
          });
        }
      }
    }
  });
  
  console.log(`✅ [Batching] Found ${batches.length} batchable delivery pairs`);
  return batches;
}

/**
 * בדיקה האם משלוח כבר נמצא בבטח כלשהו
 */
export function isDeliveryInBatch(deliveryId: string, batches: DeliveryBatch[]): boolean {
  return batches.some(batch => 
    batch.deliveries[0].id === deliveryId || batch.deliveries[1].id === deliveryId
  );
}

/**
 * מוצא בטח שמכיל משלוח מסוים
 */
export function findBatchContainingDelivery(
  deliveryId: string, 
  batches: DeliveryBatch[]
): DeliveryBatch | null {
  return batches.find(batch => 
    batch.deliveries[0].id === deliveryId || batch.deliveries[1].id === deliveryId
  ) || null;
}

