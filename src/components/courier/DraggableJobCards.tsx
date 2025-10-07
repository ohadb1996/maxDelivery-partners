import { useState, useRef, useEffect } from 'react';
import { Delivery } from '@/types';
import JobCard from './JobCard';
import { AlertCircle, TrendingUp, Package as PackageIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DraggableJobCardsProps {
  deliveries: Delivery[];
  isAvailable: boolean;
  onJobClick: (delivery: Delivery) => void;
  onAcceptJob: (delivery: Delivery) => void;
}

export default function DraggableJobCards({ 
  deliveries, 
  isAvailable, 
  onJobClick, 
  onAcceptJob 
}: DraggableJobCardsProps) {
  // Position configuration
  const MIN_TOP_OFFSET = 80; // Space for header (navbar)
  const COLLAPSED_VISIBLE_HEIGHT = 140; // How much is visible when collapsed (handle + peek)
  const SNAP_THRESHOLD = 50; // Minimum drag distance to trigger snap
  
  // States
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate heights
  const expandedHeight = window.innerHeight - MIN_TOP_OFFSET;
  const collapsedHeight = COLLAPSED_VISIBLE_HEIGHT;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartY(e.clientY);
    setDragOffset(0);
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setDragOffset(0);
  };

  const handleMove = (clientY: number) => {
    if (!isDragging) return;
    
    // Calculate how much we've dragged from start
    const delta = clientY - startY;
    
    // Update drag offset (clamped to valid range)
    const maxDrag = expandedHeight - collapsedHeight;
    if (isExpanded) {
      // When expanded, only allow dragging down (positive delta)
      setDragOffset(Math.max(0, Math.min(maxDrag, delta)));
    } else {
      // When collapsed, only allow dragging up (negative delta)
      setDragOffset(Math.max(-maxDrag, Math.min(0, delta)));
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    handleMove(e.clientY);
  };

  const handleTouchMove = (e: TouchEvent) => {
    handleMove(e.touches[0].clientY);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // Decide whether to snap to expanded or collapsed based on drag distance
    const dragDistance = Math.abs(dragOffset);
    
    if (dragDistance >= SNAP_THRESHOLD) {
      // User dragged enough - toggle state
      if (isExpanded && dragOffset > 0) {
        // Dragged down while expanded - collapse
        setIsExpanded(false);
      } else if (!isExpanded && dragOffset < 0) {
        // Dragged up while collapsed - expand
        setIsExpanded(true);
      }
      // else: dragged in wrong direction, stay in current state
    }
    // else: didn't drag enough, stay in current state
    
    // Reset drag offset
    setDragOffset(0);
  };

  const handleMouseUp = () => handleEnd();
  const handleTouchEnd = () => handleEnd();

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
  }, [isDragging, startY, isExpanded, dragOffset]);

  // Calculate current height including drag offset
  const getCurrentHeight = () => {
    const baseHeight = isExpanded ? expandedHeight : collapsedHeight;
    return baseHeight - dragOffset;
  };

  const filteredDeliveries = deliveries.filter(() => 
    isAvailable || !isAvailable // Show all deliveries regardless of availability
  );

  return (
    <div 
      ref={containerRef}
      className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-40 overflow-hidden"
      style={{ 
        height: `${getCurrentHeight()}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging ? 'none' : 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Drag Handle */}
      <div 
        className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing hover:bg-gray-50 transition-colors rounded-t-3xl sticky top-0 bg-white z-50"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="w-12 h-1 bg-gray-400 rounded-full hover:bg-gray-500 transition-colors"></div>
      </div>
      
      {/* Content */}
      <div className="px-4 pb-24 overflow-y-auto h-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 text-right">משלוחים זמינים</h2>
          {filteredDeliveries.length > 0 && (
            <div className="flex items-center gap-1 text-sm text-green-600 font-medium">
              <TrendingUp className="w-4 h-4" />
              {filteredDeliveries.length} מתאימים
            </div>
          )}
        </div>

        {/* Status Messages */}
        {!isAvailable && filteredDeliveries.length > 0 && (
          <Alert className="mb-4 border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800 text-sm">
              יש {filteredDeliveries.length} משלוחים מתאימים - החלק את הכרטיסייה למעלה כדי לראות הכל
            </AlertDescription>
          </Alert>
        )}

        {isAvailable && filteredDeliveries.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <PackageIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 text-right">אין משלוחים זמינים</h3>
            <p className="text-gray-500 text-right text-sm">משלוחים חדשים יופיעו כאן אוטומטית</p>
          </div>
        )}

        {/* Delivery Cards */}
        <div className="space-y-3 pb-4">
          {filteredDeliveries.map((delivery) => (
            <JobCard
              key={delivery.id}
              delivery={delivery}
              onClick={() => onJobClick(delivery)}
              onAccept={() => onAcceptJob(delivery)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}