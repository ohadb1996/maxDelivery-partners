import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation, Phone, MapPin, Package, CheckCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Delivery } from "@/types";
import { updateDeliveryStatus } from "@/services/deliveryService";
import { useAuth } from "@/context/AuthContext";
import { ref, onValue, get, update } from 'firebase/database';
import { db } from "@/api/config/firebase.config";

import StatusTimeline from "@/components/courier/StatusTimeline";

// ממשק למשלוח מה-DB
interface DBDelivery {
  customer_name: string;
  customer_phone: string;
  delivery_city: string;
  delivery_street: string;
  delivery_building_number?: string;
  delivery_floor: string;
  delivery_apartment: string;
  delivery_building_code?: string;
  package_description: string;
  vehicle_type: string;
  delivery_notes?: string;
  pickup_address: string;
  business_name: string;
  business_email?: string;
  status: string;
  assigned_courier?: string;
  accepted_time?: string;
  pickup_time?: string;
  delivery_time?: string;
  createdAt: string;
  is_batched?: boolean;
  batch_id?: string;
  delivery_address?: string;
  // ✅ Separate delivery tracking for batches
  delivery1_completed?: boolean; // First delivery completed
  delivery2_completed?: boolean; // Second delivery completed
  delivery1_time?: string; // When first delivery was completed
  delivery2_time?: string; // When second delivery was completed
  // ✅ Cross-business pickup tracking
  courier_arrived_pickup1?: boolean; // Courier marked arrived at business 1
  courier_arrived_pickup2?: boolean; // Courier marked arrived at business 2
  business1_confirmed_pickup?: boolean; // Business 1 confirmed pickup
  business2_confirmed_pickup?: boolean; // Business 2 confirmed pickup
  business_confirmed_pickup?: boolean; // Per-delivery confirmation flag
}

