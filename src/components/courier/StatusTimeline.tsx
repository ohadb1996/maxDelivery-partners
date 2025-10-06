import React from "react";
import { CheckCircle, Clock, MapPin, Package } from "lucide-react";

interface StatusTimelineProps {
  currentStatus: string;
  timestamps: {
    accepted?: string;
    picked_up?: string;
    delivered?: string;
  };
}

export default function StatusTimeline({ currentStatus, timestamps }: StatusTimelineProps) {
  const steps = [
    { key: 'accepted', label: 'Accepted', icon: CheckCircle },
    { key: 'picked_up', label: 'Picked Up', icon: Package },
    { key: 'delivered', label: 'Delivered', icon: MapPin },
  ];

  const getStepStatus = (stepKey: string) => {
    const statusOrder = ['accepted', 'arrived_pickup', 'picked_up', 'arrived_delivery', 'delivered'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const stepIndex = statusOrder.indexOf(stepKey);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-4">Order Progress</h3>
      <div className="space-y-4">
        {steps.map((step, index) => {
          const status = getStepStatus(step.key);
          const Icon = step.icon;
          const timestamp = timestamps[step.key as keyof typeof timestamps];
          
          return (
            <div key={step.key} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                status === 'completed' 
                  ? 'bg-green-500 text-white' 
                  : status === 'current'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              
              <div className="flex-1">
                <p className={`font-medium ${
                  status === 'completed' || status === 'current'
                    ? 'text-gray-900'
                    : 'text-gray-500'
                }`}>
                  {step.label}
                </p>
                {timestamp && (
                  <p className="text-xs text-gray-500">{formatTime(timestamp)}</p>
                )}
              </div>
              
              {index < steps.length - 1 && (
                <div className={`w-px h-8 ml-4 ${
                  status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
