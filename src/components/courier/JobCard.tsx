import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, DollarSign, Navigation2, AlertCircle, Bike, Car, Truck } from "lucide-react";
import { motion } from "framer-motion";
import { Delivery } from "@/types";
import { useAuth } from "@/context/AuthContext";

interface JobCardProps {
  delivery: Delivery;
  onClick: () => void;
  onAccept?: () => void;
  onSelect?: () => void;
  isSelected?: boolean;
  isAvailable?: boolean;
}

export default function JobCard({ delivery, onClick, onAccept, onSelect, isSelected = false, isAvailable: propIsAvailable }: JobCardProps) {
  const { user } = useAuth();
  const isAvailable = propIsAvailable !== undefined ? propIsAvailable : (user?.isAvailable || false);

  // חשב זמן נסיעה לפי סוג הרכב
  const calculateTravelTime = (distanceKm: number, vehicleType: string): string => {
    if (!distanceKm) return '0 דק';
    
    // מהירויות ממוצעות לפי סוג רכב (קמ"ש)
    const speeds = {
      bike: 15,        // אופניים
      motorcycle: 25,  // אופנוע
      car: 30,         // רכב
      truck: 20        // משאית
    };
    
    const speed = speeds[vehicleType as keyof typeof speeds] || 20;
    const timeInMinutes = Math.round((distanceKm / speed) * 60);
    
    return `${timeInMinutes} דק`;
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

  const handleAcceptClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (isAvailable && onAccept) {
      onAccept();
    }
  };

  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (onSelect) {
      onSelect();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        className={`cursor-pointer hover:shadow-lg transition-all border-2 ${
          isSelected 
            ? 'border-blue-500 bg-blue-50 shadow-md' 
            : isAvailable 
              ? 'hover:border-blue-300' 
              : 'border-gray-200 opacity-75'
        }`}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                  {delivery.order_number || `#${delivery.id.slice(0, 8)}`}
                </Badge>
                {(delivery.price || delivery.payment_amount) && (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                    <DollarSign className="w-3 h-3 mr-1" />
                    ₪{delivery.price || delivery.payment_amount}
                  </Badge>
                )}
                {delivery.distance_km && (
                  <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                    📍 {delivery.distance_km} ק"מ
                  </Badge>
                )}
                <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                  {(() => {
                    const Icon = vehicleIcons[delivery.required_vehicle_type];
                    return <Icon className="w-3 h-3 mr-1" />;
                  })()}
                  {vehicleLabels[delivery.required_vehicle_type]}
                </Badge>
              </div>
              <h3 className="font-semibold text-gray-900 text-lg">{delivery.customer_name}</h3>
              <p className="text-sm text-gray-600">{delivery.package_description}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-0.5">איסוף</p>
                <p className="text-sm font-medium text-gray-900 truncate">{delivery.pickup_address}</p>
              </div>
            </div>

            <div className="flex items-center pl-3">
              <div className="w-px h-4 bg-gray-300" />
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-0.5">משלוח</p>
                <p className="text-sm font-medium text-gray-900 truncate">{delivery.delivery_address}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 pt-3 border-t">
            {delivery.distance_km && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Navigation2 className="w-4 h-4" />
                <span>{delivery.distance_km} ק"מ</span>
              </div>
            )}
            {delivery.distance_km && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{calculateTravelTime(delivery.distance_km, delivery.required_vehicle_type)}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-4 pt-3 border-t space-y-2">
            {!isAvailable ? (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">עבור למצב זמין כדי לקבל משלוחים</p>
                  <p className="text-xs text-gray-500">אתה צריך להיות זמין כדי לקבל משלוחים חדשים</p>
                </div>
              </div>
            ) : (
              <>
                {isSelected && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <p className="text-xs font-medium text-blue-700">משלוח זה מוצג במפה</p>
                  </div>
                )}
                <div className="flex gap-2">
                  {onSelect && (
                    <Button
                      onClick={handleSelectClick}
                      variant="outline"
                      className="flex-1 border-blue-500 text-blue-600 hover:bg-blue-50 font-semibold py-3"
                    >
                      צפה במסלול
                    </Button>
                  )}
                  <Button
                    onClick={handleAcceptClick}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3"
                  >
                    קבל משלוח
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
