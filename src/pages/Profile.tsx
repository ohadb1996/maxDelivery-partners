import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User2, Phone, Star, Package, TrendingUp, Bike, Car, Truck, Settings } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { VehicleType } from "@/types";
import { 
  getCurrentMonthStats, 
  getDailyStatsForMonth,
  getMonthlyStats
} from "@/services/deliveryService";
import MonthlyDeliveriesChart from "@/components/courier/MonthlyDeliveriesChart";
import MonthSelector from "@/components/courier/MonthSelector";
import MonthlyStatsCard from "@/components/courier/MonthlyStatsCard";

export default function Profile() {
  const { user, updateVehicleType } = useAuth();
  const [courier, setCourier] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, thisWeek: 0, rating: 5.0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('bike');
  
  // מצבים לגרפים
  const [currentMonthData, setCurrentMonthData] = useState<any>(null);
  const [currentMonthStats, setCurrentMonthStats] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedMonthData, setSelectedMonthData] = useState<any>(null);
  const [selectedMonthStats, setSelectedMonthStats] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (user?.uid) {
      loadMonthlyData();
    }
  }, [user, selectedYear, selectedMonth]);

  const loadProfile = async () => {
    try {
      if (!user) {
        console.log("No user data available");
        setIsLoading(false);
        return;
      }

      // שימוש בנתונים אמיתיים מהמשתמש
      const courierData = {
        id: user.uid,
        business_email: user.email,
        phone: user.phone || "",
        vehicle_type: user.vehicle_type || 'bike', // שימוש ברמת התחבורה האמיתית
        is_available: user.isAvailable || false,
        rating: 4.8, // זה יבוא מהמשלוחים בפועל
        created_at: user.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setCourier(courierData);
      
      // טעינת נתונים סטטיסטיים אמיתיים
      await loadStatistics(user.uid);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStatistics = async (courierId: string) => {
    try {
      // קבלת כל הסטטיסטיקות החודשיות
      const allMonthsStats = await getMonthlyStats(courierId);
      
      // חישוב סה"כ משלוחים
      const total = allMonthsStats.reduce((sum, month) => sum + month.deliveryCount, 0);
      
      // חישוב משלוחים השבוע
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const currentMonthStat = allMonthsStats.find(m => m.month === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
      const thisWeekDeliveries = currentMonthStat?.deliveries.filter(d => {
        const deliveryDate = new Date(d.delivery_time!);
        return deliveryDate >= weekAgo;
      }).length || 0;
      
      setStats({
        total,
        thisWeek: thisWeekDeliveries,
        rating: 4.8
      });
    } catch (error) {
      console.error("Error loading statistics:", error);
      setStats({ total: 0, thisWeek: 0, rating: 5.0 });
    }
  };

  const loadMonthlyData = async () => {
    if (!user?.uid) return;

    try {
      // טעינת נתוני החודש הנוכחי
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      const currentStats = await getCurrentMonthStats(user.uid);
      const currentDaily = await getDailyStatsForMonth(user.uid, currentYear, currentMonth);
      
      setCurrentMonthStats(currentStats);
      setCurrentMonthData(currentDaily);

      // טעינת נתוני החודש הנבחר
      const selectedStats = await getMonthlyStats(user.uid, selectedYear, selectedMonth);
      const selectedDaily = await getDailyStatsForMonth(user.uid, selectedYear, selectedMonth);
      
      setSelectedMonthStats(selectedStats.length > 0 ? selectedStats[0] : null);
      setSelectedMonthData(selectedDaily);
    } catch (error) {
      console.error("Error loading monthly data:", error);
    }
  };

  const vehicleIcons = {
    bike: Bike,
    motorcycle: Bike, // נשתמש באייקון אופניים לאופנוע
    car: Car,
    truck: Truck
  };

  const vehicleLabels = {
    bike: 'אופניים',
    motorcycle: 'אופנוע',
    car: 'רכב',
    truck: 'משאית'
  };

  const handleVehicleUpdate = async () => {
    try {
      if (!user?.uid) {
        console.error('No user ID available');
        return;
      }

      console.log('Updating vehicle type to:', selectedVehicle);
      
      // שמירה ב-Firebase ועדכון AuthContext
      await updateVehicleType(selectedVehicle);
      
      // עדכון מקומי
      setCourier({ ...courier, vehicle_type: selectedVehicle });
      setIsEditingVehicle(false);
      
      console.log('Vehicle type updated successfully');
    } catch (error) {
      console.error('Error updating vehicle type:', error);
      // כאן אפשר להוסיף הודעת שגיאה למשתמש
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="space-y-4">
          <div className="h-40 bg-gray-200 rounded-2xl animate-pulse" />
          <div className="h-32 bg-gray-200 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  const vehicleType: keyof typeof vehicleIcons = (courier?.vehicle_type as keyof typeof vehicleIcons) || 'bike';
  const VehicleIcon = vehicleIcons[vehicleType];

  return (
    <div className="p-4 pb-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">פרופיל</h2>

      <Card className="mb-4 border-2 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
              <User2 className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}` 
                  : user?.username || 'משתמש'
                }
              </h3>
              <p className="text-gray-600 mb-2 ">{user?.email}</p>
              {user?.phone && (
                <div className="flex items-center gap-1 text-sm text-gray-600 justify-end">
                  <Phone className="w-3 h-3" />
                  {user.phone}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t">
            {isEditingVehicle ? (
              <div className="flex-1">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {(['bike', 'motorcycle', 'car', 'truck'] as VehicleType[]).map((vehicle) => {
                    const Icon = vehicleIcons[vehicle];
                    return (
                      <button
                        key={vehicle}
                        onClick={() => setSelectedVehicle(vehicle)}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                          selectedVehicle === vehicle
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{vehicleLabels[vehicle]}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleVehicleUpdate} size="sm" className="flex-1">
                    שמור
                  </Button>
                  <Button 
                    onClick={() => setIsEditingVehicle(false)} 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                  >
                    ביטול
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                  <VehicleIcon className="w-3 h-3 mr-1" />
                  {vehicleLabels[(courier?.vehicle_type as VehicleType) || 'bike']}
                </Badge>
                <Button
                  onClick={() => {
                    setSelectedVehicle((courier?.vehicle_type as VehicleType) || 'bike');
                    setIsEditingVehicle(true);
                  }}
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                >
                  <Settings className="w-3 h-3 mr-1" />
                  ערוך
                </Button>
              </>
            )}
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="font-semibold text-gray-900">{stats.rating.toFixed(1)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">סה"כ</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{stats.thisWeek}</p>
            <p className="text-xs text-gray-500">השבוע</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Star className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{stats.rating.toFixed(1)}</p>
            <p className="text-xs text-gray-500">דירוג</p>
          </CardContent>
        </Card>
      </div>

      {/* גרף החודש הנוכחי */}
      {currentMonthStats && currentMonthData && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <MonthlyStatsCard
              deliveryCount={currentMonthStats.deliveryCount}
              totalEarnings={currentMonthStats.totalEarnings}
              monthName={currentMonthStats.monthName}
            />
            <div className="mt-6">
              <MonthlyDeliveriesChart
                data={currentMonthData}
                title={`משלוחים ב${currentMonthStats.monthName}`}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* בורר חודש וגרף חודש נבחר */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-right">
            סטטיסטיקות לפי חודש
          </h3>
          
          <MonthSelector
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={(year, month) => {
              setSelectedYear(year);
              setSelectedMonth(month);
            }}
          />

          {selectedMonthStats && selectedMonthData && (
            <div className="mt-6 space-y-6">
              <MonthlyStatsCard
                deliveryCount={selectedMonthStats.deliveryCount}
                totalEarnings={selectedMonthStats.totalEarnings}
                monthName={selectedMonthStats.monthName}
              />
              <MonthlyDeliveriesChart
                data={selectedMonthData}
                title={`משלוחים ב${selectedMonthStats.monthName}`}
              />
            </div>
          )}

          {(!selectedMonthStats || selectedMonthStats.deliveryCount === 0) && (
            <div className="mt-6 text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">אין משלוחים בחודש זה</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
