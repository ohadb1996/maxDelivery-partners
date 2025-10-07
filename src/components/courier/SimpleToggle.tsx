import { Power, PowerOff } from "lucide-react";

interface SimpleToggleProps {
  isAvailable: boolean;
  onToggle: () => void;
  isLoading: boolean;
}

export default function SimpleToggle({ 
  isAvailable, 
  onToggle, 
  isLoading 
}: SimpleToggleProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
    
      
      <button
        onClick={onToggle}
        disabled={isLoading}
        className={`w-full h-16 rounded-2xl flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed ${
          isAvailable 
            ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/25' 
            : 'bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 shadow-lg shadow-gray-400/25'
        }`}
      >
        {isLoading ? (
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : isAvailable ? (
          <Power className="w-6 h-6 text-white" />
        ) : (
          <PowerOff className="w-6 h-6 text-white" />
        )}
        
        <div className="text-right">
          <h3 className="text-center text-lg font-bold text-white">
            {isAvailable ? 'זמין לקבלת משלוחים' : 'לא זמין'}
          </h3>
          <p className="text-sm text-white/90">
            {isAvailable 
              ? 'מוכן לקבל הזמנות חדשות' 
              : 'לחץ כדי להתחיל לקבל משלוחים'
            }
          </p>
        </div>
      </button>
    </div>
  );
}
