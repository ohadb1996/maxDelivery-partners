import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import SideNavigation from "./SideNavigation";
import { Logo } from "../ui/Logo";
import Toast from "../ui/Toast";
import { useNewMessageNotifications } from "@/hooks/useNewMessageNotifications";
import NotificationPanel from "../ui/NotificationPanel";
import { ref, onValue, query, orderByChild, equalTo, update } from "firebase/database";
import { db } from "@/api/config/firebase.config";

interface LayoutProps {
  children: React.ReactNode;
}

interface Notification {
  id: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: 'assignment' | 'pickup' | 'completion' | 'cancelled' | 'ready' | 'new_message' | 'general';
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const { user: authUser, isLoading } = useAuth();
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  
  // ✅ Message notifications
  const [showToast, setShowToast] = useState(false);
  const [toastData, setToastData] = useState<{ deliveryId: string; senderName: string; text: string } | null>(null);
  const newMessage = useNewMessageNotifications(authUser?.uid, "courier");
  
  // ✅ Notification panel
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // ✅ Handle new message notifications
  useEffect(() => {
    if (newMessage) {
      console.log('🔔 Showing toast for new message:', newMessage);
      setToastData({
        deliveryId: newMessage.deliveryId,
        senderName: newMessage.senderName,
        text: newMessage.text,
      });
      setShowToast(true);
    }
  }, [newMessage]);

  // ✅ Load real-time notifications from Firebase
  useEffect(() => {
    if (!authUser?.uid) {
      console.log('❌ [CourierNotifications] No courier UID');
      return;
    }

    console.log('🔔 [CourierNotifications] Setting up listener for courier:', authUser.uid);

    const notificationsRef = query(
      ref(db, 'CourierNotifications'),
      orderByChild('courierId'),
      equalTo(authUser.uid)
    );

    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      console.log('🔔 [CourierNotifications] Received data:', snapshot.exists());
      const fetchedNotifications: Notification[] = [];
      snapshot.forEach((childSnapshot) => {
        const notification = childSnapshot.val();
        console.log('🔔 [CourierNotifications] Processing notification:', childSnapshot.key, notification);
        fetchedNotifications.push({
          id: childSnapshot.key!,
          message: notification.message,
          timestamp: new Date(notification.timestamp),
          read: notification.read || false,
          type: notification.type || 'general',
        });
      });
      // Sort by timestamp, newest first
      fetchedNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      console.log('🔔 [CourierNotifications] Total notifications:', fetchedNotifications.length);
      setNotifications(fetchedNotifications);
    }, (error) => {
      console.error('❌ [CourierNotifications] Error:', error);
    });

    return () => unsubscribe();
  }, [authUser]);

  const handleMarkAllAsRead = async () => {
    if (!authUser?.uid) return;
    
    try {
      const updates: Record<string, any> = {};
      notifications.forEach((notification) => {
        if (!notification.read) {
          updates[`${notification.id}/read`] = true;
        }
      });
      
      if (Object.keys(updates).length > 0) {
        const notificationsRef = ref(db, 'CourierNotifications');
        await update(notificationsRef, updates);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const notificationRef = ref(db, `CourierNotifications/${id}`);
      await update(notificationRef, { read: true });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !authUser) {
      navigate('/login');
    }
  }, [isLoading, authUser, navigate]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSideNavOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6 text-gray-600" />
              </button>
              <Logo size="md" showText={false} />
              <div className="text-left">
                <h1 className="text-lg font-bold text-gray-900">MaxDelivery</h1>
                {authUser && (
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${authUser.isAvailable ? 'bg-green-500' : 'bg-red-400'} animate-pulse`} />
                    <p className="text-xs text-gray-500">שלום, {authUser.username || authUser.email?.split('@')[0] || 'שליח'}</p>
                  </div> 
              )}
              </div>
            </div>
            
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg transition-colors duration-200 text-gray-600 hover:bg-gray-100"
              >
                <Bell className="w-6 h-6" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                )}
              </button>
              
              {/* Notification Panel */}
              <NotificationPanel
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
                notifications={notifications}
                onMarkAllAsRead={handleMarkAllAsRead}
                onMarkAsRead={handleMarkAsRead}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {children}
      </main>

      {/* Side Navigation */}
      <SideNavigation 
        isOpen={isSideNavOpen} 
        onToggle={() => setIsSideNavOpen(!isSideNavOpen)} 
      />

      {/* ✅ Toast Notification for new messages */}
      {showToast && toastData && (
        <Toast
          message={toastData.text}
          senderName={toastData.senderName}
          onClose={() => setShowToast(false)}
          onClick={() => {
            // Navigate to active job
            navigate('/active');
            setShowToast(false);
          }}
        />
      )}
    </div>
  );
}
