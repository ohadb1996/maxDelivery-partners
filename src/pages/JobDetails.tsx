import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, DollarSign, Navigation, Phone, Package, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Delivery } from "@/types";

export default function JobDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    loadJobDetails();
  }, [id]);

  const loadJobDetails = async () => {
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
        status: "available",
        estimated_distance: "2.3 km",
        estimated_duration: "15 min",
        delivery_notes: "Please ring the doorbell twice",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      setDelivery(mockDelivery);
    } catch (error) {
      console.error("Error loading job details:", error);
    }
    setIsLoading(false);
  };

  const acceptJob = async () => {
    setIsAccepting(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (delivery) {
        setDelivery({ ...delivery, status: "accepted", accepted_time: new Date().toISOString() });
        // Navigate to active job page
        navigate("/active");
      }
    } catch (error) {
      console.error("Error accepting job:", error);
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

        <div className="space-y-3">
          {/* Pickup Location Card */}
          <Card className="border-2 border-blue-300">
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
              <Button
                onClick={() => openMaps(delivery.pickup_address)}
                variant="outline"
                className="w-full mt-3 border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Navigate to Pickup
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
                  <h3 className="font-semibold text-gray-900 mb-1">Delivery Location</h3>
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
                <Navigation className="w-4 h-4 mr-2" />
                Navigate to Delivery
              </Button>
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

        <Button
          onClick={acceptJob}
          disabled={isAccepting}
          className="w-full mt-4 font-semibold py-6 text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
        >
          {isAccepting ? (
            <span className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Accepting...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Accept This Job
            </span>
          )}
        </Button>
      </motion.div>
    </div>
  );
}
