import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, DollarSign, CheckCircle, Calendar, Package, Search } from "lucide-react";
import { Delivery } from "@/types";
import { getCourierDeliveries } from "@/services/deliveryService";
import { useAuth } from "@/context/AuthContext";

type FilterType = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export default function History() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('today');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

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

  // Get date range based on selected filter
  const getDateRange = (): { start: Date; end: Date } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    switch (selectedFilter) {
      case 'today':
        return { start: today, end: tomorrow };
      
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: yesterday, end: today };
      
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - 7);
        return { start: weekStart, end: tomorrow };
      
      case 'month':
        const monthStart = new Date(today);
        monthStart.setDate(monthStart.getDate() - 30);
        return { start: monthStart, end: tomorrow };
      
      case 'custom':
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setDate(end.getDate() + 1); // Include the end date
          return { start, end };
        }
        return { start: today, end: tomorrow };
      
      default:
        return { start: today, end: tomorrow };
    }
  };

  // Filter deliveries by selected date range
  const filteredDeliveries = deliveries.filter(delivery => {
    const deliveryDate = new Date(delivery.delivery_time || delivery.updated_at || 0);
    const { start, end } = getDateRange();
    return deliveryDate >= start && deliveryDate < end;
  });

  // Calculate stats for selected date range
  const totalEarnings = filteredDeliveries.reduce((sum, d) => sum + (d.payment_amount || 0), 0);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get display text for current filter
  const getFilterDisplayText = () => {
    switch (selectedFilter) {
      case 'today':
        return 'היום';
      case 'yesterday':
        return 'אתמול';
      case 'week':
        return 'השבוע';
      case 'month':
        return 'החודש';
      case 'custom':
        if (customStartDate && customEndDate) {
          return `${new Date(customStartDate).toLocaleDateString('he-IL')} - ${new Date(customEndDate).toLocaleDateString('he-IL')}`;
        }
        return 'טווח מותאם אישית';
      default:
        return '';
    }
  };

  const handleCustomSearch = () => {
    if (customStartDate && customEndDate) {
      // Filter is already applied through the getDateRange function
      // This just ensures the UI updates
      setSelectedFilter('custom');
    }
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

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-lg p-2 mb-6">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedFilter('today')}
              className={`px-6 py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
                selectedFilter === 'today'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              היום
            </button>
            <button
              onClick={() => setSelectedFilter('yesterday')}
              className={`px-6 py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
                selectedFilter === 'yesterday'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              אתמול
            </button>
            <button
              onClick={() => setSelectedFilter('week')}
              className={`px-6 py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
                selectedFilter === 'week'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              השבוע
            </button>
            <button
              onClick={() => setSelectedFilter('month')}
              className={`px-6 py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
                selectedFilter === 'month'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              החודש
            </button>
            <button
              onClick={() => setSelectedFilter('custom')}
              className={`px-6 py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
                selectedFilter === 'custom'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              מותאם אישית
            </button>
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {selectedFilter === 'custom' && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">בחר טווח תאריכים</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  תאריך התחלה
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  תאריך סיום
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  dir="ltr"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleCustomSearch}
                  disabled={!customStartDate || !customEndDate}
                  className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <Search className="w-5 h-5" />
                  חפש
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
              <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div>
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
                  משלוחים - {getFilterDisplayText()}
                </h2>

                {filteredDeliveries.length === 0 ? (
        <div className="text-center py-12">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg font-medium mb-1">אין משלוחים בטווח זה</p>
                    <p className="text-gray-400 text-sm">נסה לבחור טווח תאריכים אחר</p>
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
        )}
      </div>
    </div>
  );
}