export default function ActiveJob() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [batchDelivery, setBatchDelivery] = useState<Delivery | null>(null); // Second delivery in batch
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  // ✅ Track batch delivery completion states
  const [delivery1Completed, setDelivery1Completed] = useState(false);
  const [delivery2Completed, setDelivery2Completed] = useState(false);
  // ✅ Track cross-business pickup states
  const [courierArrivedPickup1, setCourierArrivedPickup1] = useState(false);
  const [courierArrivedPickup2, setCourierArrivedPickup2] = useState(false);
  const [business1ConfirmedPickup, setBusiness1ConfirmedPickup] = useState(false);
  const [business2ConfirmedPickup, setBusiness2ConfirmedPickup] = useState(false);

  useEffect(() => {
    if (user) {
    loadActiveDelivery();
    }
  }, [user]);

  const loadActiveDelivery = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      console.log(`📦 [ActiveJob] Loading active delivery for courier ${user.uid}`);
      
      // Query the main Deliveries collection for deliveries assigned to this courier
      const deliveriesRef = ref(db, 'Deliveries');
      
      // הרשם לעדכונים בזמן אמת
      const unsubscribe = onValue(deliveriesRef, async (snapshot) => {
        if (!snapshot.exists()) {
          console.log('📦 [ActiveJob] No deliveries in database');
          setDelivery(null);
          setIsLoading(false);
          return;
        }
        
        // Find active delivery assigned to this courier
        let activeDeliveryId: string | null = null;
        let activeDeliveryData: DBDelivery | null = null as DBDelivery | null;
        
        console.log('📦 [ActiveJob] Scanning all deliveries for courier assignments...');
        
        // Statuses that mean the delivery is active (accepted but not completed)
        const activeStatuses = ['מקבל', 'הגיע לנקודת איסוף', 'נאסף', 'הגיע ליעד'];
        
        snapshot.forEach((childSnapshot) => {
          const deliveryData = childSnapshot.val() as DBDelivery;
          const deliveryId = childSnapshot.key!;
          
          // ✅ VERY STRICT CHECKS: Delivery must be EXPLICITLY assigned AND accepted by THIS courier
          const hasAssignedCourier = deliveryData.assigned_courier !== undefined && 
                                     deliveryData.assigned_courier !== null && 
                                     deliveryData.assigned_courier !== '';
          const isAssignedToMe = hasAssignedCourier && deliveryData.assigned_courier === user.uid;
          const isActiveStatus = deliveryData.status && activeStatuses.includes(deliveryData.status);
          const hasAcceptedTime = deliveryData.accepted_time !== undefined && 
                                  deliveryData.accepted_time !== null && 
                                  deliveryData.accepted_time !== '';
          
          // ✅ NEW: Check that the status is NOT "מוכן לאיסוף" or "ready" (those are available, not active)
          const isNotReadyStatus = deliveryData.status !== 'מוכן לאיסוף' && 
                                   deliveryData.status !== 'מוכן' && 
                                   deliveryData.status !== 'ready' &&
                                   deliveryData.status !== 'ממתין';
          
          console.log(`📦 [ActiveJob] Checking delivery ${deliveryId}:`, {
            status: deliveryData.status,
            assigned_courier: deliveryData.assigned_courier || 'NONE',
            currentCourier: user.uid,
            hasAssignedCourier,
            isAssignedToMe,
            isActiveStatus,
            hasAcceptedTime,
            isNotReadyStatus,
            accepted_time: deliveryData.accepted_time || 'NONE'
          });
          
          // ✅ MUST meet ALL conditions:
          // 1. Has assigned_courier field (not null/empty)
          // 2. assigned_courier matches current user EXACTLY
          // 3. Has active status (מקבל, etc.) - NOT ready/waiting status
          // 4. Has accepted_time (proof it was accepted by clicking accept button)
          // 5. Status is NOT a "ready" or "waiting" status
          if (hasAssignedCourier && isAssignedToMe && isActiveStatus && hasAcceptedTime && isNotReadyStatus) {
            console.log(`✅ [ActiveJob] Found valid active delivery: ${deliveryId}`);
            activeDeliveryId = deliveryId;
            activeDeliveryData = deliveryData;
          } else {
            console.log(`❌ [ActiveJob] Skipping delivery ${deliveryId} - not properly assigned or accepted by this courier`);
          }
        });
        
        if (!activeDeliveryId || !activeDeliveryData) {
          console.log('📦 [ActiveJob] No active delivery found for this courier');
          setDelivery(null);
          setIsLoading(false);
          return;
        }
        
        console.log(`📦 [ActiveJob] Found active delivery: ${activeDeliveryId}`);
        
        // Use the delivery data we already have
        const dbDelivery = activeDeliveryData as DBDelivery;
        const deliveryId = activeDeliveryId as string;
        // ✅ Build complete delivery address with building number
        const deliveryAddress = dbDelivery.delivery_address || 
          `${dbDelivery.delivery_street || ''} ${dbDelivery.delivery_building_number || ''}, ${dbDelivery.delivery_city || ''}`.trim();
        
        // המר ל-Delivery
        const mappedDelivery: Delivery = {
          id: deliveryId,
          order_number: deliveryId.substring(0, 8).toUpperCase(),
          customer_name: dbDelivery.customer_name,
          customer_phone: dbDelivery.customer_phone,
          package_description: dbDelivery.package_description,
          pickup_address: dbDelivery.pickup_address,
          pickup_phone: dbDelivery.customer_phone,
          delivery_address: deliveryAddress,
          delivery_notes: dbDelivery.delivery_notes || '',
          payment_amount: 0,
          status: mapStatusToEnglish(dbDelivery.status),
          required_vehicle_type: mapVehicleType(dbDelivery.vehicle_type),
          accepted_time: dbDelivery.accepted_time,
          pickup_time: dbDelivery.pickup_time,
          delivery_time: dbDelivery.delivery_time,
          estimated_distance: '0 km',
          estimated_duration: '0 min',
          created_at: dbDelivery.createdAt,
          updated_at: dbDelivery.createdAt,
        };
        
        console.log(`✅ [ActiveJob] Loaded/Updated delivery:`, {
          id: mappedDelivery.id,
          status: mappedDelivery.status,
          customer: mappedDelivery.customer_name,
          is_batched: dbDelivery.is_batched,
          batch_id: dbDelivery.batch_id,
          delivery1_completed: dbDelivery.delivery1_completed,
          delivery2_completed: dbDelivery.delivery2_completed,
          courier_arrived_pickup1: dbDelivery.courier_arrived_pickup1,
          courier_arrived_pickup2: dbDelivery.courier_arrived_pickup2,
          business1_confirmed_pickup: dbDelivery.business1_confirmed_pickup,
          business2_confirmed_pickup: dbDelivery.business2_confirmed_pickup
        });
        setDelivery(mappedDelivery);
        
        // ✅ Load batch delivery completion states
        if (dbDelivery.is_batched) {
          setDelivery1Completed(dbDelivery.delivery1_completed || false);
          setDelivery2Completed(dbDelivery.delivery2_completed || false);
          // ✅ Load cross-business pickup states
          setCourierArrivedPickup1(dbDelivery.courier_arrived_pickup1 || false);
          setCourierArrivedPickup2(dbDelivery.courier_arrived_pickup2 || false);
          // Business confirmation is per-delivery, so first delivery is this one
          setBusiness1ConfirmedPickup(dbDelivery.business_confirmed_pickup || false);
        }

        // ✅ Check if this is a batched delivery and load the other delivery
        if (dbDelivery.is_batched && dbDelivery.batch_id) {
          console.log(`📦 [ActiveJob] This is a batched delivery, loading batch partner...`);
          
          // Find the other delivery in the batch from the snapshot we already have
          snapshot.forEach((childSnapshot) => {
            const otherDelivery = childSnapshot.val() as DBDelivery;
            const otherDeliveryId = childSnapshot.key!;
            
            if (
              otherDelivery.batch_id === dbDelivery.batch_id &&
              otherDeliveryId !== deliveryId &&
              otherDelivery.is_batched
            ) {
              // ✅ Build complete delivery address with building number
              const otherDeliveryAddress = otherDelivery.delivery_address || 
                `${otherDelivery.delivery_street || ''} ${otherDelivery.delivery_building_number || ''}, ${otherDelivery.delivery_city || ''}`.trim();
              
              const mappedBatchDelivery: Delivery = {
                id: otherDeliveryId,
                order_number: otherDeliveryId.substring(0, 8).toUpperCase(),
                customer_name: otherDelivery.customer_name,
                customer_phone: otherDelivery.customer_phone,
                package_description: otherDelivery.package_description,
                pickup_address: otherDelivery.pickup_address,
                pickup_phone: otherDelivery.customer_phone,
                delivery_address: otherDeliveryAddress,
                delivery_notes: otherDelivery.delivery_notes || '',
                payment_amount: 0,
                status: mapStatusToEnglish(otherDelivery.status),
                required_vehicle_type: mapVehicleType(otherDelivery.vehicle_type),
                accepted_time: otherDelivery.accepted_time,
                pickup_time: otherDelivery.pickup_time,
                delivery_time: otherDelivery.delivery_time,
                estimated_distance: '0 km',
                estimated_duration: '0 min',
                created_at: otherDelivery.createdAt,
                updated_at: otherDelivery.createdAt,
              };
              
              // ✅ Check if this is a cross-business batch
              const business1 = dbDelivery.business_email || dbDelivery.business_name;
              const business2 = otherDelivery.business_email || otherDelivery.business_name;
              const isCrossBusiness = business1 !== business2;
              
              console.log(`✅ [ActiveJob] Found batch partner:`, {
                id: mappedBatchDelivery.id,
                customer: mappedBatchDelivery.customer_name,
                business1,
                business2,
                isCrossBusiness
              });
              
              // Store the batch delivery with cross-business flag
              (mappedBatchDelivery as any)._isCrossBusiness = isCrossBusiness;
              setBatchDelivery(mappedBatchDelivery);
              
              // ✅ Load business 2 confirmation status from batch partner
              if (isCrossBusiness) {
                setBusiness2ConfirmedPickup(otherDelivery.business_confirmed_pickup || false);
              }
            }
          });
        } else {
          // Not a batched delivery
          setBatchDelivery(null);
        }
        
        setIsLoading(false);
      });
      
      return () => unsubscribe();
    } catch (error) {
      console.error("❌ [ActiveJob] Error loading delivery:", error);
      setDelivery(null);
      setIsLoading(false);
    }
  };
  
  const mapStatusToEnglish = (hebrewStatus: string): Delivery['status'] => {
    const mapping: Record<string, Delivery['status']> = {
      'ממתין': 'available',
      'מקבל': 'accepted',
      'הגיע לנקודת איסוף': 'arrived_pickup',
      'נאסף': 'picked_up',
      'הגיע ליעד': 'arrived_delivery',
      'הושלם': 'delivered',
      'בוטל': 'cancelled'
    };
    return mapping[hebrewStatus] || 'available';
  };
  
  const mapVehicleType = (hebrewType: string): 'bike' | 'motorcycle' | 'car' | 'truck' => {
    const mapping: Record<string, 'bike' | 'motorcycle' | 'car' | 'truck'> = {
      'אופניים': 'bike',
      'קטנוע': 'motorcycle',
      'רכב': 'car',
      'משאית': 'truck'
    };
    return mapping[hebrewType] || 'motorcycle';
  };

  const updateStatus = async (newStatus: string) => {
    if (!user || !delivery) {
      console.error('❌ [ActiveJob] Cannot update status - no user or delivery');
      return;
    }

    // ✅ NEW: Lock mechanism - courier cannot advance from "arrived_pickup" without business confirmation
    if (delivery.status === 'arrived_pickup' && newStatus === 'picked_up') {
      // Check if business owner already confirmed pickup in DB
      const deliveryRef = ref(db, `Deliveries/${delivery.id}`);
      const snapshot = await get(deliveryRef);
      
      if (snapshot.exists()) {
        const dbDelivery = snapshot.val();
        if (dbDelivery.status !== 'נאסף' && dbDelivery.status !== 'picked_up') {
          // Business hasn't confirmed yet - show message and block
          alert('⏳ ממתין לאישור בעל העסק...\n\nבעל העסק צריך לאשר שהחבילה נאספה לפני שתוכל להמשיך.');
          console.warn('🔒 [ActiveJob] Pickup blocked - awaiting business confirmation');
          setIsUpdating(false);
          return;
        }
      }
    }

    setIsUpdating(true);
    try {
      console.log(`📝 [ActiveJob] Updating status to ${newStatus}`);
      
      const success = await updateDeliveryStatus(delivery.id, user.uid, newStatus);
      
      if (success) {
        console.log('✅ [ActiveJob] Status updated successfully');
        
        // עדכן את הסטטוס המקומי
        const updates: Partial<Delivery> = { status: newStatus as any };
        
        const timestamp = new Date().toISOString();
        if (newStatus === "picked_up") {
          updates.pickup_time = timestamp;
        } else if (newStatus === "delivered") {
          updates.delivery_time = timestamp;
        }
        
        setDelivery({ ...delivery, ...updates });
        
        // אם המשלוח הושלם, חזור לדף הבית אחרי 2 שניות
        if (newStatus === "delivered") {
          setTimeout(() => {
            navigate("/");
          }, 2000);
        }
      } else {
        console.error('❌ [ActiveJob] Failed to update status');
        // TODO: Show error message to user
      }
    } catch (error) {
      console.error('❌ [ActiveJob] Error updating status:', error);
      // TODO: Show error message to user
    }
    setIsUpdating(false);
  };

  // ✅ Mark arrival at first business (cross-business batch)
  const markArrivedPickup1 = async () => {
    if (!user || !delivery) return;
    
    setIsUpdating(true);
    try {
      console.log('📦 [ActiveJob] Marking arrival at business 1');
      
      const timestamp = new Date().toISOString();
      const deliveryRef = ref(db, `Deliveries/${delivery.id}`);
      
      await update(deliveryRef, {
        courier_arrived_pickup1: true,
        status: 'courier_at_pickup1',
        updated_at: timestamp
      });
      
      setCourierArrivedPickup1(true);
      console.log('✅ [ActiveJob] Marked arrived at business 1');
    } catch (error) {
      console.error('❌ [ActiveJob] Error marking arrival at business 1:', error);
      alert('שגיאה בעדכון המיקום');
    }
    setIsUpdating(false);
  };

  // ✅ Mark arrival at second business (cross-business batch)
  const markArrivedPickup2 = async () => {
    if (!user || !delivery) return;
    
    setIsUpdating(true);
    try {
      console.log('📦 [ActiveJob] Marking arrival at business 2');
      
      const timestamp = new Date().toISOString();
      const deliveryRef = ref(db, `Deliveries/${delivery.id}`);
      
      await update(deliveryRef, {
        courier_arrived_pickup2: true,
        status: 'courier_at_pickup2',
        updated_at: timestamp
      });
      
      setCourierArrivedPickup2(true);
      console.log('✅ [ActiveJob] Marked arrived at business 2');
    } catch (error) {
      console.error('❌ [ActiveJob] Error marking arrival at business 2:', error);
      alert('שגיאה בעדכון המיקום');
    }
    setIsUpdating(false);
  };

  // ✅ Complete first delivery in batch
  const completeDelivery1 = async () => {
    if (!user || !delivery || !batchDelivery) return;
    
    setIsUpdating(true);
    try {
      console.log('📦 [ActiveJob] Completing delivery 1');
      
      const timestamp = new Date().toISOString();
      const deliveryRef = ref(db, `Deliveries/${delivery.id}`);
      
      await update(deliveryRef, {
        delivery1_completed: true,
        delivery1_time: timestamp,
        updated_at: timestamp
      });
      
      setDelivery1Completed(true);
      console.log('✅ [ActiveJob] Delivery 1 marked as completed');
      
      // If both are completed, mark entire batch as delivered
      if (delivery2Completed) {
        await updateStatus("delivered");
      }
    } catch (error) {
      console.error('❌ [ActiveJob] Error completing delivery 1:', error);
      alert('שגיאה בעדכון המשלוח');
    }
    setIsUpdating(false);
  };

  // ✅ Complete second delivery in batch
  const completeDelivery2 = async () => {
    if (!user || !delivery || !batchDelivery) return;
    
    setIsUpdating(true);
    try {
      console.log('📦 [ActiveJob] Completing delivery 2');
      
      const timestamp = new Date().toISOString();
      const deliveryRef = ref(db, `Deliveries/${delivery.id}`);
      
      await update(deliveryRef, {
        delivery2_completed: true,
        delivery2_time: timestamp,
        updated_at: timestamp
      });
      
      setDelivery2Completed(true);
      console.log('✅ [ActiveJob] Delivery 2 marked as completed');
      
      // If both are completed, mark entire batch as delivered
      if (delivery1Completed) {
        await updateStatus("delivered");
      }
    } catch (error) {
      console.error('❌ [ActiveJob] Error completing delivery 2:', error);
      alert('שגיאה בעדכון המשלוח');
    }
    setIsUpdating(false);
  };

  const openGoogleMaps = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, "_blank");
  };
  
  const openWaze = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    // Waze URL scheme
    window.open(`https://waze.com/ul?q=${encodedAddress}&navigate=yes`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="h-screen bg-gray-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="p-4 text-center py-16">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">אין משלוח פעיל</h2>
        <p className="text-gray-600 mb-4">קבל הזמנה כדי להתחיל לשלוח</p>
        <Button
          onClick={() => navigate("/")}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <ArrowRight className="w-4 h-4" />
          חזור למשלוחים זמינים
        </Button>
      </div>
    );
  }

  const getNextAction = () => {
    const isCrossBusiness = batchDelivery && (batchDelivery as any)._isCrossBusiness;
    
    // ✅ STRICT ENFORCEMENT: Cross-business batch workflow
    if (isCrossBusiness) {
      // Step 1: Courier marks arrival at business 1
      if (delivery.status === "accepted" && !courierArrivedPickup1) {
        return { 
          label: "הגעתי לעסק הראשון (🟠)", 
          action: markArrivedPickup1, 
          color: "orange",
          type: "custom"
        };
      }
      
      // Step 2: Wait for business 1 to confirm pickup
      if (courierArrivedPickup1 && !business1ConfirmedPickup) {
        return { 
          label: "⏳ ממתין לאישור עסק ראשון...", 
          color: "gray",
          type: "waiting",
          disabled: true
        };
      }
      
      // Step 3: Courier marks arrival at business 2
      if (business1ConfirmedPickup && !courierArrivedPickup2) {
        return { 
          label: "הגעתי לעסק השני (🟡)", 
          action: markArrivedPickup2, 
          color: "yellow",
          type: "custom"
        };
      }
      
      // Step 4: Wait for business 2 to confirm pickup
      if (courierArrivedPickup2 && !business2ConfirmedPickup) {
        return { 
          label: "⏳ ממתין לאישור עסק שני...", 
          color: "gray",
          type: "waiting",
          disabled: true
        };
      }
      
      // Step 5: Both businesses confirmed, can go to delivery
      if (business2ConfirmedPickup && delivery.status !== "picked_up" && delivery.status !== "arrived_delivery") {
        return { 
          label: "הגעתי ליעד", 
          status: "arrived_delivery", 
          color: "purple" 
        };
      }
    }
    
    // ✅ Regular workflow for single business or normal deliveries
    switch (delivery.status) {
      case "accepted":
        if (isCrossBusiness) {
          // Already handled above
          return null;
        }
        return { label: "הגעתי לנקודת איסוף", status: "arrived_pickup", color: "blue" };
      case "arrived_pickup":
        return { label: "אספתי את החבילה", status: "picked_up", color: "orange" };
      case "picked_up":
        return { label: "הגעתי ליעד", status: "arrived_delivery", color: "purple" };
      case "arrived_delivery":
        return { label: "השלמתי את המשלוח", status: "delivered", color: "green" };
      case "courier_at_pickup1" as any:
      case "courier_at_pickup2" as any:
        // These are intermediate states for cross-business, return null to use the logic above
        return null;
      default:
        return null;
    }
  };

  const nextAction = getNextAction();
  const showPickupNav = delivery.status === "accepted" || delivery.status === "arrived_pickup" || (delivery.status as any) === "courier_at_pickup1" || (delivery.status as any) === "courier_at_pickup2";
  const showDeliveryNav = delivery.status === "picked_up" || delivery.status === "arrived_delivery";

  return (
    <div className="p-4 pb-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="mb-4 border-2 border-blue-200">
          <CardContent className="p-4">
            {batchDelivery && (
              <div className={`mb-3 border-2 rounded-lg p-3 ${
                (batchDelivery as any)._isCrossBusiness 
                  ? 'bg-gradient-to-r from-orange-100 to-yellow-100 border-orange-400'
                  : 'bg-gradient-to-r from-purple-100 to-pink-100 border-purple-300'
              }`}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge className={`text-white hover:bg-opacity-90 ${
                    (batchDelivery as any)._isCrossBusiness 
                      ? 'bg-orange-600 hover:bg-orange-600' 
                      : 'bg-purple-600 hover:bg-purple-600'
                  }`}>
                    🎁 משלוח כפול
                  </Badge>
                  {(batchDelivery as any)._isCrossBusiness && (
                    <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white animate-pulse">
                      🏪🏪 משני עסקים שונים!
                    </Badge>
                  )}
                  <span className={`text-sm font-bold ${
                    (batchDelivery as any)._isCrossBusiness ? 'text-orange-900' : 'text-purple-900'
                  }`}>
                    2 משלוחים באותו אזור!
                  </span>
                </div>
                <p className={`text-xs ${
                  (batchDelivery as any)._isCrossBusiness ? 'text-orange-800' : 'text-purple-800'
                }`}>
                  {(batchDelivery as any)._isCrossBusiness 
                    ? 'אסוף מ-2 עסקים שונים ותמסור ל-2 לקוחות - הכנסה כפולה! 💰'
                    : 'אסוף חבילה אחת ותמסור ל-2 לקוחות'
                  }
                </p>
              </div>
            )}
            <div className="flex items-start justify-between mb-3">
              <div>
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 mb-2">
                  {delivery.order_number || `#${delivery.id.slice(0, 8)}`}
                </Badge>
                <h2 className="text-xl font-bold text-gray-900">{delivery.customer_name}</h2>
                <p className="text-gray-600">{delivery.package_description}</p>
              </div>
              {(delivery.price || delivery.payment_amount) && (
                <div className="text-right bg-green-50 rounded-xl p-3 border-2 border-green-200">
                  <p className="text-xs text-green-700 font-medium">💰 ההכנסה שלך</p>
                  <p className="text-3xl font-bold text-green-600">₪{delivery.price || delivery.payment_amount}</p>
                  {delivery.distance_km && (
                    <p className="text-xs text-gray-600 mt-1">📍 מרחק: {delivery.distance_km} ק"מ</p>
                  )}
                  <p className="text-[10px] text-gray-500 mt-1">*לאחר עמלת פלטפורמה (15%)</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <StatusTimeline
          currentStatus={delivery.status}
          timestamps={{
            accepted: delivery.accepted_time,
            picked_up: delivery.pickup_time,
            delivered: delivery.delivery_time
          }}
        />

        <div className="mt-4 space-y-3">
          {/* Pickup Location Card */}
          <Card className={showPickupNav ? "border-2 border-blue-300" : ""}>
            <CardContent className="p-4">
              {batchDelivery && (batchDelivery as any)._isCrossBusiness ? (
                // Cross-business batch: Show both pickup addresses with business names and linked deliveries
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Package className="w-5 h-5 text-orange-600" />
                    נקודות איסוף (2 עסקים שונים)
                  </h3>
                  
                  {/* Pickup 1 - Business 1 */}
                  <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                        1
                      </div>
                      <div className="flex-1">
                        <div className="bg-orange-600 text-white px-2 py-1 rounded text-xs font-bold inline-block mb-2">
                          עסק ראשון 🏪
                        </div>
                        <p className="text-gray-700 text-sm font-medium mb-1">{delivery.pickup_address}</p>
                        {delivery.pickup_phone && (
                          <a href={`tel:${delivery.pickup_phone}`} className="flex items-center gap-1 text-sm text-blue-600 mb-2">
                            <Phone className="w-3 h-3" />
                            {delivery.pickup_phone}
                          </a>
                        )}
                        <div className="mt-2 pt-2 border-t border-orange-200">
                          <p className="text-xs text-orange-800 font-semibold mb-1">📦 משלוח מעסק זה:</p>
                          <p className="text-xs text-gray-700">• {delivery.customer_name} - {delivery.delivery_address}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Pickup 2 - Business 2 */}
                  <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-yellow-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                        2
                      </div>
                      <div className="flex-1">
                        <div className="bg-yellow-600 text-white px-2 py-1 rounded text-xs font-bold inline-block mb-2">
                          עסק שני 🏪
                        </div>
                        <p className="text-gray-700 text-sm font-medium mb-1">{batchDelivery.pickup_address}</p>
                        {batchDelivery.pickup_phone && (
                          <a href={`tel:${batchDelivery.pickup_phone}`} className="flex items-center gap-1 text-sm text-blue-600 mb-2">
                            <Phone className="w-3 h-3" />
                            {batchDelivery.pickup_phone}
                          </a>
                        )}
                        <div className="mt-2 pt-2 border-t border-yellow-200">
                          <p className="text-xs text-yellow-800 font-semibold mb-1">📦 משלוח מעסק זה:</p>
                          <p className="text-xs text-gray-700">• {batchDelivery.customer_name} - {batchDelivery.delivery_address}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Critical Warning Banner for Cross-Business */}
                  <div className="bg-gradient-to-r from-red-100 via-orange-100 to-yellow-100 border-2 border-red-400 rounded-lg p-4 animate-pulse">
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">⚠️</div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-red-900 mb-2">
                          חשוב מאוד! משלוח כפול מ-2 עסקים שונים
                        </p>
                        <div className="space-y-1 text-xs text-orange-900">
                          <p className="flex items-center gap-2">
                            <span className="font-bold">✓</span>
                            <span>הגע לעסק הראשון (🟠 כתום) ואסוף את החבילה</span>
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="font-bold">✓</span>
                            <span>וודא שבעל העסק הראשון אישר את האיסוף במערכת שלו</span>
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="font-bold">✓</span>
                            <span>הגע לעסק השני (🟡 צהוב) ואסוף את החבילה</span>
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="font-bold">✓</span>
                            <span>וודא שבעל העסק השני אישר את האיסוף במערכת שלו</span>
                          </p>
                          <p className="flex items-center gap-2 mt-2 font-bold text-red-800">
                            <span>⚠️</span>
                            <span>רק אחרי שני האישורים תוכל להמשיך למשלוח ללקוחות!</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Regular delivery or single-business batch
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">מיקום איסוף</h3>
                    <p className="text-gray-700 mb-2">{delivery.pickup_address}</p>
                    {delivery.pickup_phone && (
                      <a href={`tel:${delivery.pickup_phone}`} className="flex items-center gap-1 text-sm text-blue-600">
                        <Phone className="w-3 h-3" />
                        {delivery.pickup_phone}
                      </a>
                    )}
                  </div>
                </div>
              )}
              {showPickupNav && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Button
                    onClick={() => openWaze(delivery.pickup_address)}
                    variant="outline"
                    className="border-blue-300 text-blue-600 hover:bg-blue-50"
                  >
                    <Navigation className="w-4 h-4 ml-2" />
                    Waze
                  </Button>
                <Button
                    onClick={() => openGoogleMaps(delivery.pickup_address)}
                  variant="outline"
                    className="border-blue-300 text-blue-600 hover:bg-blue-50"
                >
                    <Navigation className="w-4 h-4 ml-2" />
                    Google Maps
                </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Location Card(s) */}
          {batchDelivery ? (
            <>
              {/* First Delivery - Match pickup colors for cross-business */}
              <Card className={showDeliveryNav ? 
                `border-2 ${(batchDelivery as any)._isCrossBusiness ? 'border-orange-300 bg-orange-50/30' : 'border-green-300'}` : 
                `${(batchDelivery as any)._isCrossBusiness ? 'border border-orange-200' : ''}`
              }>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      (batchDelivery as any)._isCrossBusiness ? 'bg-orange-100' : 'bg-green-100'
                    }`}>
                      <div className={`font-bold ${
                        (batchDelivery as any)._isCrossBusiness ? 'text-orange-600' : 'text-green-600'
                      }`}>1</div>
                    </div>
                    <div className="flex-1">
                      {(batchDelivery as any)._isCrossBusiness && (
                        <div className="bg-orange-600 text-white px-2 py-0.5 rounded text-xs font-bold inline-block mb-1">
                          מעסק ראשון 🏪
                        </div>
                      )}
                      <h3 className="font-semibold text-gray-900 mb-1">משלוח ראשון</h3>
                      <p className="text-sm text-gray-600 mb-1">{delivery.customer_name}</p>
                      <p className="text-gray-700 mb-2">{delivery.delivery_address}</p>
                      <a href={`tel:${delivery.customer_phone}`} className="flex items-center gap-1 text-sm text-blue-600">
                        <Phone className="w-3 h-3" />
                        {delivery.customer_phone}
                      </a>
                      <p className="text-xs text-gray-500 mt-1">📦 {delivery.package_description}</p>
                    </div>
                  </div>
                  {showDeliveryNav && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <Button
                        onClick={() => openWaze(delivery.delivery_address)}
                        variant="outline"
                        className={`${(batchDelivery as any)._isCrossBusiness ? 
                          'border-orange-300 text-orange-600 hover:bg-orange-50' : 
                          'border-green-300 text-green-600 hover:bg-green-50'
                        }`}
                      >
                        <Navigation className="w-4 h-4 ml-2" />
                        Waze
                      </Button>
                      <Button
                        onClick={() => openGoogleMaps(delivery.delivery_address)}
                        variant="outline"
                        className={`${(batchDelivery as any)._isCrossBusiness ? 
                          'border-orange-300 text-orange-600 hover:bg-orange-50' : 
                          'border-green-300 text-green-600 hover:bg-green-50'
                        }`}
                      >
                        <Navigation className="w-4 h-4 ml-2" />
                        Google Maps
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Second Delivery - Match pickup colors for cross-business */}
              <Card className={showDeliveryNav ? 
                `border-2 ${(batchDelivery as any)._isCrossBusiness ? 'border-yellow-300 bg-yellow-50/30' : 'border-purple-300'}` : 
                `${(batchDelivery as any)._isCrossBusiness ? 'border border-yellow-200' : ''}`
              }>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      (batchDelivery as any)._isCrossBusiness ? 'bg-yellow-100' : 'bg-purple-100'
                    }`}>
                      <div className={`font-bold ${
                        (batchDelivery as any)._isCrossBusiness ? 'text-yellow-700' : 'text-purple-600'
                      }`}>2</div>
                    </div>
                    <div className="flex-1">
                      {(batchDelivery as any)._isCrossBusiness && (
                        <div className="bg-yellow-600 text-white px-2 py-0.5 rounded text-xs font-bold inline-block mb-1">
                          מעסק שני 🏪
                        </div>
                      )}
                      <h3 className="font-semibold text-gray-900 mb-1">משלוח שני</h3>
                      <p className="text-sm text-gray-600 mb-1">{batchDelivery.customer_name}</p>
                      <p className="text-gray-700 mb-2">{batchDelivery.delivery_address}</p>
                      <a href={`tel:${batchDelivery.customer_phone}`} className="flex items-center gap-1 text-sm text-blue-600">
                        <Phone className="w-3 h-3" />
                        {batchDelivery.customer_phone}
                      </a>
                      <p className="text-xs text-gray-500 mt-1">📦 {batchDelivery.package_description}</p>
                    </div>
                  </div>
                  {showDeliveryNav && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <Button
                        onClick={() => openWaze(batchDelivery.delivery_address)}
                        variant="outline"
                        className={`${(batchDelivery as any)._isCrossBusiness ? 
                          'border-yellow-300 text-yellow-700 hover:bg-yellow-50' : 
                          'border-purple-300 text-purple-600 hover:bg-purple-50'
                        }`}
                      >
                        <Navigation className="w-4 h-4 ml-2" />
                        Waze
                      </Button>
                      <Button
                        onClick={() => openGoogleMaps(batchDelivery.delivery_address)}
                        variant="outline"
                        className={`${(batchDelivery as any)._isCrossBusiness ? 
                          'border-yellow-300 text-yellow-700 hover:bg-yellow-50' : 
                          'border-purple-300 text-purple-600 hover:bg-purple-50'
                        }`}
                      >
                        <Navigation className="w-4 h-4 ml-2" />
                        Google Maps
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            /* Single Delivery */
            <Card className={showDeliveryNav ? "border-2 border-green-300" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">מיקום משלוח</h3>
                    <p className="text-gray-700 mb-2">{delivery.delivery_address}</p>
                    <a href={`tel:${delivery.customer_phone}`} className="flex items-center gap-1 text-sm text-blue-600">
                      <Phone className="w-3 h-3" />
                      {delivery.customer_phone}
                    </a>
                  </div>
                </div>
                {showDeliveryNav && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <Button
                      onClick={() => openWaze(delivery.delivery_address)}
                      variant="outline"
                      className="border-green-300 text-green-600 hover:bg-green-50"
                    >
                      <Navigation className="w-4 h-4 ml-2" />
                      Waze
                    </Button>
                    <Button
                      onClick={() => openGoogleMaps(delivery.delivery_address)}
                      variant="outline"
                      className="border-green-300 text-green-600 hover:bg-green-50"
                    >
                      <Navigation className="w-4 h-4 ml-2" />
                      Google Maps
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {delivery.delivery_notes && (
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1">הוראות מיוחדות</h3>
                <p className="text-gray-700">{delivery.delivery_notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ✅ Separate completion buttons for batch deliveries */}
        {batchDelivery && delivery.status === "arrived_delivery" ? (
          <div className="mt-4 space-y-3">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 mb-3">
              <p className="text-sm font-bold text-blue-900 text-center">
                📦 משלוח כפול - סמן כל לקוח בנפרד לאחר המסירה
              </p>
            </div>
            
            {/* First Delivery Button */}
            <Button
              onClick={completeDelivery1}
              disabled={isUpdating || delivery1Completed}
              className={`w-full font-semibold py-6 text-lg ${
                delivery1Completed
                  ? 'bg-gray-400 cursor-not-allowed'
                  : (batchDelivery as any)._isCrossBusiness
                    ? 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
              } text-white`}
            >
              {delivery1Completed ? (
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  ✓ משלוח ראשון הושלם ({delivery.customer_name})
                </span>
              ) : isUpdating ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  מעדכן...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  השלמתי משלוח ראשון ({delivery.customer_name})
                </span>
              )}
            </Button>

            {/* Second Delivery Button */}
            <Button
              onClick={completeDelivery2}
              disabled={isUpdating || delivery2Completed}
              className={`w-full font-semibold py-6 text-lg ${
                delivery2Completed
                  ? 'bg-gray-400 cursor-not-allowed'
                  : (batchDelivery as any)._isCrossBusiness
                    ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800'
                    : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
              } text-white`}
            >
              {delivery2Completed ? (
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  ✓ משלוח שני הושלם ({batchDelivery.customer_name})
                </span>
              ) : isUpdating ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  מעדכן...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  השלמתי משלוח שני ({batchDelivery.customer_name})
                </span>
              )}
            </Button>

            {/* Show success message when both completed */}
            {delivery1Completed && delivery2Completed && (
              <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 animate-pulse">
                <p className="text-center font-bold text-green-900">
                  🎉 מעולה! שני המשלוחים הושלמו בהצלחה
                </p>
                <p className="text-center text-sm text-green-700 mt-1">
                  חוזר לדף הבית...
                </p>
              </div>
            )}
          </div>
        ) : nextAction && (
          <Button
            onClick={() => {
              // ✅ Handle custom actions (for cross-business pickups)
              if ((nextAction as any).type === 'custom' && (nextAction as any).action) {
                (nextAction as any).action();
              } else if (nextAction.status) {
                updateStatus(nextAction.status);
              }
            }}
            disabled={isUpdating || (nextAction as any).disabled}
            className={`w-full mt-4 font-semibold py-6 text-lg ${
              nextAction.color === 'green' 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                : nextAction.color === 'orange'
                ? 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800'
                : nextAction.color === 'yellow'
                ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800'
                : nextAction.color === 'purple'
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
                : nextAction.color === 'gray'
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
            } text-white`}
          >
            {isUpdating ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              מעדכן...
              </span>
            ) : (nextAction as any).type === 'waiting' ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {nextAction.label}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                {nextAction.label}
              </span>
            )}
          </Button>
        )}
      </motion.div>
    </div>
  );
}
