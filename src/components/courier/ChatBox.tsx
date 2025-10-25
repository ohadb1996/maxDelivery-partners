import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { X, Send, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { ref, onValue, push, set, get } from "firebase/database";
import { db } from "@/api/config/firebase.config";
import { useAuth } from "@/context/AuthContext";

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: "courier" | "business" | "admin";
  text: string;
  timestamp: number;
  read_by_courier?: boolean;
  read_by_business?: boolean;
  read_by_admin?: boolean;
}

interface ChatBoxProps {
  deliveryId: string;
  businessName: string;
  onClose: () => void;
}

export default function ChatBox({ deliveryId, businessName, onClose }: ChatBoxProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [deliveryData, setDeliveryData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load delivery data
  useEffect(() => {
    if (!deliveryId) return;

    const deliveryRef = ref(db, `Deliveries/${deliveryId}`);
    get(deliveryRef).then((snapshot) => {
      if (snapshot.exists()) {
        setDeliveryData(snapshot.val());
      }
    });
  }, [deliveryId]);

  // Listen to messages in real-time
  useEffect(() => {
    if (!deliveryId) return;

    const messagesRef = ref(db, `Chats/${deliveryId}/messages`);
    
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const messagesList: Message[] = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        
        // Sort by timestamp
        messagesList.sort((a, b) => a.timestamp - b.timestamp);
        
        setMessages(messagesList);
        
        // Mark messages as read by courier
        if (user) {
          messagesList.forEach((msg) => {
            if (msg.sender_role !== 'courier' && !msg.read_by_courier) {
              const msgRef = ref(db, `Chats/${deliveryId}/messages/${msg.id}`);
              set(msgRef, { ...msg, read_by_courier: true });
            }
          });
        }
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [deliveryId, user]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setIsSending(true);
    try {
      const messagesRef = ref(db, `Chats/${deliveryId}/messages`);
      const newMessageRef = push(messagesRef);
      
      await set(newMessageRef, {
        sender_id: user.uid,
        sender_name: user.username || "שליח",
        sender_role: "courier",
        text: newMessage.trim(),
        timestamp: Date.now(),
        read_by_courier: true,
        read_by_business: false,
        read_by_admin: false,
      });

      setNewMessage("");
    } catch (error) {
      console.error("❌ Error sending message:", error);
      alert("שגיאה בשליחת ההודעה");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] z-50 shadow-2xl overflow-hidden"
    >
      <Card className="border-2 border-blue-300">
        <CardHeader className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <div>
                <h3 className="font-bold">צ'אט עם {businessName}</h3>
                <p className="text-xs opacity-90">שליח ↔ עסק</p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Delivery Details */}
          {deliveryData && (
            <div className="bg-white/10 rounded-lg p-2 space-y-1.5 text-[10px] max-h-32 overflow-y-auto">
              {/* Business/Pickup Info */}
              <div className="pb-1.5 border-b border-white/20">
                <div className="font-bold mb-0.5 opacity-75">🏪 איסוף: {deliveryData.business_name || businessName}</div>
                {deliveryData.pickup_address && (
                  <div className="opacity-90">📍 {deliveryData.pickup_address}</div>
                )}
                {deliveryData.business_phone && (
                  <div className="opacity-90">📞 {deliveryData.business_phone}</div>
                )}
              </div>

              {/* Customer/Delivery Info */}
              <div>
                <div className="font-bold mb-0.5 opacity-75">👤 ללקוח: {deliveryData.customer_name}</div>
                <div className="opacity-90">
                  📍 {deliveryData.delivery_address || 
                     `${deliveryData.delivery_street || ''} ${deliveryData.delivery_building_number || ''}, ${deliveryData.delivery_city || ''}`}
                </div>
                {deliveryData.customer_phone && (
                  <div className="opacity-90">📞 {deliveryData.customer_phone}</div>
                )}
                {deliveryData.package_description && (
                  <div className="opacity-90">📦 {deliveryData.package_description}</div>
                )}
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {/* Messages List */}
          <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">אין הודעות עדיין</p>
                <p className="text-xs">שלח הודעה ראשונה לעסק</p>
              </div>
            ) : (
              messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${
                    msg.sender_role === "courier" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg p-3 ${
                      msg.sender_role === "courier"
                        ? "bg-blue-600 text-white"
                        : msg.sender_role === "business"
                        ? "bg-white border-2 border-gray-200 text-gray-900"
                        : "bg-purple-100 text-purple-900"
                    }`}
                  >
                    <p className="text-xs font-bold mb-1 opacity-75">
                      {msg.sender_role === "courier"
                        ? "אתה"
                        : msg.sender_role === "admin"
                        ? "🛡️ מנהל"
                        : msg.sender_name}
                    </p>
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {msg.text}
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.sender_role === "courier"
                          ? "text-blue-200"
                          : "text-gray-500"
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString("he-IL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t-2 border-gray-200">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="כתוב הודעה..."
                disabled={isSending}
                className="flex-1"
                dir="auto"
              />
              <Button
                onClick={sendMessage}
                disabled={isSending || !newMessage.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              💬 ההודעות נשמרות לצורך מעקב
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

