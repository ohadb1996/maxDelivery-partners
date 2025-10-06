import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertCircle, TrendingUp, Package as PackageIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Delivery, Courier, User } from "@/types";

import AvailabilityToggle from "@/components/courier/AvailabilityToggle";
import JobCard from "@/components/courier/JobCard";

export default function Dashboard() {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [courier, setCourier] = useState<Courier | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Mock data - replace with actual API calls
      const mockUser: User = {
        id: "1",
        email: "courier@example.com",
        full_name: "John Courier",
        phone: "+1234567890",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const mockCourier: Courier = {
        id: "1",
        created_by: mockUser.email,
        phone: mockUser.phone || "",
        vehicle_type: "bike",
        is_available: true,
        rating: 4.8,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setUser(mockUser);
      setCourier(mockCourier);
      
      // Mock available deliveries
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
          status: "available",
          estimated_distance: "2.3 km",
          estimated_duration: "15 min",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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
          status: "available",
          estimated_distance: "4.1 km",
          estimated_duration: "25 min",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      
      setDeliveries(mockDeliveries);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const toggleAvailability = async () => {
    setIsToggling(true);
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (courier) {
      setCourier({ ...courier, is_available: !courier.is_available });
    }
    setIsToggling(false);
  };

  const handleJobClick = (delivery: Delivery) => {
    navigate(`/job/${delivery.id}`);
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="space-y-4">
          <div className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-gray-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-6">
      <AvailabilityToggle
        isAvailable={courier?.is_available || false}
        onToggle={toggleAvailability}
        isLoading={isToggling}
      />

      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Available Orders</h2>
          {deliveries.length > 0 && (
            <div className="flex items-center gap-1 text-sm text-blue-600 font-medium">
              <TrendingUp className="w-4 h-4" />
              {deliveries.length} new
            </div>
          )}
        </div>

        {!courier?.is_available && (
          <Alert className="mb-4 border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Go online to start receiving delivery orders
            </AlertDescription>
          </Alert>
        )}

        {courier?.is_available && deliveries.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <PackageIcon className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders available</h3>
            <p className="text-gray-500">New orders will appear here automatically</p>
          </div>
        )}

        <div className="space-y-3">
          {deliveries.map((delivery) => (
            <JobCard
              key={delivery.id}
              delivery={delivery}
              onClick={() => handleJobClick(delivery)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
