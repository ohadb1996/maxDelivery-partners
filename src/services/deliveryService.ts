import { getDatabase, ref, get, onValue, update, set } from 'firebase/database';
import { app } from '../api/config/firebase.config';
import { Delivery, VehicleType } from '@/types';

export interface DeliveryWithMonth extends Delivery {
  month: string; // YYYY-MM format
  year: number;
  monthNumber: number;
}

// ממשק למשלוח מה-DB של העסקים
interface DBDelivery {
  customer_name: string;
  customer_phone: string;
  customer_phone_secondary?: string;
  delivery_city: string;
  delivery_street: string;
  delivery_building_number?: string;
  delivery_floor: string;
  delivery_apartment: string;
  delivery_building_code?: string;
  property_type?: string;
  package_description: string;
  package_size: string;
  vehicle_type: string;
  delivery_notes?: string;
  pickup_address: string;
  business_name: string;
  business_email: string;
  status: string;
  createdAt: string;
  created_date: string;
  accepted_time?: string;
  pickup_time?: string;
  delivery_time?: string;
  updated_at?: string;
  // Full delivery address (if available)
  delivery_address?: string;
  // Coordinate fields (from geocoding)
  delivery_coordinates?: {
    lat: number;
    lng: number;
  };
  pickup_coordinates?: {
    lat: number;
    lng: number;
  };
}

// פונקציה להמרת גודל חבילה וסוג רכב מעברית לאנגלית
const mapVehicleType = (hebrewType: string): VehicleType => {
  const mapping: Record<string, VehicleType> = {
    'אופניים': 'bike',
    'קטנוע': 'motorcycle',
    'רכב': 'car',
    'משאית': 'truck'
  };
  return mapping[hebrewType] || 'motorcycle';
};

export interface MonthlyStats {
  month: string; // YYYY-MM
  monthName: string; // e.g., "ינואר 2024"
  deliveryCount: number;
  totalEarnings: number;
  deliveries: Delivery[];
}

// פונקציה לחישוב מרחק בין שתי נקודות GPS (Haversine formula)
// כרגע לא בשימוש - שמור לעתיד כשנוסיף geocoding
// const calculateDistance = (
//   lat1: number,
//   lon1: number,
//   lat2: number,
//   lon2: number
// ): number => {
//   const R = 6371; // רדיוס כדור הארץ בקילומטרים
//   const dLat = (lat2 - lat1) * Math.PI / 180;
//   const dLon = (lon2 - lon1) * Math.PI / 180;
//   const a =
//     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//     Math.cos(lat1 * Math.PI / 180) *
//     Math.cos(lat2 * Math.PI / 180) *
//     Math.sin(dLon / 2) *
//     Math.sin(dLon / 2);
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   return R * c;
// };

