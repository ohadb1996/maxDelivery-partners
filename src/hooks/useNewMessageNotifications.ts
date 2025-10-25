import { useState, useEffect, useRef } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/api/config/firebase.config";

interface NewMessage {
  deliveryId: string;
  messageId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

/**
 * Hook to listen for new unread messages across all deliveries
 * @param userId - Current user ID
 * @param userRole - "courier" | "business" | "admin"
 * @returns New message notification or null
 */
export function useNewMessageNotifications(userId: string | undefined, userRole: "courier" | "business" | "admin") {
  const [newMessage, setNewMessage] = useState<NewMessage | null>(null);
  const lastSeenTimestamps = useRef<{ [deliveryId: string]: number }>({});

  useEffect(() => {
    if (!userId) return;

    // Listen to all chats
    const chatsRef = ref(db, 'Chats');
    
    const unsubscribe = onValue(chatsRef, (snapshot) => {
      if (!snapshot.exists()) return;

      const chats = snapshot.val();
      
      // Check each delivery's messages
      Object.keys(chats).forEach((deliveryId) => {
        const messages = chats[deliveryId]?.messages;
        if (!messages) return;

        // Convert to array and sort by timestamp
        const messagesList = Object.keys(messages).map(msgId => ({
          id: msgId,
          ...messages[msgId],
        })).sort((a, b) => b.timestamp - a.timestamp);

        // Get the latest message
        const latestMessage = messagesList[0];
        if (!latestMessage) return;

        // Check if it's a new message from someone else
        const isFromOthers = latestMessage.sender_role !== userRole;
        const isUnread = userRole === "courier" 
          ? !latestMessage.read_by_courier 
          : userRole === "business"
          ? !latestMessage.read_by_business
          : !latestMessage.read_by_admin;

        // Check if we've already seen this message
        const lastSeen = lastSeenTimestamps.current[deliveryId] || 0;
        const isNew = latestMessage.timestamp > lastSeen;

        if (isFromOthers && isUnread && isNew) {
          console.log('🔔 New message notification:', latestMessage);
          
          // Update last seen timestamp
          lastSeenTimestamps.current[deliveryId] = latestMessage.timestamp;

          // Trigger notification
          setNewMessage({
            deliveryId,
            messageId: latestMessage.id,
            senderName: latestMessage.sender_name,
            text: latestMessage.text,
            timestamp: latestMessage.timestamp,
          });

          // Clear notification after a short delay (so Toast can show)
          setTimeout(() => {
            setNewMessage(null);
          }, 100);
        }
      });
    });

    return () => unsubscribe();
  }, [userId, userRole]);

  return newMessage;
}


