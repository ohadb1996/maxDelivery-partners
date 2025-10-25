import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader } from "./card";
import { Button } from "./button";
import { X, Check, Bell } from "lucide-react";

interface Notification {
  id: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: 'assignment' | 'pickup' | 'completion' | 'cancelled' | 'ready' | 'new_message' | 'general';
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onMarkAsRead,
}) => {
  const unreadNotifications = notifications.filter(n => !n.read);
  
  const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - timestamp.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    
    if (diffInMinutes < 1) return 'עכשיו';
    if (diffInMinutes < 60) return `לפני ${diffInMinutes} דקות`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `לפני ${diffInHours} שעות`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `לפני ${diffInDays} ימים`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'assignment':
        return '🚴';
      case 'pickup':
        return '📦';
      case 'completion':
        return '✅';
      case 'cancelled':
        return '❌';
      case 'ready':
        return '🟢';
      case 'new_message':
        return '💬';
      default:
        return '🔔';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.15 }}
          className="absolute left-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] z-50"
          dir="rtl"
          style={{ position: 'absolute' }}
        >
            <Card className="shadow-2xl border-2 border-gray-200 overflow-hidden max-h-[600px] flex flex-col">
              {/* Header */}
              <CardHeader className="border-b bg-gradient-to-l from-blue-50 to-white p-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-gray-900">התראות</h3>
                    {unreadNotifications.length > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                        {unreadNotifications.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadNotifications.length > 0 && (
                      <Button
                        onClick={onMarkAllAsRead}
                        variant="ghost"
                        size="sm"
                        className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Check className="w-3 h-3 ml-1" />
                        סמן הכל כנקרא
                      </Button>
                    )}
                    <Button
                      onClick={onClose}
                      variant="ghost"
                      size="sm"
                      className="p-1 hover:bg-gray-100 rounded-full"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Notifications List */}
              <CardContent className="p-0 overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                      <Bell className="w-8 h-8 text-blue-300" />
                    </div>
                    <p className="text-gray-500 font-medium">אין התראות חדשות</p>
                    <p className="text-xs text-gray-400 mt-2">הכל עדכני! 🎉</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                          !notification.read ? 'bg-blue-50/50' : ''
                        }`}
                        onClick={() => !notification.read && onMarkAsRead(notification.id)}
                      >
                        <div className="flex gap-3">
                          <div className="text-2xl flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!notification.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-gray-500">
                                {getTimeAgo(notification.timestamp)}
                              </p>
                              {!notification.read && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="border-t bg-gray-50 p-3 text-center flex-shrink-0">
                  <button
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    onClick={onClose}
                  >
                    סגור
                  </button>
                </div>
              )}
            </Card>
          </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationPanel;