// פונקציה להמרת משלוח מ-DB לפורמט Delivery
const convertDBDeliveryToDelivery = (id: string, dbDelivery: DBDelivery): Delivery => {
  console.log(`🔄 [DeliveryService] Converting delivery ${id}:`, {
    vehicle_type: dbDelivery.vehicle_type,
    status: dbDelivery.status,
    customer: dbDelivery.customer_name,
    pickup: dbDelivery.pickup_address,
    delivery_city: dbDelivery.delivery_city,
    delivery_street: dbDelivery.delivery_street
  });
  
  // בנה כתובת מסירה מלאה - עדיפות ל-delivery_address המלא, אחרת בנה מיחידות
  const deliveryAddress = dbDelivery.delivery_address || 
    `${dbDelivery.delivery_street || ''} ${dbDelivery.delivery_building_number || ''}, ${dbDelivery.delivery_city || ''}`.trim();
  const mappedVehicleType = mapVehicleType(dbDelivery.vehicle_type);
  
  console.log(`🔄 [DeliveryService] Mapped vehicle type: ${dbDelivery.vehicle_type} -> ${mappedVehicleType}`);
  
  // חישוב הכנסת השליח (85% מהמחיר המלא)
  const fullPrice = (dbDelivery as any).price || 0;
  const courierEarnings = fullPrice > 0 ? Math.round(fullPrice * 0.85) : 0;
  
  const delivery: Delivery = {
    id,
    order_number: id.substring(0, 8).toUpperCase(),
    customer_name: dbDelivery.customer_name,
    customer_phone: dbDelivery.customer_phone,
    package_description: dbDelivery.package_description,
    pickup_address: dbDelivery.pickup_address,
    pickup_phone: dbDelivery.customer_phone, // מספר טלפון לאיסוף
    delivery_address: deliveryAddress,
    delivery_notes: dbDelivery.delivery_notes || '',
    payment_amount: courierEarnings, // הכנסת השליח (85% מהמחיר)
    price: courierEarnings, // הכנסת השליח
    distance_km: (dbDelivery as any).distance_km || 0, // מרחק בק"מ
    status: 'available', // המרת "ממתין" ל-"available"
    required_vehicle_type: mappedVehicleType,
    estimated_distance: '0 km', // יעודכן בהמשך
    estimated_duration: '0 min', // יעודכן בהמשך
    accepted_time: dbDelivery.accepted_time,
    pickup_time: dbDelivery.pickup_time,
    delivery_time: dbDelivery.delivery_time,
    created_at: dbDelivery.createdAt || dbDelivery.created_date,
    updated_at: dbDelivery.updated_at || dbDelivery.createdAt || dbDelivery.created_date,
    // ✅ Business identification (for batching)
    business_name: dbDelivery.business_name,
    business_email: dbDelivery.business_email,
    // ✅ Coordinates (for batching and mapping)
    delivery_coordinates: dbDelivery.delivery_coordinates,
    pickup_coordinates: dbDelivery.pickup_coordinates,
  };
  
  console.log(`✅ [DeliveryService] Converted delivery:`, {
    id: delivery.id,
    order_number: delivery.order_number,
    customer: delivery.customer_name,
    required_vehicle: delivery.required_vehicle_type,
    status: delivery.status,
    fullPrice: fullPrice,
    courierEarnings: courierEarnings,
    commission: '15%',
    business_name: delivery.business_name,
    business_email: delivery.business_email,
    has_delivery_coords: !!delivery.delivery_coordinates,
    has_pickup_coords: !!delivery.pickup_coordinates,
    delivery_coords: delivery.delivery_coordinates
  });
  
  return delivery;
};

// פונקציה לשליפת משלוחים זמינים (סטטוס "ממתין")
export const getAvailableDeliveries = async (): Promise<Delivery[]> => {
  try {
    const db = getDatabase(app);
    const deliveriesRef = ref(db, 'Deliveries');
    
    const snapshot = await get(deliveriesRef);
    
    if (!snapshot.exists()) {
      console.log('📦 [DeliveryService] No deliveries found in database');
      return [];
    }
    
    const deliveries: Delivery[] = [];
    let totalCount = 0;
    const statusCounts: Record<string, number> = {};
    
    snapshot.forEach((childSnapshot) => {
      totalCount++;
      const dbDelivery = childSnapshot.val() as DBDelivery;
      
      // ספירת סטטוסים
      const status = dbDelivery.status || 'undefined';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      
      console.log(`🔍 [DeliveryService] Delivery ${childSnapshot.key}:`, {
        status: dbDelivery.status,
        customer_name: dbDelivery.customer_name,
        vehicle_type: dbDelivery.vehicle_type,
        business_email: dbDelivery.business_email
      });
      
      // ✅ סנן רק משלוחים במצב "מוכן לאיסוף" (לאחר אישור בעל העסק)
      if (dbDelivery.status === 'מוכן לאיסוף' || dbDelivery.status === 'מוכן' || dbDelivery.status === 'ready') {
        const delivery = convertDBDeliveryToDelivery(childSnapshot.key!, dbDelivery);
        deliveries.push(delivery);
      }
    });
    
    console.log(`📦 [DeliveryService] Total deliveries in DB: ${totalCount}`);
    console.log(`📊 [DeliveryService] Status breakdown:`, statusCounts);
    console.log(`✅ [DeliveryService] Found ${deliveries.length} available deliveries`);
    
    // מיין לפי זמן יצירה (FIFO - הישן ביותר ראשון)
    deliveries.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateA - dateB;
    });
    
    return deliveries;
  } catch (error) {
    console.error('❌ [DeliveryService] Error fetching available deliveries:', error);
    return [];
  }
};

