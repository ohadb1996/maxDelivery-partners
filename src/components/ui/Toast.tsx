import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle } from "lucide-react";

interface ToastProps {
  message: string;
  senderName: string;
  onClose: () => void;
  onClick: () => void;
}

export default function Toast({ message, senderName, onClose, onClick }: ToastProps) {
  // Auto-close after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, x: '-50%' }}
        animate={{ opacity: 1, y: 0, x: '-50%' }}
        exit={{ opacity: 0, y: 50, x: '-50%' }}
        className="fixed bottom-6 left-1/2 z-[9999] w-96 max-w-[calc(100vw-2rem)]"
      >
        <div
          onClick={onClick}
          className="bg-white rounded-lg shadow-2xl border-2 border-blue-500 p-4 cursor-pointer hover:shadow-3xl transition-shadow"
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-blue-600" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-bold text-gray-900">💬 הודעה חדשה</h4>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-1">מ: {senderName}</p>
              <p className="text-sm text-gray-900 truncate">"{message}"</p>
            </div>
          </div>

          {/* Click hint */}
          <div className="mt-2 text-xs text-center text-gray-500">
            לחץ כדי לפתוח את הצ'אט
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}


