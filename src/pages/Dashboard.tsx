import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Delivery, Courier, canVehicleTakeDelivery } from "@/types";
import { useAuth } from "@/context/AuthContext";

import MapView from "@/components/courier/MapView";
import SimpleToggle from "@/components/courier/SimpleToggle";
import DraggableJobCards from "@/components/courier/DraggableJobCards";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user: authUser, updateAvailability } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [courier, setCourier] = useState<Courier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    if (authUser) {
      loadData();
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [authUser]);

  // Sync courier availability with authUser
  useEffect(() => {
    if (authUser && courier) {
      if (courier.is_available !== authUser.isAvailable) {
        console.log('Dashboard: Syncing courier availability with authUser:', authUser.isAvailable);
        setCourier({ ...courier, is_available: authUser.isAvailable || false });
      }
    }
  }, [authUser?.isAvailable]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (!authUser) return;
      
      // Create courier data from auth user
      const courierData: Courier = {
        id: authUser.uid,
        created_by: authUser.email || "",
        phone: authUser.phone || "",
        vehicle_type: authUser.vehicle_type || "bike", // שימוש ברמת התחבורה האמיתית
        is_available: authUser.isAvailable || false,
        rating: 4.8, // Default - should be calculated from deliveries
        created_at: authUser.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      console.log('Dashboard: Created courier data with availability:', courierData.is_available);

      setCourier(courierData);
      
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
          required_vehicle_type: "bike", // משלוח לאופניים
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
          required_vehicle_type: "car", // משלוח לרכב
          estimated_distance: "4.1 km",
          estimated_duration: "25 min",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "3",
          order_number: "ORD-003",
          customer_name: "Lisa Brown",
          customer_phone: "+1234567892",
          package_description: "Large furniture delivery",
          pickup_address: "555 Furniture St, Warehouse",
          delivery_address: "777 Home Ave, Residential",
          payment_amount: 45.00,
          status: "available",
          required_vehicle_type: "truck", // משלוח למשאית
          estimated_distance: "8.5 km",
          estimated_duration: "35 min",
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

  // סינון משלוחים לפי רמת התחבורה של השליח
  const filteredDeliveries = deliveries.filter(delivery => {
    if (!courier) return false;
    return canVehicleTakeDelivery(courier.vehicle_type, delivery.required_vehicle_type);
  });


  const toggleAvailability = async () => {
    console.log('Dashboard: toggleAvailability called, current availability:', courier?.is_available);
    setIsToggling(true);
    try {
      if (courier && authUser) {
        // Update local state
        const newAvailability = !courier.is_available;
        console.log('Dashboard: Setting new availability to:', newAvailability);
        setCourier({ ...courier, is_available: newAvailability });
        
        // Update AuthContext
        console.log('Dashboard: Calling updateAvailability with:', newAvailability);
        await updateAvailability(newAvailability);
        console.log('Dashboard: updateAvailability completed successfully');
      }
    } catch (error) {
      console.error("Error toggling availability:", error);
      // Revert local state on error
      if (courier) {
        setCourier({ ...courier, is_available: courier.is_available });
      }
    } finally {
      setIsToggling(false);
    }
  };

  const handleJobClick = (delivery: Delivery) => {
    navigate(`/job/${delivery.id}`);
  };

  const handleAcceptJob = (delivery: Delivery) => {
    console.log('Accepting job:', delivery.id);
    // TODO: Implement job acceptance logic
    // This should update the delivery status and assign it to the courier
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
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Map Section - Takes most of the screen */}
      <div className="flex-1 relative">
        <MapView
          deliveries={filteredDeliveries}
          isAvailable={courier?.is_available || false}
          onDeliveryClick={handleJobClick}
        />
      </div>

      {/* Draggable Job Cards */}
      <DraggableJobCards
        deliveries={filteredDeliveries}
        isAvailable={courier?.is_available || false}
        onJobClick={handleJobClick}
        onAcceptJob={handleAcceptJob}
      />

      {/* Simple Toggle - Bottom Fixed */}
      <SimpleToggle
        isAvailable={courier?.is_available || false}
        onToggle={toggleAvailability}
        isLoading={isToggling}
      />
    </div>
  );
}
