import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Delivery, Courier, canVehicleTakeDelivery } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { subscribeToAvailableDeliveries, assignDeliveryToCourier, assignBatchToCourier } from "@/services/deliveryService";
import { findBatchableDeliveries, DeliveryBatch } from "@/services/batchingService";
import { locationService } from "@/services/locationService";

import MapView from "@/components/courier/MapView";
import SimpleToggle from "@/components/courier/SimpleToggle";
import DraggableJobCards from "@/components/courier/DraggableJobCards";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user: authUser, updateAvailability } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [batches, setBatches] = useState<DeliveryBatch[]>([]);
  const [courier, setCourier] = useState<Courier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [hasActiveDelivery, setHasActiveDelivery] = useState(false);

  useEffect(() => {
    if (authUser) {
      loadData();
      checkForActiveDelivery();
      
      // הרשמה לעדכונים בזמן אמת של משלוחים זמינים
      console.log('📡 [Dashboard] Subscribing to real-time delivery updates');
      const unsubscribe = subscribeToAvailableDeliveries((availableDeliveries) => {
        console.log(`📦 [Dashboard] Received ${availableDeliveries.length} deliveries`);
        setDeliveries(availableDeliveries);
      });
      
      return () => {
        console.log('📡 [Dashboard] Unsubscribing from delivery updates');
        unsubscribe();
      };
    }
  }, [authUser]);

  // בדוק אם יש משלוח פעיל
  const checkForActiveDelivery = async () => {
    if (!authUser) return;

    try {
      console.log('🔍 [Dashboard] Checking for active delivery...');
      
      // בדוק אם יש משלוחים פעילים של השליח
      const { ref, onValue } = await import('firebase/database');
      const { db } = await import('@/api/config/firebase.config');
      
      const deliveriesRef = ref(db, 'Deliveries');
      onValue(deliveriesRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          let foundActiveDelivery = false;
          
          // סטטוסים שמשמעותם משלוח פעיל
          const activeStatuses = ['מקבל', 'הגיע לנקודת איסוף', 'נאסף', 'הגיע ליעד'];
          
          Object.keys(data).forEach((deliveryId) => {
            const delivery = data[deliveryId];
            
            // בדוק אם המשלוח מוקצה לשליח הזה ויש לו סטטוס פעיל
            if (delivery.assigned_courier === authUser.uid && 
                activeStatuses.includes(delivery.status) &&
                delivery.accepted_time) {
              foundActiveDelivery = true;
              console.log(`✅ [Dashboard] Found active delivery: ${deliveryId} with status: ${delivery.status}`);
            }
          });
          
          setHasActiveDelivery(foundActiveDelivery);
          
          if (foundActiveDelivery) {
            console.log('⚠️ [Dashboard] Courier has active delivery - blocking new job acceptance');
          } else {
            console.log('✅ [Dashboard] No active delivery found - courier can accept new jobs');
          }
        }
      });
    } catch (error) {
      console.error('❌ [Dashboard] Error checking for active delivery:', error);
    }
  };

  // Sync courier availability with authUser
  useEffect(() => {
    if (authUser && courier) {
      if (courier.is_available !== authUser.isAvailable) {
        console.log('Dashboard: Syncing courier availability with authUser:', authUser.isAvailable);
        setCourier({ ...courier, is_available: authUser.isAvailable || false });
      }
    }
  }, [authUser?.isAvailable]);

  // 📍 GPS Tracking - Track location when courier is available
  useEffect(() => {
    if (!authUser) return;

    const isAvailable = courier?.is_available || false;
    
    if (isAvailable) {
      // השליח זמין - התחל מעקב מיקום
      console.log('📍 [Dashboard] Courier is available - starting GPS tracking');
      locationService.startTracking(authUser.uid, true);
    } else {
      // השליח לא זמין - עצור מעקב
      console.log('📍 [Dashboard] Courier is unavailable - stopping GPS tracking');
      locationService.stopTracking();
    }

    // Cleanup - עצור מעקב כשהקומפוננטה נהרסת
    return () => {
      if (locationService.isTrackingActive()) {
        console.log('📍 [Dashboard] Component unmounting - stopping GPS tracking');
        locationService.stopTracking();
      }
    };
  }, [authUser, courier?.is_available]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (!authUser) return;
      
      // Create courier data from auth user
      const courierData: Courier = {
        id: authUser.uid,
        business_email: authUser.email || "",
        phone: authUser.phone || "",
        vehicle_type: authUser.vehicle_type || "motorcycle", // ברירת מחדל: קטנוע (יכול לקחת גם משלוחי אופניים)
        is_available: authUser.isAvailable || false,
        rating: 4.8, // Default - should be calculated from deliveries
        created_at: authUser.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      console.log('📊 [Dashboard] Created courier data:', {
        id: courierData.id,
        vehicle_type: courierData.vehicle_type,
        is_available: courierData.is_available
      });

      setCourier(courierData);
      
      // משלוחים אמיתיים יטענו דרך subscribeToAvailableDeliveries ב-useEffect
    } catch (error) {
      console.error("❌ [Dashboard] Error loading data:", error);
    }
    setIsLoading(false);
  };

  // סינון משלוחים לפי רמת התחבורה של השליח
  const filteredDeliveries = useMemo(() => {
    const filtered = deliveries.filter(delivery => {
      if (!courier) return false;
      const canTake = canVehicleTakeDelivery(courier.vehicle_type, delivery.required_vehicle_type);
      console.log(`🚗 [Dashboard] Vehicle check:`, {
        delivery_id: delivery.id,
        courier_vehicle: courier.vehicle_type,
        required_vehicle: delivery.required_vehicle_type,
        can_take: canTake
      });
      return canTake;
    });

    console.log(`📊 [Dashboard] Filtered deliveries:`, {
      total: deliveries.length,
      filtered: filtered.length,
      courier_vehicle: courier?.vehicle_type
    });

    return filtered;
  }, [deliveries, courier]);

  // 🔄 Calculate batches from filtered deliveries
  useEffect(() => {
    if (filteredDeliveries.length >= 2) {
      const batchOpportunities = findBatchableDeliveries(filteredDeliveries, 2); // Max 2km between drop-offs
      console.log(`📦 [Dashboard] Found ${batchOpportunities.length} batch opportunities`);
      setBatches(batchOpportunities);
    } else {
      setBatches([]);
    }
  }, [filteredDeliveries]);

  // אוטומטית בוחר את המשלוח הראשון כברירת מחדל
  useEffect(() => {
    if (filteredDeliveries.length > 0) {
      // אם אין משלוח נבחר או המשלוח הנבחר לא ברשימה המסוננת
      const isCurrentSelectionValid = selectedDelivery && 
        filteredDeliveries.some(d => d.id === selectedDelivery.id);
      
      if (!isCurrentSelectionValid) {
        console.log('📍 [Dashboard] Auto-selecting first delivery:', filteredDeliveries[0].id);
        setSelectedDelivery(filteredDeliveries[0]);
      }
    } else {
      setSelectedDelivery(null);
    }
  }, [filteredDeliveries]);


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
    console.log('🔘 [Dashboard] Delivery clicked:', delivery.id);
    setSelectedDelivery(delivery);
  };

  const handleSelectDelivery = (delivery: Delivery) => {
    console.log('➡️ [Dashboard] Navigate to delivery details:', delivery.id);
    navigate(`/job/${delivery.id}`);
  };

  const handleAcceptJob = async (delivery: Delivery) => {
    if (!authUser || !courier) {
      console.error('❌ [Dashboard] Cannot accept job - no user or courier');
      return;
    }

    if (!courier.is_available) {
      console.error('❌ [Dashboard] Cannot accept job - courier is not available');
      return;
    }

    if (hasActiveDelivery) {
      console.error('❌ [Dashboard] Cannot accept job - courier has active delivery');
      alert('⚠️ יש לך משלוח פעיל! סיים את המשלוח הנוכחי לפני קבלת משלוח חדש.');
      return;
    }

    console.log('📝 [Dashboard] Accepting job:', delivery.id);
    
    try {
      const success = await assignDeliveryToCourier(delivery.id, authUser.uid);
      
      if (success) {
        console.log('✅ [Dashboard] Job accepted successfully');
        // נווט לדף המשלוח הפעיל
        navigate('/active');
      } else {
        console.error('❌ [Dashboard] Failed to accept job');
        // TODO: Show error message to user
      }
    } catch (error) {
      console.error('❌ [Dashboard] Error accepting job:', error);
      // TODO: Show error message to user
    }
  };

  const handleAcceptBatch = async (batch: DeliveryBatch) => {
    if (!authUser || !courier) {
      console.error('❌ [Dashboard] Cannot accept batch - no user or courier');
      return;
    }

    if (!courier.is_available) {
      console.error('❌ [Dashboard] Cannot accept batch - courier is not available');
      return;
    }

    if (hasActiveDelivery) {
      console.error('❌ [Dashboard] Cannot accept batch - courier has active delivery');
      alert('⚠️ יש לך משלוח פעיל! סיים את המשלוח הנוכחי לפני קבלת משלוח חדש.');
      return;
    }

    console.log('📦 [Dashboard] Accepting batch:', batch.id);
    
    try {
      const deliveryIds: [string, string] = [batch.deliveries[0].id, batch.deliveries[1].id];
      const success = await assignBatchToCourier(deliveryIds, authUser.uid);
      
      if (success) {
        console.log('✅ [Dashboard] Batch accepted successfully');
        // נווט לדף המשלוח הפעיל
        navigate('/active');
      } else {
        console.error('❌ [Dashboard] Failed to accept batch');
        // TODO: Show error message to user
      }
    } catch (error) {
      console.error('❌ [Dashboard] Error accepting batch:', error);
      // TODO: Show error message to user
    }
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
          selectedDelivery={selectedDelivery}
          courierVehicleType={courier?.vehicle_type || 'motorcycle'}
        />
      </div>

      {/* Draggable Job Cards */}
      <DraggableJobCards
        deliveries={filteredDeliveries}
        batches={batches}
        isAvailable={courier?.is_available || false}
        hasActiveDelivery={hasActiveDelivery}
        onJobClick={handleJobClick}
        onAcceptJob={handleAcceptJob}
        onAcceptBatch={handleAcceptBatch}
        onSelectDelivery={handleSelectDelivery}
        selectedDeliveryId={selectedDelivery?.id || null}
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
