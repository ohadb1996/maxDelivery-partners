import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, DollarSign, Navigation2 } from "lucide-react";
import { motion } from "framer-motion";
import { Delivery } from "@/types";

interface JobCardProps {
  delivery: Delivery;
  onClick: () => void;
}

export default function JobCard({ delivery, onClick }: JobCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-blue-300"
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                  {delivery.order_number || `#${delivery.id.slice(0, 8)}`}
                </Badge>
                {delivery.payment_amount && (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                    <DollarSign className="w-3 h-3 mr-1" />
                    ${delivery.payment_amount}
                  </Badge>
                )}
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
                <p className="text-xs text-gray-500 mb-0.5">Pickup</p>
                <p className="text-sm font-medium text-gray-900 truncate">{delivery.pickup_address}</p>
              </div>
            </div>

            <div className="flex items-center pl-3">
              <div className="w-px h-4 bg-gray-300" />
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-0.5">Delivery</p>
                <p className="text-sm font-medium text-gray-900 truncate">{delivery.delivery_address}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 pt-3 border-t">
            {delivery.estimated_distance && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Navigation2 className="w-4 h-4" />
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
        </CardContent>
      </Card>
    </motion.div>
  );
}
