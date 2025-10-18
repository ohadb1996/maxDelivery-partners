import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, Clock, Navigation, Phone, Package, CheckCircle, AlertCircle, Bike, Car, Truck } from "lucide-react";
import { motion } from "framer-motion";
import { Delivery, VehicleType, canVehicleTakeDelivery } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { getDeliveryById, assignDeliveryToCourier } from "@/services/deliveryService";

export default function JobDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);

  const isAvailable = user?.isAvailable || false;
  const courierVehicleType: VehicleType = user?.vehicle_type || 'motorcycle'; // ברירת מחדל: קטנוע (יכול לקחת גם משלוחי אופניים)
  const canTakeThisDelivery = delivery ? canVehicleTakeDelivery(courierVehicleType, delivery.required_vehicle_type) : false;

  useEffect(() => {
    loadJobDetails();
  }, [id]);

  const loadJobDetails = async () => {
    setIsLoading(true);
    try {
      if (!id) {
        console.error('❌ [JobDetails] No delivery ID provided');
        setIsLoading(false);
        return;
      }

      console.log(`📦 [JobDetails] Loading delivery ${id}`);
      const deliveryData = await getDeliveryById(id);
      
      if (deliveryData) {
        console.log(`✅ [JobDetails] Loaded delivery:`, deliveryData);
        setDelivery(deliveryData);
      } else {
        console.error(`❌ [JobDetails] Delivery ${id} not found`);
        setDelivery(null);
      }
    } catch (error) {
      console.error("❌ [JobDetails] Error loading job details:", error);
      setDelivery(null);
    }
    setIsLoading(false);
  };

  const vehicleIcons = {
    bike: Bike,
    motorcycle: Bike, // נשתמש באייקון אופניים לאופנוע
    car: Car,
    truck: Truck
  };

  const vehicleLabels = {
    bike: 'אופניים',
    motorcycle: 'אופנוע',
    car: 'רכב',
    truck: 'משאית'
  };

  const acceptJob = async () => {
    if (!isAvailable) {
      console.log('❌ [JobDetails] Cannot accept job - user is offline');
      return;
    }

    if (!canTakeThisDelivery) {
      console.log('❌ [JobDetails] Cannot accept job - vehicle type not suitable');
      return;
    }

    if (!user || !delivery) {
      console.error('❌ [JobDetails] Cannot accept job - no user or delivery');
      return;
    }
    
    setIsAccepting(true);
    try {
      console.log('📝 [JobDetails] Accepting job:', delivery.id);
      
      const success = await assignDeliveryToCourier(delivery.id, user.uid);
      
      if (success) {
        console.log('✅ [JobDetails] Job accepted successfully');
        // עדכן את הסטטוס המקומי
        setDelivery({ ...delivery, status: "accepted", accepted_time: new Date().toISOString() });
        // נווט לדף המשלוח הפעיל
        navigate('/active');
      } else {
        console.error('❌ [JobDetails] Failed to accept job');
        // TODO: Show error message to user
      }
    } catch (error) {
      console.error('❌ [JobDetails] Error accepting job:', error);
      // TODO: Show error message to user
    }
    setIsAccepting(false);
  };

  const openMaps = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, "_blank");
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Job Not Found</h2>
        <p className="text-gray-600">The requested job could not be found</p>
      </div>
    );
  }

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
                
                {/* רמת התחבורה הנדרשת */}
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                    {(() => {
                      const Icon = vehicleIcons[delivery.required_vehicle_type];
                      return <Icon className="w-3 h-3 mr-1" />;
                    })()}
                    נדרש: {vehicleLabels[delivery.required_vehicle_type]}
                  </Badge>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                    {(() => {
                      const Icon = vehicleIcons[courierVehicleType];
                      return <Icon className="w-3 h-3 mr-1" />;
                    })()}
                    שלך: {vehicleLabels[courierVehicleType]}
                  </Badge>
                </div>
              </div>
              {delivery.payment_amount && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">השתכרות</p>
                  <p className="text-lg font-bold text-green-600">₪{delivery.payment_amount}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {/* Pickup Location Card */}
          <Card className="border-2 border-blue-300">
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
              <Button
                onClick={() => openMaps(delivery.pickup_address)}
                variant="outline"
                className="w-full mt-3 border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <Navigation className="w-4 h-4 ml-2" />
                ניווט לאיסוף
              </Button>
            </CardContent>
          </Card>

          {/* Delivery Location Card */}
          <Card className="border-2 border-green-300">
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
              <Button
                onClick={() => openMaps(delivery.delivery_address)}
                variant="outline"
                className="w-full mt-3 border-green-300 text-green-600 hover:bg-green-50"
              >
                <Navigation className="w-4 h-4 ml-2" />
                ניווט למשלוח
              </Button>
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

          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
            {delivery.estimated_distance && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Navigation className="w-4 h-4" />
                <span>{delivery.estimated_distance}</span>
              </div>
            )}
            {delivery.estimated_duration && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{delivery.estimated_duration}</span>
              </div>
            )}
          </div>
        </div>

        {/* Availability Alert */}
        {!isAvailable && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              אתה צריך להיות זמין כדי לקבל את המשלוח הזה. עבור למצב זמין בדשבורד תחילה.
            </AlertDescription>
          </Alert>
        )}

        {/* Vehicle Type Alert */}
        {!canTakeThisDelivery && (
          <Alert className="mb-4 border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              המשלוח הזה דורש {vehicleLabels[delivery.required_vehicle_type]} או רכב ברמה גבוהה יותר. 
              הרכב שלך ({vehicleLabels[courierVehicleType]}) לא מתאים למשלוח זה.
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={acceptJob}
          disabled={isAccepting || !isAvailable || !canTakeThisDelivery}
          className={`w-full mt-4 font-semibold py-6 text-lg ${
            isAvailable && canTakeThisDelivery
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
              : 'bg-gray-400 text-gray-600 cursor-not-allowed'
          }`}
        >
          {isAccepting ? (
            <span className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              מקבל...
            </span>
          ) : !isAvailable ? (
            <span className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              עבור למצב זמין כדי לקבל משלוח
            </span>
          ) : !canTakeThisDelivery ? (
            <span className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              סוג הרכב לא מתאים
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              קבל את המשלוח הזה
            </span>
          )}
        </Button>
      </motion.div>
    </div>
  );
}