// פונקציה לעדכון משלוח בזמן אמת
export const subscribeToAvailableDeliveries = (
  callback: (deliveries: Delivery[]) => void
): (() => void) => {
  try {
    const db = getDatabase(app);
    const deliveriesRef = ref(db, 'Deliveries');
    
    const unsubscribe = onValue(deliveriesRef, (snapshot) => {
      if (!snapshot.exists()) {
        console.log('📦 [DeliveryService] Real-time: No deliveries in DB');
        callback([]);
        return;
      }
      
      const deliveries: Delivery[] = [];
      let totalCount = 0;
      const statusCounts: Record<string, number> = {};
      
    snapshot.forEach((childSnapshot) => {
        totalCount++;
        const dbDelivery = childSnapshot.val() as DBDelivery;
        
        // ספירת סטטוסים
        const status = dbDelivery.status || 'undefined';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
        
        // ✅ סנן רק משלוחים במצב "מוכן לאיסוף" (לאחר אישור בעל העסק)
        if (dbDelivery.status === 'מוכן לאיסוף' || dbDelivery.status === 'מוכן' || dbDelivery.status === 'ready') {
          const delivery = convertDBDeliveryToDelivery(childSnapshot.key!, dbDelivery);
          deliveries.push(delivery);
          console.log(`✅ [DeliveryService] Added available delivery:`, {
        id: childSnapshot.key,
            customer: dbDelivery.customer_name,
            vehicle: dbDelivery.vehicle_type
          });
        }
      });
      
      console.log(`📦 [DeliveryService] Real-time update: Total=${totalCount}, Available=${deliveries.length}`);
      console.log(`📊 [DeliveryService] Status breakdown:`, statusCounts);
      
      // מיין לפי זמן יצירה (FIFO)
      deliveries.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateA - dateB;
      });
      
      callback(deliveries);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('❌ [DeliveryService] Error subscribing to deliveries:', error);
    return () => {};
  }
};

// פונקציה לשליפת משלוח יחיד לפי ID
export const getDeliveryById = async (deliveryId: string): Promise<Delivery | null> => {
  try {
    const db = getDatabase(app);
    const deliveryRef = ref(db, `Deliveries/${deliveryId}`);
    
    const snapshot = await get(deliveryRef);
    
    if (!snapshot.exists()) {
      console.log(`📦 [DeliveryService] Delivery ${deliveryId} not found`);
      return null;
    }
    
    const dbDelivery = snapshot.val() as DBDelivery;
    const delivery = convertDBDeliveryToDelivery(deliveryId, dbDelivery);
    
    // עדכון סטטוס לפי הסטטוס האמיתי במערכת העסקים
    if (dbDelivery.status === 'ממתין') {
      delivery.status = 'available';
    } else if (dbDelivery.status === 'מקבל') {
      delivery.status = 'accepted';
    } else if (dbDelivery.status === 'הגיע לנקודת איסוף') {
      delivery.status = 'arrived_pickup';
    } else if (dbDelivery.status === 'נאסף') {
      delivery.status = 'picked_up';
    } else if (dbDelivery.status === 'הגיע ליעד') {
      delivery.status = 'arrived_delivery';
    } else if (dbDelivery.status === 'הושלם') {
      delivery.status = 'delivered';
    } else if (dbDelivery.status === 'בוטל') {
      delivery.status = 'cancelled';
    }
    
    console.log(`📦 [DeliveryService] Loaded delivery ${deliveryId}:`, delivery);
    return delivery;
  } catch (error) {
    console.error(`❌ [DeliveryService] Error fetching delivery ${deliveryId}:`, error);
    return null;
  }
};

