import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/api/config/firebase.config";

interface Message {
  id: string;
  sender_role: "courier" | "business" | "admin";
  read_by_courier?: boolean;
  read_by_business?: boolean;
  read_by_admin?: boolean;
}

/**
 * Hook to count unread messages for a specific delivery
 * @param deliveryId - The delivery ID to track messages for
 * @param userRole - The role of the current user ("courier" | "business" | "admin")
 * @returns The count of unread messages
 */
export function useUnreadMessages(deliveryId: string | undefined, userRole: "courier" | "business" | "admin") {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!deliveryId) {
      setUnreadCount(0);
      return;
    }

    const messagesRef = ref(db, `Chats/${deliveryId}/messages`);
    
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const messages: Message[] = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        
        // Count unread messages (messages NOT from current user AND not read by current user)
        let count = 0;
        messages.forEach((msg) => {
          if (msg.sender_role !== userRole) {
            // This message is from someone else
            if (userRole === "courier" && !msg.read_by_courier) {
              count++;
            } else if (userRole === "business" && !msg.read_by_business) {
              count++;
            } else if (userRole === "admin" && !msg.read_by_admin) {
              count++;
            }
          }
        });
        
        setUnreadCount(count);
      } else {
        setUnreadCount(0);
      }
    });

    return () => unsubscribe();
  }, [deliveryId, userRole]);

  return unreadCount;
}


