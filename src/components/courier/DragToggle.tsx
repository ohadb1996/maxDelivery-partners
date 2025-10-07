import React, { useState, useRef, useEffect } from "react";
import { Power, PowerOff } from "lucide-react";

interface DragToggleProps {
  isAvailable: boolean;
  onToggle: () => void;
  isLoading: boolean;
}

export default function DragToggle({ 
  isAvailable, 
  onToggle, 
  isLoading 
}: DragToggleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(0);
  const [startX, setStartX] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Initialize position based on availability
  useEffect(() => {
    setDragPosition(isAvailable ? 100 : 0);
  }, [isAvailable]);

  const handleStart = (clientX: number) => {
    if (isLoading) return;
    setIsDragging(true);
    setStartX(clientX);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || !trackRef.current || isLoading) return;
    
    const trackRect = trackRef.current.getBoundingClientRect();
    const trackWidth = trackRect.width - 60; // Account for button width
    const deltaX = clientX - startX;
    const newPosition = Math.max(0, Math.min(100, (deltaX / trackWidth) * 100));
    
    setDragPosition(newPosition);
  };

  const handleEnd = () => {
    if (!isDragging || isLoading) return;
    
    console.log('DragToggle: handleEnd called, dragPosition:', dragPosition, 'isAvailable:', isAvailable);
    
    setIsDragging(false);
    
    // Check if dragged far enough to toggle
    const shouldToggle = dragPosition > 50 ? !isAvailable : isAvailable;
    
    console.log('DragToggle: shouldToggle:', shouldToggle);
    
    if (shouldToggle) {
      console.log('DragToggle: Calling onToggle');
      onToggle();
      // Haptic feedback for mobile
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
      }
    }
    
    // Reset position
    setDragPosition(isAvailable ? 100 : 0);
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    handleMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragPosition]);

  const currentPosition = isDragging ? dragPosition : (isAvailable ? 100 : 0);
  const isCurrentlyAvailable = currentPosition > 50;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
      <div className="text-center mb-3">
        <h3 className="text-lg font-bold text-gray-900">
          {isCurrentlyAvailable ? 'זמין לקבלת משלוחים' : 'לא זמין'}
        </h3>
        <p className="text-sm text-gray-600">
          {isCurrentlyAvailable 
            ? 'גרור שמאלה כדי להפסיק לקבל משלוחים' 
            : 'גרור ימינה כדי להתחיל לקבל משלוחים'
          }
        </p>
      </div>
      
      <div 
        ref={trackRef}
        className={`relative h-16 rounded-full overflow-hidden transition-all duration-300 ${
          isCurrentlyAvailable 
            ? 'bg-gradient-to-r from-green-500 to-green-600' 
            : 'bg-gradient-to-r from-gray-300 to-gray-400'
        }`}
      >
        <div
          ref={sliderRef}
          className={`absolute top-1 left-1 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center cursor-pointer transition-all ${
            isDragging ? 'scale-110 shadow-xl' : 'hover:scale-105'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{
            transform: `translateX(${currentPosition}%)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease'
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : isCurrentlyAvailable ? (
            <Power className="w-6 h-6 text-green-600" />
          ) : (
            <PowerOff className="w-6 h-6 text-gray-400" />
          )}
        </div>
        
        {/* Progress indicator */}
        <div 
          className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
          style={{
            clipPath: `inset(0 ${100 - currentPosition}% 0 0)`
          }}
        />
        
        {/* Text overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className={`text-sm font-semibold transition-colors ${
            currentPosition > 50 ? 'text-white' : 'text-gray-600'
          }`}>
            {currentPosition > 50 ? 'זמין' : 'לא זמין'}
          </span>
        </div>
      </div>
    </div>
  );
}