// פונקציה להקצאת batch של משלוחים לשליח (2 משלוחים ביחד)
export const assignBatchToCourier = async (
  deliveryIds: [string, string],
  courierId: string
): Promise<boolean> => {
  try {
    const db = getDatabase(app);
    
    console.log(`📦 [DeliveryService] Assigning batch of ${deliveryIds.length} deliveries to courier ${courierId}`);
    
    // עבור על כל משלוח בבטח
    for (const deliveryId of deliveryIds) {
      const deliveryRef = ref(db, `Deliveries/${deliveryId}`);
      const deliverySnapshot = await get(deliveryRef);
      
      if (!deliverySnapshot.exists()) {
        console.error(`❌ [DeliveryService] Delivery ${deliveryId} not found`);
        return false;
      }
      
      const deliveryData = deliverySnapshot.val();
      
      // בדוק שהמשלוח עדיין זמין
      const availableStatuses = ['מוכן לאיסוף', 'מוכן', 'ready'];
      if (!availableStatuses.includes(deliveryData.status)) {
        console.error(`❌ [DeliveryService] Delivery ${deliveryId} is not available (status: ${deliveryData.status})`);
        return false;
      }
      
      // עדכן את הסטטוס ל-"מקבל" והוסף את מזהה השליח
      await update(deliveryRef, {
        status: 'מקבל',
        assigned_courier: courierId,
        accepted_time: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_batched: true, // סימון שזה חלק מבטח
        batch_id: `batch_${deliveryIds[0]}_${deliveryIds[1]}`
      });
      
      console.log(`✅ [DeliveryService] Updated delivery ${deliveryId} status to "מקבל" (batched)`);
      
      // הוסף את המשלוח לרשימת המשלוחים של השליח
      const courierDeliveryRef = ref(db, `Couriers/${courierId}/CollectedDeliveries/${deliveryId}`);
      await set(courierDeliveryRef, {
        status: 'מקבל',
        accepted_time: new Date().toISOString(),
        is_batched: true,
        batch_id: `batch_${deliveryIds[0]}_${deliveryIds[1]}`
      });
      
      console.log(`✅ [DeliveryService] Added delivery ${deliveryId} to courier's CollectedDeliveries`);
    }
    
    console.log(`✅ [DeliveryService] Successfully assigned batch to courier`);
    return true;
  } catch (error) {
    console.error(`❌ [DeliveryService] Error assigning batch:`, error);
    return false;
  }
};

