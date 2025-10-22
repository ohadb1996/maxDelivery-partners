/**
 * Delivery Batching Service
 * מאפשר לשליח לקבל 2 משלוחים מאותו עסק אם היעדים קרובים
 */

import { Delivery } from '@/types';

export type BatchType = 'single_business' | 'cross_business';

export interface DeliveryBatch {
  id: string; // Unique batch ID
  type: BatchType; // Type of batch
  business_name: string; // For single_business, the business name. For cross_business, combined names
  business_email: string; // For single_business, the email. For cross_business, combined emails
  deliveries: [Delivery, Delivery]; // Always exactly 2 deliveries
  distance_between_dropoffs: number; // Distance in km between the two drop-offs
  distance_between_pickups?: number; // Distance in km between pickups (for cross_business)
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
 * Interface for valid pair candidates with their distance
 */
interface SingleBusinessPairCandidate {
  delivery1: Delivery;
  delivery2: Delivery;
  distance: number; // Distance between drop-offs
  businessKey: string;
  type: 'single_business';
}

interface CrossBusinessPairCandidate {
  delivery1: Delivery;
  delivery2: Delivery;
  dropoffDistance: number; // Distance between drop-offs
  pickupDistance: number; // Distance between pickups
  timeDiffMinutes: number; // Time difference in minutes
  type: 'cross_business';
}

type PairCandidate = SingleBusinessPairCandidate | CrossBusinessPairCandidate;

/**
 * מוצא קבוצות של משלוחים שניתן לבצע ביחד (batching)
 * אלגוריתם משופר: תומך בשני סוגים של batching
 * 1. Single-Business: משלוחים מאותו עסק עם יעדים קרובים
 * 2. Cross-Business: משלוחים מעסקים שונים עם איסוף ויעד קרובים וזמן דומה
 */
export function findBatchableDeliveries(
  availableDeliveries: Delivery[],
  maxDropoffDistanceKm: number = 2,
  maxPickupDistanceKm: number = 0.3,
  maxTimeDiffMinutes: number = 10
): DeliveryBatch[] {
  const finalBatches: DeliveryBatch[] = [];
  const alreadyBatchedDeliveryIds = new Set<string>();
  const allValidPairs: PairCandidate[] = [];
  
  console.log(`🔍 [Batching] Starting batch analysis for ${availableDeliveries.length} deliveries`);
  
  // Step 1: מצא Single-Business Batches
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
  });
  
  console.log(`🔍 [Batching] Found ${deliveriesByBusiness.size} businesses with deliveries`);
  
  // Find all single-business pairs
  deliveriesByBusiness.forEach((deliveries, businessKey) => {
    if (deliveries.length < 2) return;
    
    console.log(`🏢 [Single-Business] Checking ${deliveries.length} deliveries for business ${businessKey}`);
    
    for (let i = 0; i < deliveries.length; i++) {
      for (let j = i + 1; j < deliveries.length; j++) {
        const delivery1 = deliveries[i];
        const delivery2 = deliveries[j];
        
        const coords1 = delivery1.delivery_coordinates;
        const coords2 = delivery2.delivery_coordinates;
        
        if (!coords1 || !coords2) continue;
        
        const dropoffDistance = calculateDistance(
          coords1.lat,
          coords1.lng,
          coords2.lat,
          coords2.lng
        );
        
        if (dropoffDistance <= maxDropoffDistanceKm) {
          allValidPairs.push({
            delivery1,
            delivery2,
            distance: dropoffDistance,
            businessKey,
            type: 'single_business'
          });
          console.log(`✅ [Single-Business] Valid pair: ${delivery1.id} + ${delivery2.id} (${dropoffDistance.toFixed(2)} km)`);
        }
      }
    }
  });
  
  // Step 2: מצא Cross-Business Batches
  console.log(`🔄 [Cross-Business] Checking cross-business opportunities...`);
  console.log(`🔄 [Cross-Business] Total deliveries to check: ${availableDeliveries.length}`);
  
  for (let i = 0; i < availableDeliveries.length; i++) {
    for (let j = i + 1; j < availableDeliveries.length; j++) {
      const delivery1 = availableDeliveries[i];
      const delivery2 = availableDeliveries[j];
      
      console.log(`🔍 [Cross-Business] Checking pair: ${delivery1.id} + ${delivery2.id}`);
      
      // Skip if same business (already handled above)
      const business1 = delivery1.business_email || delivery1.business_name;
      const business2 = delivery2.business_email || delivery2.business_name;
      
      console.log(`   📊 Business check:`, {
        delivery1_id: delivery1.id,
        business1: business1 || 'UNDEFINED',
        delivery2_id: delivery2.id,
        business2: business2 || 'UNDEFINED',
        sameBusiness: business1 === business2
      });
      
      if (business1 === business2) {
        console.log(`   ⏭️ SKIPPED: Same business (${business1 || 'both undefined'})`);
        continue;
      }
      
      // Check all required coordinates
      const pickupCoords1 = delivery1.pickup_coordinates;
      const pickupCoords2 = delivery2.pickup_coordinates;
      const dropoffCoords1 = delivery1.delivery_coordinates;
      const dropoffCoords2 = delivery2.delivery_coordinates;
      
      console.log(`   📍 Coordinate check:`, {
        delivery1_pickup: pickupCoords1 ? `✓ (${pickupCoords1.lat}, ${pickupCoords1.lng})` : '✗ MISSING',
        delivery1_dropoff: dropoffCoords1 ? `✓ (${dropoffCoords1.lat}, ${dropoffCoords1.lng})` : '✗ MISSING',
        delivery2_pickup: pickupCoords2 ? `✓ (${pickupCoords2.lat}, ${pickupCoords2.lng})` : '✗ MISSING',
        delivery2_dropoff: dropoffCoords2 ? `✓ (${dropoffCoords2.lat}, ${dropoffCoords2.lng})` : '✗ MISSING'
      });
      
      if (!pickupCoords1 || !pickupCoords2 || !dropoffCoords1 || !dropoffCoords2) {
        console.log(`   ⏭️ SKIPPED: Missing coordinates`);
        continue;
      }
      
      // Check pickup distance (must be <= 0.3 km)
      const pickupDistance = calculateDistance(
        pickupCoords1.lat,
        pickupCoords1.lng,
        pickupCoords2.lat,
        pickupCoords2.lng
      );
      
      console.log(`   📏 Pickup distance: ${pickupDistance.toFixed(3)} km (max: ${maxPickupDistanceKm} km) - ${pickupDistance <= maxPickupDistanceKm ? '✓ PASS' : '✗ FAIL'}`);
      
      if (pickupDistance > maxPickupDistanceKm) {
        console.log(`   ⏭️ SKIPPED: Pickup distance too far (${pickupDistance.toFixed(3)} km > ${maxPickupDistanceKm} km)`);
        continue;
      }
      
      // Check dropoff distance (must be <= 2.0 km)
      const dropoffDistance = calculateDistance(
        dropoffCoords1.lat,
        dropoffCoords1.lng,
        dropoffCoords2.lat,
        dropoffCoords2.lng
      );
      
      console.log(`   📏 Dropoff distance: ${dropoffDistance.toFixed(3)} km (max: ${maxDropoffDistanceKm} km) - ${dropoffDistance <= maxDropoffDistanceKm ? '✓ PASS' : '✗ FAIL'}`);
      
      if (dropoffDistance > maxDropoffDistanceKm) {
        console.log(`   ⏭️ SKIPPED: Dropoff distance too far (${dropoffDistance.toFixed(3)} km > ${maxDropoffDistanceKm} km)`);
        continue;
      }
      
      // Check time difference (must be < 10 minutes)
      const time1 = new Date(delivery1.created_at).getTime();
      const time2 = new Date(delivery2.created_at).getTime();
      const timeDiffMinutes = Math.abs(time1 - time2) / (1000 * 60);
      
      console.log(`   ⏰ Time difference: ${timeDiffMinutes.toFixed(1)} minutes (max: ${maxTimeDiffMinutes} min) - ${timeDiffMinutes < maxTimeDiffMinutes ? '✓ PASS' : '✗ FAIL'}`);
      
      if (timeDiffMinutes >= maxTimeDiffMinutes) {
        console.log(`   ⏭️ SKIPPED: Time difference too large (${timeDiffMinutes.toFixed(1)} min >= ${maxTimeDiffMinutes} min)`);
        continue;
      }
      
      // Valid cross-business pair!
      console.log(`   ✅✅✅ ALL CHECKS PASSED! Creating cross-business pair candidate ✅✅✅`);
      
      allValidPairs.push({
        delivery1,
        delivery2,
        dropoffDistance,
        pickupDistance,
        timeDiffMinutes,
        type: 'cross_business'
      });
      
      console.log(`✅ [Cross-Business] Valid pair added: ${delivery1.id} (${business1}) + ${delivery2.id} (${business2})`, {
        pickupDist: `${pickupDistance.toFixed(2)} km`,
        dropoffDist: `${dropoffDistance.toFixed(2)} km`,
        timeDiff: `${timeDiffMinutes.toFixed(1)} min`
      });
    }
  }
  
  const crossBusinessPairs = allValidPairs.filter(p => p.type === 'cross_business').length;
  const singleBusinessPairs = allValidPairs.filter(p => p.type === 'single_business').length;
  
  console.log(`📊 [Batching] Found ${allValidPairs.length} total valid pairs:`, {
    singleBusiness: singleBusinessPairs,
    crossBusiness: crossBusinessPairs
  });
  
  // Step 3: Sort all pairs by priority (shortest distance first, prefer single-business)
  allValidPairs.sort((a, b) => {
    // Get the dropoff distance for comparison
    const distA = a.type === 'single_business' ? a.distance : a.dropoffDistance;
    const distB = b.type === 'single_business' ? b.distance : b.dropoffDistance;
    
    // Prefer single-business batches (slight bonus)
    const bonusA = a.type === 'single_business' ? -0.1 : 0;
    const bonusB = b.type === 'single_business' ? -0.1 : 0;
    
    return (distA + bonusA) - (distB + bonusB);
  });
  
  // Step 4: Select best non-overlapping pairs
  for (const pair of allValidPairs) {
    const id1 = pair.delivery1.id;
    const id2 = pair.delivery2.id;
    
    // Check if either delivery is already batched
    if (alreadyBatchedDeliveryIds.has(id1) || alreadyBatchedDeliveryIds.has(id2)) {
      console.log(`⏭️ [Batching] Skipping pair ${id1} + ${id2} - already batched`);
      continue;
    }
    
    // Create batch based on type
    let batch: DeliveryBatch;
    
    if (pair.type === 'single_business') {
      batch = {
        id: `batch_${id1}_${id2}`,
        type: 'single_business',
        business_name: pair.delivery1.business_name || 'Unknown Business',
        business_email: pair.businessKey,
        deliveries: [pair.delivery1, pair.delivery2],
        distance_between_dropoffs: Math.round(pair.distance * 100) / 100,
        total_earnings: (pair.delivery1.payment_amount || 0) + (pair.delivery2.payment_amount || 0),
        total_distance: (pair.delivery1.distance_km || 0) + (pair.delivery2.distance_km || 0) + pair.distance
      };
      
      console.log(`✅ [Single-Business] Created batch ${batch.id}:`, {
        business: pair.businessKey,
        distance: `${pair.distance.toFixed(2)} km`,
        earnings: `₪${batch.total_earnings}`
      });
    } else {
      // Cross-business batch
      const business1 = pair.delivery1.business_name || 'Business 1';
      const business2 = pair.delivery2.business_name || 'Business 2';
      
      batch = {
        id: `cross_batch_${id1}_${id2}`,
        type: 'cross_business',
        business_name: `${business1} + ${business2}`,
        business_email: `${pair.delivery1.business_email || ''} | ${pair.delivery2.business_email || ''}`,
        deliveries: [pair.delivery1, pair.delivery2],
        distance_between_dropoffs: Math.round(pair.dropoffDistance * 100) / 100,
        distance_between_pickups: Math.round(pair.pickupDistance * 100) / 100,
        total_earnings: (pair.delivery1.payment_amount || 0) + (pair.delivery2.payment_amount || 0),
        total_distance: (pair.delivery1.distance_km || 0) + (pair.delivery2.distance_km || 0) + pair.dropoffDistance
      };
      
      console.log(`✅ [Cross-Business] Created batch ${batch.id}:`, {
        businesses: `${business1} + ${business2}`,
        pickupDist: `${pair.pickupDistance.toFixed(2)} km`,
        dropoffDist: `${pair.dropoffDistance.toFixed(2)} km`,
        timeDiff: `${pair.timeDiffMinutes.toFixed(1)} min`,
        earnings: `₪${batch.total_earnings}`
      });
    }
    
    finalBatches.push(batch);
    alreadyBatchedDeliveryIds.add(id1);
    alreadyBatchedDeliveryIds.add(id2);
  }
  
  console.log(`✅ [Batching] Created ${finalBatches.length} optimal batches (${finalBatches.filter(b => b.type === 'single_business').length} single-business, ${finalBatches.filter(b => b.type === 'cross_business').length} cross-business)`);
  console.log(`📦 [Batching] Batched delivery IDs:`, Array.from(alreadyBatchedDeliveryIds));
  
  return finalBatches;
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

