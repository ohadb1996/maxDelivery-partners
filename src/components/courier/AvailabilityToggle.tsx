import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Power, PowerOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface AvailabilityToggleProps {
  isAvailable: boolean;
  onToggle: () => void;
  isLoading: boolean;
}

export default function AvailabilityToggle({ 
  isAvailable, 
  onToggle, 
  isLoading 
}: AvailabilityToggleProps) {
  const { updateAvailability } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async () => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      await updateAvailability(!isAvailable);
      onToggle();
    } catch (error) {
      console.error('Error updating availability:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 border-2 border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            isAvailable 
              ? 'bg-gradient-to-br from-green-500 to-green-600' 
              : 'bg-gradient-to-br from-gray-400 to-gray-500'
          }`}>
            {isAvailable ? (
              <Power className="w-6 h-6 text-white" />
            ) : (
              <PowerOff className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {isAvailable ? 'Online' : 'Offline'}
            </h2>
            <p className="text-sm text-gray-600">
              {isAvailable 
                ? 'Ready to receive orders' 
                : 'Not accepting orders'
              }
            </p>
          </div>
        </div>
        
        <Button
          onClick={handleToggle}
          disabled={isLoading || isUpdating}
          className={`px-6 py-3 font-semibold ${
            isAvailable
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {isUpdating ? 'מעדכן...' : isAvailable ? 'Go Offline' : 'Go Online'}
        </Button>
      </div>
    </div>
  );
}
