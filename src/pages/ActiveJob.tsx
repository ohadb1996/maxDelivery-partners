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
import { ref, onValue, get } from 'firebase/database';
import { db } from "@/api/config/firebase.config";

import StatusTimeline from "@/components/courier/StatusTimeline";

// ממשק למשלוח מה-DB
interface DBDelivery {
  customer_name: string;
  customer_phone: string;
  delivery_city: string;
  delivery_street: string;
  delivery_floor: string;
  delivery_apartment: string;
  delivery_building_code?: string;
  package_description: string;
  vehicle_type: string;
  delivery_notes?: string;
  pickup_address: string;
  business_name: string;
  status: string;
  assigned_courier?: string;
  accepted_time?: string;
  pickup_time?: string;
  delivery_time?: string;
  createdAt: string;
  is_batched?: boolean;
  batch_id?: string;
}

export default function ActiveJob() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [batchDelivery, setBatchDelivery] = useState<Delivery | null>(null); // Second delivery in batch
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

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
          
          // STRICT CHECKS: Delivery must be EXPLICITLY assigned to this courier AND have accepted status
          const hasAssignedCourier = deliveryData.assigned_courier !== undefined && deliveryData.assigned_courier !== null;
          const isAssignedToMe = hasAssignedCourier && deliveryData.assigned_courier === user.uid;
          const isActiveStatus = deliveryData.status && activeStatuses.includes(deliveryData.status);
          const hasAcceptedTime = deliveryData.accepted_time !== undefined && deliveryData.accepted_time !== null;
          
          console.log(`📦 [ActiveJob] Checking delivery ${deliveryId}:`, {
            status: deliveryData.status,
            assigned_courier: deliveryData.assigned_courier || 'NONE',
            currentCourier: user.uid,
            hasAssignedCourier,
            isAssignedToMe,
            isActiveStatus,
            hasAcceptedTime,
            accepted_time: deliveryData.accepted_time || 'NONE'
          });
          
          // MUST meet ALL conditions:
          // 1. Has assigned_courier field
          // 2. assigned_courier matches current user
          // 3. Has active status (מקבל, etc.)
          // 4. Has accepted_time (proof it was accepted)
          if (hasAssignedCourier && isAssignedToMe && isActiveStatus && hasAcceptedTime) {
            console.log(`✅ [ActiveJob] Found valid active delivery: ${deliveryId}`);
            activeDeliveryId = deliveryId;
            activeDeliveryData = deliveryData;
          } else {
            console.log(`❌ [ActiveJob] Skipping delivery ${deliveryId} - not assigned or accepted by this courier`);
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
        const dbDelivery = activeDeliveryData;
        const deliveryAddress = `${dbDelivery.delivery_street || ''}, ${dbDelivery.delivery_city || ''}`.trim();
        
        // המר ל-Delivery
        const mappedDelivery: Delivery = {
          id: activeDeliveryId!,
          order_number: activeDeliveryId!.substring(0, 8).toUpperCase(),
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
          batch_id: dbDelivery.batch_id
        });
        setDelivery(mappedDelivery);

        // ✅ Check if this is a batched delivery and load the other delivery
        if (dbDelivery.is_batched && dbDelivery.batch_id) {
          console.log(`📦 [ActiveJob] This is a batched delivery, loading batch partner...`);
          
          // Find the other delivery in the batch from the snapshot we already have
          snapshot.forEach((childSnapshot) => {
            const otherDelivery = childSnapshot.val() as DBDelivery;
            const deliveryId = childSnapshot.key!;
            
            if (
              otherDelivery.batch_id === dbDelivery.batch_id &&
              deliveryId !== activeDeliveryId &&
              otherDelivery.is_batched
            ) {
              const otherDeliveryAddress = `${otherDelivery.delivery_street || ''}, ${otherDelivery.delivery_city || ''}`.trim();
              
              const mappedBatchDelivery: Delivery = {
                id: deliveryId,
                order_number: deliveryId.substring(0, 8).toUpperCase(),
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
              
              console.log(`✅ [ActiveJob] Found batch partner:`, {
                id: mappedBatchDelivery.id,
                customer: mappedBatchDelivery.customer_name
              });
              
              setBatchDelivery(mappedBatchDelivery);
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
    switch (delivery.status) {
      case "accepted":
        return { label: "הגעתי לנקודת איסוף", status: "arrived_pickup", color: "blue" };
      case "arrived_pickup":
        return { label: "אספתי את החבילה", status: "picked_up", color: "orange" };
      case "picked_up":
        return { label: "הגעתי ליעד", status: "arrived_delivery", color: "purple" };
      case "arrived_delivery":
        return { label: "השלמתי את המשלוח", status: "delivered", color: "green" };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();
  const showPickupNav = delivery.status === "accepted" || delivery.status === "arrived_pickup";
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
              <div className="mb-3 bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-purple-600 text-white hover:bg-purple-600">
                    🎁 משלוח כפול
                  </Badge>
                  <span className="text-sm font-bold text-purple-900">2 משלוחים באותו אזור!</span>
                </div>
                <p className="text-xs text-purple-800">אסוף חבילה אחת ותמסור ל-2 לקוחות</p>
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
              {/* First Delivery */}
              <Card className={showDeliveryNav ? "border-2 border-green-300" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <div className="text-green-600 font-bold">1</div>
                    </div>
                    <div className="flex-1">
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

              {/* Second Delivery */}
              <Card className={showDeliveryNav ? "border-2 border-purple-300" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <div className="text-purple-600 font-bold">2</div>
                    </div>
                    <div className="flex-1">
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
                        className="border-purple-300 text-purple-600 hover:bg-purple-50"
                      >
                        <Navigation className="w-4 h-4 ml-2" />
                        Waze
                      </Button>
                      <Button
                        onClick={() => openGoogleMaps(batchDelivery.delivery_address)}
                        variant="outline"
                        className="border-purple-300 text-purple-600 hover:bg-purple-50"
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

        {nextAction && (
          <Button
            onClick={() => updateStatus(nextAction.status)}
            disabled={isUpdating}
            className={`w-full mt-4 font-semibold py-6 text-lg ${
              nextAction.color === 'green' 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
            } text-white`}
          >
            {isUpdating ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              מעדכן...
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