// פונקציה להקצאת משלוח לשליח
export const assignDeliveryToCourier = async (
  deliveryId: string,
  courierId: string
): Promise<boolean> => {
  try {
    const db = getDatabase(app);
    
    console.log(`📝 [DeliveryService] Assigning delivery ${deliveryId} to courier ${courierId}`);
    
    // 1. עדכן את סטטוס המשלוח ב-Deliveries
    const deliveryRef = ref(db, `Deliveries/${deliveryId}`);
    const deliverySnapshot = await get(deliveryRef);
    
    if (!deliverySnapshot.exists()) {
      console.error(`❌ [DeliveryService] Delivery ${deliveryId} not found`);
      return false;
    }
    
    const deliveryData = deliverySnapshot.val();
    
    // בדוק שהמשלוח עדיין זמין
    const availableStatuses = ['מוכן לאיסוף', 'מוכן', 'ready'];
    if (!availableStatuses.includes(deliveryData.status)) {
      console.error(`❌ [DeliveryService] Delivery ${deliveryId} is not available for pickup (status: ${deliveryData.status})`);
      return false;
    }
    
    // עדכן את הסטטוס ל-"מקבל" והוסף את מזהה השליח
    await update(deliveryRef, {
      status: 'מקבל',
      assigned_courier: courierId,
      accepted_time: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    console.log(`✅ [DeliveryService] Updated delivery status to "מקבל"`);
    
    // 2. הוסף את המשלוח לרשימת המשלוחים של השליח
    const courierDeliveryRef = ref(db, `Couriers/${courierId}/CollectedDeliveries/${deliveryId}`);
    await set(courierDeliveryRef, {
      status: 'מקבל',
      accepted_time: new Date().toISOString()
    });
    
    console.log(`✅ [DeliveryService] Added delivery to courier's CollectedDeliveries`);
    
    return true;
  } catch (error) {
    console.error(`❌ [DeliveryService] Error assigning delivery:`, error);
    return false;
  }
};

// פונקציה לעדכון סטטוס משלוח
export const updateDeliveryStatus = async (
  deliveryId: string,
  courierId: string,
  newStatus: string
): Promise<boolean> => {
  try {
    const db = getDatabase(app);
    
    console.log(`📝 [DeliveryService] Updating delivery ${deliveryId} status to ${newStatus}`);
    
    // מיפוי סטטוסים מאנגלית לעברית
    const statusMapping: Record<string, string> = {
      'accepted': 'מקבל',
      'arrived_pickup': 'הגיע לנקודת איסוף',
      'picked_up': 'נאסף',
      'arrived_delivery': 'הגיע ליעד',
      'delivered': 'הושלם',
      'cancelled': 'בוטל'
    };
    
    const hebrewStatus = statusMapping[newStatus] || newStatus;
    const timestamp = new Date().toISOString();
    
    // עדכן ב-Deliveries
    const deliveryRef = ref(db, `Deliveries/${deliveryId}`);
    const updates: Record<string, any> = {
      status: hebrewStatus,
      updated_at: timestamp
    };
    
    // הוסף timestamps ספציפיים לפי הסטטוס
    if (newStatus === 'picked_up') {
      updates.pickup_time = timestamp;
    } else if (newStatus === 'delivered') {
      updates.delivery_time = timestamp;
    }
    
    await update(deliveryRef, updates);
    
    // עדכן ב-CollectedDeliveries של השליח
    const courierDeliveryRef = ref(db, `Couriers/${courierId}/CollectedDeliveries/${deliveryId}`);
    await update(courierDeliveryRef, {
      status: hebrewStatus,
      updated_at: timestamp
    });
    
    console.log(`✅ [DeliveryService] Updated delivery status to ${hebrewStatus}`);
    
    return true;
  } catch (error) {
    console.error(`❌ [DeliveryService] Error updating delivery status:`, error);
    return false;
  }
};

// פונקציה לשליפת כל המשלוחים של שליח מסוים
export const getCourierDeliveries = async (courierId: string): Promise<Delivery[]> => {
  try {
    const db = getDatabase(app);
    
    console.log(`📦 [DeliveryService] Loading deliveries for courier ${courierId}`);
    
    // קודם נשלוף את רשימת המשלוחים שהשליח אסף
    const collectedDeliveriesRef = ref(db, `Couriers/${courierId}/CollectedDeliveries`);
    const collectedSnapshot = await get(collectedDeliveriesRef);
    
    if (!collectedSnapshot.exists()) {
      console.log('📦 [DeliveryService] No collected deliveries found');
      return [];
    }
    
    const deliveries: Delivery[] = [];
    const deliveryIds: string[] = [];
    
    // אסוף את כל מזהי המשלוחים
    collectedSnapshot.forEach((childSnapshot) => {
      deliveryIds.push(childSnapshot.key!);
    });
    
    console.log(`📦 [DeliveryService] Found ${deliveryIds.length} collected deliveries`);
    
    // עבור כל מזהה, שלוף את המשלוח המלא
    for (const deliveryId of deliveryIds) {
      const deliveryRef = ref(db, `Deliveries/${deliveryId}`);
      const deliverySnapshot = await get(deliveryRef);
      
      if (deliverySnapshot.exists()) {
        const dbDelivery = deliverySnapshot.val() as DBDelivery;
        const delivery = convertDBDeliveryToDelivery(deliveryId, dbDelivery);
        
        // המר סטטוסים מעברית לאנגלית
        if (dbDelivery.status === 'הושלם') {
          delivery.status = 'delivered';
        } else if (dbDelivery.status === 'מקבל') {
          delivery.status = 'accepted';
        } else if (dbDelivery.status === 'הגיע לנקודת איסוף') {
          delivery.status = 'arrived_pickup';
        } else if (dbDelivery.status === 'נאסף') {
          delivery.status = 'picked_up';
        } else if (dbDelivery.status === 'הגיע ליעד') {
          delivery.status = 'arrived_delivery';
        }
        
        // Ensure timestamps are preserved
        if (dbDelivery.accepted_time) delivery.accepted_time = dbDelivery.accepted_time;
        if (dbDelivery.pickup_time) delivery.pickup_time = dbDelivery.pickup_time;
        if (dbDelivery.delivery_time) delivery.delivery_time = dbDelivery.delivery_time;
        
        deliveries.push(delivery);
      }
    }
    
    console.log(`📦 [DeliveryService] Loaded ${deliveries.length} full deliveries`);
    
    // סינון רק משלוחים שהושלמו
    const completedDeliveries = deliveries.filter(d => d.status === 'delivered');
    console.log(`✅ [DeliveryService] Found ${completedDeliveries.length} completed deliveries`);
    
    return completedDeliveries;
  } catch (error) {
    console.error('❌ [DeliveryService] Error fetching courier deliveries:', error);
    return [];
  }
};

// פונקציה לקבלת שם החודש בעברית
const getHebrewMonthName = (monthNumber: number): string => {
  const months = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];
  return months[monthNumber];
};

// פונקציה לקבלת סטטיסטיקות חודשיות
export const getMonthlyStats = async (courierId: string, year?: number, month?: number): Promise<MonthlyStats[]> => {
  try {
    const deliveries = await getCourierDeliveries(courierId);
    
    // קיבוץ משלוחים לפי חודש
    const monthlyMap = new Map<string, Delivery[]>();
    
    deliveries.forEach(delivery => {
      // נשתמש ב-delivery_time או createdAt או updated_at
      const dateString = delivery.delivery_time || delivery.created_at || delivery.updated_at;
      if (!dateString) return;
      
      const date = new Date(dateString);
      const deliveryYear = date.getFullYear();
      const deliveryMonth = date.getMonth();
      
      // אם סופק year ו-month, סנן רק את החודש הזה
      if (year !== undefined && month !== undefined) {
        if (deliveryYear !== year || deliveryMonth !== month) {
          return;
        }
      }
      
      const monthKey = `${deliveryYear}-${String(deliveryMonth + 1).padStart(2, '0')}`;
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, []);
      }
      monthlyMap.get(monthKey)!.push(delivery);
    });
    
    // המרה למערך של סטטיסטיקות
    const stats: MonthlyStats[] = [];
    
    monthlyMap.forEach((monthDeliveries, monthKey) => {
      const [yearStr, monthStr] = monthKey.split('-');
      const yearNum = parseInt(yearStr);
      const monthNum = parseInt(monthStr) - 1;
      
      const totalEarnings = monthDeliveries.reduce((sum, d) => {
        return sum + (d.payment_amount || 0);
      }, 0);
      
      stats.push({
        month: monthKey,
        monthName: `${getHebrewMonthName(monthNum)} ${yearNum}`,
        deliveryCount: monthDeliveries.length,
        totalEarnings,
        deliveries: monthDeliveries,
      });
    });
    
    // מיון לפי תאריך (החודש האחרון ראשון)
    stats.sort((a, b) => b.month.localeCompare(a.month));
    
    return stats;
  } catch (error) {
    console.error('Error calculating monthly stats:', error);
    return [];
  }
};

