import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, DollarSign, CheckCircle } from "lucide-react";
import { Delivery } from "@/types";

export default function History() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockDeliveries: Delivery[] = [
        {
          id: "1",
          order_number: "ORD-001",
          customer_name: "Sarah Johnson",
          customer_phone: "+1234567890",
          package_description: "Food delivery from Pizza Palace",
          pickup_address: "123 Main St, Downtown",
          delivery_address: "456 Oak Ave, Uptown",
          payment_amount: 15.50,
          status: "delivered",
          required_vehicle_type: "bike",
          estimated_distance: "2.3 km",
          estimated_duration: "15 min",
          accepted_time: new Date(Date.now() - 86400000).toISOString(),
          pickup_time: new Date(Date.now() - 86300000).toISOString(),
          delivery_time: new Date(Date.now() - 86200000).toISOString(),
          created_at: new Date(Date.now() - 86400000).toISOString(),
          updated_at: new Date(Date.now() - 86200000).toISOString(),
        },
        {
          id: "2",
          order_number: "ORD-002",
          customer_name: "Mike Chen",
          customer_phone: "+1234567891",
          package_description: "Groceries from Fresh Market",
          pickup_address: "789 Market St, Center",
          delivery_address: "321 Pine Rd, Suburbs",
          payment_amount: 22.00,
          status: "delivered",
          required_vehicle_type: "car",
          estimated_distance: "4.1 km",
          estimated_duration: "25 min",
          accepted_time: new Date(Date.now() - 172800000).toISOString(),
          pickup_time: new Date(Date.now() - 172700000).toISOString(),
          delivery_time: new Date(Date.now() - 172600000).toISOString(),
          created_at: new Date(Date.now() - 172800000).toISOString(),
          updated_at: new Date(Date.now() - 172600000).toISOString(),
        },
      ];
      
      setDeliveries(mockDeliveries);
    } catch (error) {
      console.error("Error loading history:", error);
    }
    setIsLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Delivery History</h2>
      
      {deliveries.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No delivery history</h3>
          <p className="text-gray-500">Your completed deliveries will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deliveries.map((delivery) => (
            <Card key={delivery.id} className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                        {delivery.order_number || `#${delivery.id.slice(0, 8)}`}
                      </Badge>
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                        <DollarSign className="w-3 h-3 mr-1" />
                        ${delivery.payment_amount}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-lg">{delivery.customer_name}</h3>
                    <p className="text-sm text-gray-600">{delivery.package_description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Completed</p>
                    <p className="text-sm font-medium text-gray-900">
                      {delivery.delivery_time ? formatDate(delivery.delivery_time) : 'N/A'}
                    </p>
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
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>
                      {delivery.accepted_time && delivery.delivery_time ? 
                        `${Math.round((new Date(delivery.delivery_time).getTime() - new Date(delivery.accepted_time).getTime()) / 60000)} min` : 
                        'N/A'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
