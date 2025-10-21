import { useState, useRef, useEffect, useCallback } from 'react';
import { Delivery } from '@/types';
import JobCard from './JobCard';
import BatchDeliveryCard from './BatchDeliveryCard';
import { DeliveryBatch } from '@/services/batchingService';
import { AlertCircle, TrendingUp, Package as PackageIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DraggableJobCardsProps {
  deliveries: Delivery[];
  batches?: DeliveryBatch[];
  isAvailable: boolean;
  onJobClick: (delivery: Delivery) => void;
  onAcceptJob: (delivery: Delivery) => void;
  onAcceptBatch?: (batch: DeliveryBatch) => void;
  onSelectDelivery: (delivery: Delivery) => void;
  selectedDeliveryId: string | null;
}

export default function DraggableJobCards({ 
  deliveries, 
  batches = [],
  isAvailable, 
  onJobClick, 
  onAcceptJob,
  onAcceptBatch,
  onSelectDelivery,
  selectedDeliveryId
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

  // Calculate heights (use refs to avoid recalculation)
  const expandedHeight = useRef(window.innerHeight - MIN_TOP_OFFSET);
  const collapsedHeight = useRef(COLLAPSED_VISIBLE_HEIGHT);
  
  // Update heights on window resize
  useEffect(() => {
    const handleResize = () => {
      expandedHeight.current = window.innerHeight - MIN_TOP_OFFSET;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setStartY(e.clientY);
    setDragOffset(0);
    e.preventDefault();
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setDragOffset(0);
  }, []);

  const handleMove = useCallback((clientY: number) => {
    setDragOffset(() => {
      const delta = clientY - startY;
      const maxDrag = expandedHeight.current - collapsedHeight.current;
      
      if (isExpanded) {
        // When expanded, only allow dragging down (positive delta)
        return Math.max(0, Math.min(maxDrag, delta));
      } else {
        // When collapsed, only allow dragging up (negative delta)
        return Math.max(-maxDrag, Math.min(0, delta));
      }
    });
  }, [startY, isExpanded]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    
    setDragOffset(prevOffset => {
      // Decide whether to snap to expanded or collapsed based on drag distance
      const dragDistance = Math.abs(prevOffset);
      
      if (dragDistance >= SNAP_THRESHOLD) {
        // User dragged enough - toggle state
        if (isExpanded && prevOffset > 0) {
          // Dragged down while expanded - collapse
          setIsExpanded(false);
        } else if (!isExpanded && prevOffset < 0) {
          // Dragged up while collapsed - expand
          setIsExpanded(true);
        }
      }
      
      return 0; // Reset drag offset
    });
  }, [isExpanded]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // Prevent scrolling while dragging
      handleMove(e.touches[0].clientY);
    };

    const handleMouseUp = () => handleEnd();
    const handleTouchEnd = () => handleEnd();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMove, handleEnd]);

  // Calculate current height including drag offset
  const getCurrentHeight = useCallback(() => {
    const baseHeight = isExpanded ? expandedHeight.current : collapsedHeight.current;
    return baseHeight - dragOffset;
  }, [isExpanded, dragOffset]);

  // Debug logs
  useEffect(() => {
    console.log('📋 [DraggableJobCards] Props changed:', {
      deliveries_count: deliveries.length,
      isAvailable,
      deliveries: deliveries.map(d => ({
        id: d.id,
        customer: d.customer_name,
        status: d.status,
        vehicle: d.required_vehicle_type
      }))
    });
  }, [deliveries, isAvailable]);

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
      <div className="px-4 pb-24 overflow-y-auto h-full" style={{ touchAction: isDragging ? 'none' : 'auto' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 text-right">משלוחים זמינים</h2>
          {deliveries.length > 0 && (
            <div className="flex items-center gap-1 text-sm text-green-600 font-medium">
              <TrendingUp className="w-4 h-4" />
              {deliveries.length} מתאימים
            </div>
          )}
        </div>

        {/* Status Messages */}
        {!isAvailable && deliveries.length > 0 && (
          <Alert className="mb-4 border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800 text-sm">
              יש {deliveries.length} משלוחים מתאימים - החלק את הכרטיסייה למעלה כדי לראות הכל
            </AlertDescription>
          </Alert>
        )}

        {deliveries.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <PackageIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 text-right">אין משלוחים זמינים</h3>
            <p className="text-gray-500 text-right text-sm">משלוחים חדשים יופיעו כאן אוטומטית</p>
          </div>
        )}

        {/* Batch Opportunities - Show first */}
        {batches.length > 0 && (
          <div className="space-y-3 mb-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
              <h3 className="text-sm font-bold text-purple-800 flex items-center gap-2">
                <PackageIcon className="w-4 h-4" />
                🎯 משלוחים כפולים זמינים - הכנסה כפולה בנסיעה אחת!
              </h3>
              <p className="text-xs text-purple-600 mt-1">
                שני משלוחים מאותו עסק עם יעדים קרובים (עד 2 ק"מ)
              </p>
            </div>
            {batches.map((batch) => (
              <BatchDeliveryCard
                key={batch.id}
                batch={batch}
                onAccept={onAcceptBatch || (() => {})}
              />
            ))}
          </div>
        )}

        {/* Individual Delivery Cards */}
        <div className="space-y-3 pb-4">
          {deliveries
            .filter(delivery => {
              // סנן משלוחים שכבר חלק מבטח
              const isInBatch = batches.some(batch => 
                batch.deliveries[0].id === delivery.id || 
                batch.deliveries[1].id === delivery.id
              );
              return !isInBatch;
            })
            .map((delivery) => (
              <JobCard
                key={delivery.id}
                delivery={delivery}
                onClick={() => onJobClick(delivery)}
                onAccept={() => onAcceptJob(delivery)}
                onSelect={() => onSelectDelivery(delivery)}
                isSelected={delivery.id === selectedDeliveryId}
              />
            ))
          }
        </div>
      </div>
    </div>
  );
}