// פונקציה לקבלת סטטיסטיקות לחודש הנוכחי
export const getCurrentMonthStats = async (courierId: string): Promise<MonthlyStats | null> => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  const stats = await getMonthlyStats(courierId, currentYear, currentMonth);
  return stats.length > 0 ? stats[0] : null;
};

// פונקציה לקבלת סטטיסטיקות יומיות בחודש מסוים (לגרף)
export interface DailyStats {
  day: number;
  date: string;
  deliveryCount: number;
  earnings: number;
}

export const getDailyStatsForMonth = async (
  courierId: string,
  year: number,
  month: number // 0-11
): Promise<DailyStats[]> => {
  try {
    const deliveries = await getCourierDeliveries(courierId);
    
    // סינון משלוחים לחודש הספציפי
    const monthDeliveries = deliveries.filter(d => {
      const dateString = d.delivery_time || d.created_at || d.updated_at;
      if (!dateString) return false;
      
      const date = new Date(dateString);
      return date.getFullYear() === year && date.getMonth() === month;
    });
    
    // קבלת מספר הימים בחודש
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // יצירת מערך עם כל הימים בחודש
    const dailyMap = new Map<number, DailyStats>();
    
    for (let day = 1; day <= daysInMonth; day++) {
      dailyMap.set(day, {
        day,
        date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        deliveryCount: 0,
        earnings: 0,
      });
    }
    
    // מילוי הנתונים
    monthDeliveries.forEach(delivery => {
      const dateString = delivery.delivery_time || delivery.created_at || delivery.updated_at;
      if (!dateString) return;
      
      const date = new Date(dateString);
      const day = date.getDate();
      const stats = dailyMap.get(day)!;
      
      stats.deliveryCount += 1;
      stats.earnings += delivery.payment_amount || 0;
    });
    
    // המרה למערך
    return Array.from(dailyMap.values());
  } catch (error) {
    console.error('Error calculating daily stats:', error);
    return [];
  }
};

