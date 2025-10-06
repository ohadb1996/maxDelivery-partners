import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation, Phone, MapPin, Package, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Delivery, User } from "@/types";

import StatusTimeline from "@/components/courier/StatusTimeline";

export default function ActiveJob() {
  const { id } = useParams<{ id: string }>();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadActiveDelivery();
  }, [id]);

  const loadActiveDelivery = async () => {
    setIsLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockDelivery: Delivery = {
        id: id || "1",
        order_number: "ORD-001",
        customer_name: "Sarah Johnson",
        customer_phone: "+1234567890",
        package_description: "Food delivery from Pizza Palace",
        pickup_address: "123 Main St, Downtown",
        delivery_address: "456 Oak Ave, Uptown",
        payment_amount: 15.50,
        status: "accepted",
        accepted_time: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      setDelivery(mockDelivery);
    } catch (error) {
      console.error("Error loading delivery:", error);
    }
    setIsLoading(false);
  };

  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (delivery) {
        const updates: Partial<Delivery> = { status: newStatus as any };
        
        const timestamp = new Date().toISOString();
        if (newStatus === "picked_up") {
          updates.pickup_time = timestamp;
        } else if (newStatus === "delivered") {
          updates.delivery_time = timestamp;
        }
        
        setDelivery({ ...delivery, ...updates });
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
    setIsUpdating(false);
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Active Delivery</h2>
        <p className="text-gray-600">Accept an order to start delivering</p>
      </div>
    );
  }

  const getNextAction = () => {
    switch (delivery.status) {
      case "accepted":
        return { label: "Arrived at Pickup", status: "arrived_pickup", color: "blue" };
      case "arrived_pickup":
        return { label: "Confirm Pickup", status: "picked_up", color: "orange" };
      case "picked_up":
        return { label: "Arrived at Delivery", status: "arrived_delivery", color: "purple" };
      case "arrived_delivery":
        return { label: "Complete Delivery", status: "delivered", color: "green" };
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
              {delivery.payment_amount && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">Earning</p>
                  <p className="text-lg font-bold text-green-600">${delivery.payment_amount}</p>
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
                  <h3 className="font-semibold text-gray-900 mb-1">Pickup Location</h3>
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
                <Button
                  onClick={() => openMaps(delivery.pickup_address)}
                  variant="outline"
                  className="w-full mt-3 border-blue-300 text-blue-600 hover:bg-blue-50"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Navigate to Pickup
                </Button>
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
                  <h3 className="font-semibold text-gray-900 mb-1">Delivery Location</h3>
                  <p className="text-gray-700 mb-2">{delivery.delivery_address}</p>
                  <a href={`tel:${delivery.customer_phone}`} className="flex items-center gap-1 text-sm text-blue-600">
                    <Phone className="w-3 h-3" />
                    {delivery.customer_phone}
                  </a>
                </div>
              </div>
              {showDeliveryNav && (
                <Button
                  onClick={() => openMaps(delivery.delivery_address)}
                  variant="outline"
                  className="w-full mt-3 border-green-300 text-green-600 hover:bg-green-50"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Navigate to Delivery
                </Button>
              )}
            </CardContent>
          </Card>

          {delivery.delivery_notes && (
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1">Special Instructions</h3>
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
                Updating...
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
