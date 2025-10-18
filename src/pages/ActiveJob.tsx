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
import { ref, onValue } from 'firebase/database';
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
}

export default function ActiveJob() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
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
      
      // שלוף את רשימת המשלוחים של השליח
      const collectedRef = ref(db, `Couriers/${user.uid}/CollectedDeliveries`);
      
      // הרשם לעדכונים בזמן אמת
      const unsubscribe = onValue(collectedRef, async (snapshot) => {
        if (!snapshot.exists()) {
          console.log('📦 [ActiveJob] No collected deliveries');
          setDelivery(null);
          setIsLoading(false);
          return;
        }
        
        // מצא משלוח פעיל (לא הושלם)
        let activeDeliveryId: string | null = null;
        
        snapshot.forEach((childSnapshot) => {
          const deliveryData = childSnapshot.val();
          if (deliveryData.status && deliveryData.status !== 'הושלם' && deliveryData.status !== 'בוטל') {
            activeDeliveryId = childSnapshot.key!;
          }
        });
        
        if (!activeDeliveryId) {
          console.log('📦 [ActiveJob] No active delivery found');
          setDelivery(null);
          setIsLoading(false);
          return;
        }
        
        console.log(`📦 [ActiveJob] Found active delivery: ${activeDeliveryId}`);
        
        // הרשם לעדכונים בזמן אמת של המשלוח עצמו
        const deliveryRef = ref(db, `Deliveries/${activeDeliveryId}`);
        const deliveryUnsubscribe = onValue(deliveryRef, (deliverySnapshot) => {
          if (deliverySnapshot.exists()) {
            const dbDelivery = deliverySnapshot.val() as DBDelivery;
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
              customer: mappedDelivery.customer_name
            });
            setDelivery(mappedDelivery);
          }
          
          setIsLoading(false);
        });
        
        // החזר unsubscribe עבור המשלוח
        return () => deliveryUnsubscribe();
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
            <div className="flex items-start justify-between mb-3">
              <div>
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 mb-2">
                  {delivery.order_number || `#${delivery.id.slice(0, 8)}`}
                </Badge>
                <h2 className="text-xl font-bold text-gray-900">{delivery.customer_name}</h2>
                <p className="text-gray-600">{delivery.package_description}</p>
              </div>
              {delivery.payment_amount && delivery.payment_amount > 0 && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">השתכרות</p>
                  <p className="text-lg font-bold text-green-600">₪{delivery.payment_amount}</p>
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

          {/* Delivery Location Card */}
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