// פונקציה לחישוב דירוג ממוצע של שליח
export const getCourierRating = async (courierId: string): Promise<number> => {
  try {
    const deliveries = await getCourierDeliveries(courierId);
    
    // סינון רק משלוחים שהושלמו
    const completedDeliveries = deliveries.filter(d => d.status === 'delivered');
    
    if (completedDeliveries.length === 0) {
      return 4.8; // דירוג ברירת מחדל לשליחים חדשים
    }
    
    // כרגע אין שדה rating במשלוחים, אז נחזיר דירוג ברירת מחדל
    // בעתיד אפשר להוסיף rating לכל משלוח
    return 4.8;
  } catch (error) {
    console.error('Error calculating courier rating:', error);
    return 4.8;
  }
};

// פונקציה לקבלת רשימת חודשים זמינים (שיש בהם משלוחים)
export interface AvailableMonth {
  year: number;
  month: number; // 0-11
  monthKey: string; // YYYY-MM
  displayName: string; // e.g., "ינואר 2024"
}

export const getAvailableMonths = async (courierId: string): Promise<AvailableMonth[]> => {
  try {
    const stats = await getMonthlyStats(courierId);
    
    return stats.map(stat => {
      const [yearStr, monthStr] = stat.month.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr) - 1;
      
      return {
        year,
        month,
        monthKey: stat.month,
        displayName: stat.monthName,
      };
    });
  } catch (error) {
    console.error('Error getting available months:', error);
    return [];
  }
};


