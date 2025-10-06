import { useState } from "react";
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
          <button
            onClick={handleToggle}
            disabled={isLoading || isUpdating}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
              isAvailable 
                ? 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' 
                : 'bg-gradient-to-br from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600'
            }`}
          >
            {isUpdating ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isAvailable ? (
              <Power className="w-6 h-6 text-white" />
            ) : (
              <PowerOff className="w-6 h-6 text-white" />
            )}
          </button>
          
    
            <h2 className="text-lg font-bold text-gray-900">
              {isAvailable ? 'זמין' : 'לא זמין'}
            </h2>
            <p className="text-sm text-gray-600">
              {isAvailable 
                ? 'מוכן לקבל משלוחים' 
                : 'לא מקבל משלוחים'
              }
            </p>
         
        </div>
      </div>
    </div>
  );
}
