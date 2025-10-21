import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, DollarSign, CheckCircle, Calendar, TrendingUp, Package } from "lucide-react";
import { Delivery } from "@/types";
import { getCourierDeliveries } from "@/services/deliveryService";
import { useAuth } from "@/context/AuthContext";

export default function History() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    if (user) {
    loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      console.log('📦 [History] Loading delivery history for courier:', user.uid);
      
      // Fetch actual completed deliveries from the database
      const completedDeliveries = await getCourierDeliveries(user.uid);
      
      console.log('✅ [History] Loaded deliveries:', completedDeliveries.length);
      
      // Sort by delivery time (most recent first)
      const sortedDeliveries = completedDeliveries.sort((a, b) => {
        const dateA = new Date(a.delivery_time || a.updated_at).getTime();
        const dateB = new Date(b.delivery_time || b.updated_at).getTime();
        return dateB - dateA;
      });
      
      setDeliveries(sortedDeliveries);
    } catch (error) {
      console.error("❌ [History] Error loading history:", error);
    }
    setIsLoading(false);
  };

  // Filter deliveries by selected date
  const filteredDeliveries = deliveries.filter(delivery => {
    const deliveryDate = new Date(delivery.delivery_time || delivery.updated_at || 0)
      .toISOString()
      .split('T')[0];
    return deliveryDate === selectedDate;
  });

  // Get unique dates that have deliveries
  const availableDates = Array.from(
    new Set(
      deliveries.map(d => 
        new Date(d.delivery_time || d.updated_at || 0).toISOString().split('T')[0]
      )
    )
  ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // Calculate stats for selected date
  const totalEarnings = filteredDeliveries.reduce((sum, d) => sum + (d.payment_amount || 0), 0);

  // Format date for display
  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateOnly = dateString;
    const todayOnly = today.toISOString().split('T')[0];
    const yesterdayOnly = yesterday.toISOString().split('T')[0];
    
    if (dateOnly === todayOnly) return "היום";
    if (dateOnly === yesterdayOnly) return "אתמול";
    
    return date.toLocaleDateString('he-IL', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

    return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-4" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              היסטוריית משלוחים 📋
            </h1>
          </div>
          <p className="text-gray-600">
            צפה במשלוחים שהשלמת לפי תאריך
          </p>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <div className="bg-gray-200 rounded-xl h-96 animate-pulse" />
            </div>
            <div className="md:col-span-2 space-y-4">
          {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Date Picker Section */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  בחר תאריך
                </h2>
                
                {/* Calendar Input */}
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
                  dir="ltr"
                />

                {/* Quick Date Selection */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700 mb-2">בחירה מהירה:</p>
                  {availableDates.slice(0, 10).map(date => (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={`w-full text-right px-4 py-2 rounded-lg transition-all ${
                        selectedDate === date
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{formatDateDisplay(date)}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          selectedDate === date ? 'bg-white/20' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {deliveries.filter(d => 
                            new Date(d.delivery_time || d.updated_at || 0).toISOString().split('T')[0] === date
                          ).length}
                        </span>
                      </div>
                    </button>
                  ))}
                  
                  {availableDates.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-4">
                      אין משלוחים היסטוריים
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content Section */}
            <div className="md:col-span-2">
              {/* Stats for Selected Date */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white rounded-xl shadow-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{filteredDeliveries.length}</div>
                      <div className="text-xs text-gray-600">משלוחים</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">₪{totalEarnings}</div>
                      <div className="text-xs text-gray-600">הכנסות</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deliveries List */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  משלוחים ב{formatDateDisplay(selectedDate)}
                </h2>

                {filteredDeliveries.length === 0 ? (
        <div className="text-center py-12">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg font-medium mb-1">אין משלוחים בתאריך זה</p>
                    <p className="text-gray-400 text-sm">נסה לבחור תאריך אחר מהרשימה</p>
        </div>
      ) : (
        <div className="space-y-3">
                    {filteredDeliveries.map((delivery) => (
                      <Card key={delivery.id} className="border border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                        {delivery.order_number || `#${delivery.id.slice(0, 8)}`}
                      </Badge>
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                        <DollarSign className="w-3 h-3 mr-1" />
                                  ₪{delivery.payment_amount}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-lg">{delivery.customer_name}</h3>
                    <p className="text-sm text-gray-600">{delivery.package_description}</p>
                  </div>
                            <div className="text-left">
                              <p className="text-xs text-gray-500">הושלם</p>
                    <p className="text-sm font-medium text-gray-900">
                      {delivery.delivery_time ? formatDate(delivery.delivery_time) : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 bg-blue-600 rounded-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500 mb-0.5">איסוף</p>
                      <p className="text-sm font-medium text-gray-900 truncate">{delivery.pickup_address}</p>
                    </div>
                  </div>

                            <div className="flex items-center pr-3">
                    <div className="w-px h-4 bg-gray-300" />
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="w-6 h-6 text-green-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500 mb-0.5">משלוח</p>
                      <p className="text-sm font-medium text-gray-900 truncate">{delivery.delivery_address}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4 pt-3 border-t">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>
                      {delivery.accepted_time && delivery.delivery_time ? 
                                  `${Math.round((new Date(delivery.delivery_time).getTime() - new Date(delivery.accepted_time).getTime()) / 60000)} דקות` : 
                        'N/A'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
