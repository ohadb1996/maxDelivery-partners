import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { User2, Phone, Mail, DollarSign, Package, TrendingUp, Bike, Car, Truck, Settings, X } from "lucide-react";
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
import { updateEmail, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth, db } from "@/api/config/firebase.config";
import { ref as dbRef, update } from "firebase/database";
import { validatePhoneNumber } from "@/api/utils/phoneValidity";

export default function Profile() {
  const { user, updateVehicleType } = useAuth();
  const [courier, setCourier] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, thisWeek: 0, totalEarnings: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('bike');
  
  // מצבים לעריכת פרופיל
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedPhone, setEditedPhone] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  
  // מצבים לגרפים
  const [, setCurrentMonthData] = useState<any>(null);
  const [, setCurrentMonthStats] = useState<any>(null);
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
        vehicle_type: user.vehicle_type || 'motorcycle', // שימוש ברמת התחבורה האמיתית
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
      console.log(`📊 [Profile] Loading statistics for courier: ${courierId}`);
      
      // קבלת כל הסטטיסטיקות החודשיות
      const allMonthsStats = await getMonthlyStats(courierId);
      console.log(`📊 [Profile] Found ${allMonthsStats.length} months with deliveries`);
      
      // חישוב סה"כ משלוחים
      const total = allMonthsStats.reduce((sum, month) => sum + month.deliveryCount, 0);
      console.log(`📊 [Profile] Total deliveries: ${total}`);
      
      // חישוב משלוחים השבוע
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const currentMonthStat = allMonthsStats.find(m => m.month === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
      const thisWeekDeliveries = currentMonthStat?.deliveries.filter(d => {
        const dateString = d.delivery_time || d.created_at || d.updated_at;
        if (!dateString) return false;
        
        const deliveryDate = new Date(dateString);
        return deliveryDate >= weekAgo;
      }).length || 0;
      
      console.log(`📊 [Profile] This week deliveries: ${thisWeekDeliveries}`);
      
      // חישוב סה"כ הכנסות
      const totalEarnings = allMonthsStats.reduce((sum, month) => sum + month.totalEarnings, 0);
      console.log(`📊 [Profile] Total earnings: ₪${totalEarnings}`);
      
      setStats({
        total,
        thisWeek: thisWeekDeliveries,
        totalEarnings
      });
    } catch (error) {
      console.error("Error loading statistics:", error);
      setStats({ total: 0, thisWeek: 0, totalEarnings: 0 });
    }
  };

  const loadMonthlyData = async () => {
    if (!user?.uid) return;

    try {
      console.log(`📊 [Profile] Loading monthly data for courier: ${user.uid}`);
      
      // טעינת נתוני החודש הנוכחי
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      console.log(`📊 [Profile] Loading current month: ${currentYear}-${currentMonth + 1}`);
      const currentStats = await getCurrentMonthStats(user.uid);
      const currentDaily = await getDailyStatsForMonth(user.uid, currentYear, currentMonth);
      
      console.log(`📊 [Profile] Current month stats:`, currentStats);
      console.log(`📊 [Profile] Current daily data:`, currentDaily);
      
      setCurrentMonthStats(currentStats);
      setCurrentMonthData(currentDaily);

      // טעינת נתוני החודש הנבחר
      console.log(`📊 [Profile] Loading selected month: ${selectedYear}-${selectedMonth + 1}`);
      const selectedStats = await getMonthlyStats(user.uid, selectedYear, selectedMonth);
      const selectedDaily = await getDailyStatsForMonth(user.uid, selectedYear, selectedMonth);
      
      console.log(`📊 [Profile] Selected month stats:`, selectedStats);
      console.log(`📊 [Profile] Selected daily data:`, selectedDaily);
      
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
      alert('שגיאה בעדכון סוג רכב. נסה שוב.');
    }
  };

  const handleEditProfile = () => {
    // הסרת +972 מהטלפון לתצוגה
    const phoneWithoutPrefix = user?.phone ? user.phone.replace(/^\+972/, '') : '';
    setEditedPhone(phoneWithoutPrefix);
    setEditedEmail(user?.email || '');
    setPhoneError('');
    setIsEditingProfile(true);
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setEditedPhone('');
    setEditedEmail('');
    setCurrentPassword('');
    setShowPasswordPrompt(false);
    setPhoneError('');
  };

  const handleSaveProfile = async () => {
    try {
      if (!user?.uid || !auth.currentUser) {
        alert('שגיאה: משתמש לא מחובר');
        return;
      }

      // ולידציה של מספר טלפון
      const phoneChanged = editedPhone !== user.phone?.replace(/^\+972/, '');
      if (phoneChanged && editedPhone) {
        console.log('📱 [Profile] Validating phone number:', editedPhone);
        const phoneValidation = validatePhoneNumber(editedPhone, 'IL');
        
        if (!phoneValidation.isValid) {
          setPhoneError(phoneValidation.error || 'מספר טלפון לא תקין');
          return;
        }
        
        setPhoneError('');
      }

      const emailChanged = editedEmail !== user.email;
      
      setIsSaving(true);
      console.log('💾 [Profile] Saving profile changes...');

      // עדכון מייל (אם השתנה) - צריך לבדוק אימות מחדש
      if (emailChanged) {
        try {
          // ניסיון לעדכן את המייל
          await updateEmail(auth.currentUser, editedEmail);
          console.log('✅ [Profile] Email updated in Firebase Auth');
          
          // עדכון המייל ב-Database
          await update(dbRef(db, `Couriers/${user.uid}`), { email: editedEmail });
          console.log('✅ [Profile] Email updated in Database');
        } catch (error: any) {
          if (error.code === 'auth/requires-recent-login') {
            // צריך אימות מחדש - מציג prompt לסיסמה
            setShowPasswordPrompt(true);
            setIsSaving(false);
            return;
          } else if (error.code === 'auth/email-already-in-use') {
            alert('❌ כתובת המייל כבר בשימוש. בחר מייל אחר.');
            setIsSaving(false);
            return;
          } else {
            alert(`❌ שגיאה בעדכון מייל: ${error.message}`);
            setIsSaving(false);
            return;
          }
        }
      }

      // עדכון מספר טלפון
      if (phoneChanged && editedPhone) {
        console.log('📱 [Profile] Updating phone number');
        const fullPhone = `+972${editedPhone}`;
        await update(dbRef(db, `Couriers/${user.uid}`), { phone: fullPhone });
        console.log('✅ [Profile] Phone updated successfully');
      }

      // הצלחה!
      alert('✅ הפרטים עודכנו בהצלחה!');
      setIsEditingProfile(false);
      setCurrentPassword('');
      setShowPasswordPrompt(false);
      setPhoneError('');
      
      // רענון הדף כדי לטעון את הנתונים המעודכנים
      if (emailChanged) {
        window.location.href = '/login'; // אם שינינו מייל - נתחבר מחדש
      } else {
        window.location.reload();
      }
    } catch (error: any) {
      console.error('❌ [Profile] Error saving profile:', error);
      alert(`❌ שגיאה בשמירת פרטים: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // טיפול באימות מחדש כאשר נדרש
  const handleReauth = async () => {
    if (!currentPassword) {
      alert('נדרשת סיסמה');
      return;
    }

    try {
      if (!user?.email || !auth.currentUser) {
        throw new Error('משתמש לא זוהה');
      }

      // אימות מחדש עם הסיסמה
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      console.log('✅ [Profile] Reauthentication successful');

      // עכשיו ננסה שוב לעדכן את המייל
      setShowPasswordPrompt(false);
      setCurrentPassword('');
      await handleSaveProfile();
    } catch (error: any) {
      console.error('❌ [Profile] Reauthentication error:', error);
      if (error.code === 'auth/wrong-password') {
        alert('❌ סיסמה שגויה. נסה שוב.');
      } else {
        alert(`❌ שגיאה באימות: ${error.message}`);
      }
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
          {isEditingProfile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">עריכת פרופיל</h3>
                <Button
                  onClick={handleCancelEdit}
                  variant="ghost"
                  size="sm"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                    מספר טלפון
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        type="tel"
                        value={editedPhone}
                        onChange={(e) => {
                          // רק מספרים
                          let value = e.target.value.replace(/[^0-9]/g, '');
                          // הסרת 0 מהתחלה אם קיים
                          if (value.startsWith('0')) {
                            value = value.substring(1);
                          }
                          setEditedPhone(value);
                          // נקה שגיאה כשמתחילים לכתוב
                          if (phoneError) setPhoneError('');
                        }}
                        placeholder="501234567 או 0501234567"
                        className={`text-left ${phoneError ? 'border-red-500 focus:ring-red-500' : ''}`}
                        dir="ltr"
                      />
                    </div>
                    <div className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-md border border-gray-300">
                      <span className="text-lg">🇮🇱</span>
                      <span className="text-sm font-medium text-gray-700">+972</span>
                    </div>
                  </div>
                  {phoneError ? (
                    <p className="text-xs text-red-600 mt-1 text-right">
                      {phoneError}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1 text-right">
                      מספר בן 9 ספרות המתחיל ב-5 (עם או בלי 0 בהתחלה)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                    כתובת מייל
                  </label>
                  <Input
                    type="email"
                    value={editedEmail}
                    onChange={(e) => setEditedEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="text-left"
                    dir="ltr"
                  />
                  {editedEmail !== user?.email && (
                    <p className="text-xs text-orange-600 mt-1 text-right">
                      ⚠️ שינוי מייל ידרוש התחברות מחדש
                    </p>
                  )}
                </div>

                {showPasswordPrompt && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3">
                    <p className="text-sm text-yellow-800 text-right font-medium">
                      🔐 אימות נדרש
                    </p>
                    <p className="text-xs text-yellow-700 text-right">
                      הזן את הסיסמה הנוכחית כדי לאשר את שינוי המייל:
                    </p>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="סיסמה נוכחית"
                      className="text-right"
                      dir="rtl"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleReauth();
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleReauth}
                        disabled={isSaving || !currentPassword}
                        className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                      >
                        אמת ושמור
                      </Button>
                      <Button
                        onClick={() => {
                          setShowPasswordPrompt(false);
                          setCurrentPassword('');
                        }}
                        variant="outline"
                        disabled={isSaving}
                        className="flex-1"
                      >
                        ביטול
                      </Button>
                    </div>
                  </div>
                )}

                {!showPasswordPrompt && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isSaving || !!phoneError}
                      className="flex-1"
                    >
                      {isSaving ? 'שומר...' : 'שמור שינויים'}
                    </Button>
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      disabled={isSaving}
                      className="flex-1"
                    >
                      ביטול
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
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
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-1 justify-end">
                    <Mail className="w-3 h-3" />
                    <span className="text-gray-600">{user?.email}</span>
                  </div>
                  {user?.phone && (
                    <div className="flex items-center gap-1 text-sm text-gray-600 justify-end">
                      <Phone className="w-3 h-3" />
                      {user.phone}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {!isEditingProfile && (
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
                  >
                    <Settings className="w-3 h-3 mr-1" />
                    שנה רכב
                  </Button>
                  <Button
                    onClick={handleEditProfile}
                    variant="outline"
                    size="sm"
                    className="ml-auto"
                  >
                    <Settings className="w-3 h-3 mr-1" />
                    ערוך פרופיל
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {stats.total === 0 ? (
        <Card className="mb-6 border-2 border-dashed border-gray-300">
          <CardContent className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">עדיין אין משלוחים</h3>
            <p className="text-sm text-gray-500 mb-4">
              כשתקבל משלוחים ותמסור אותם, הסטטיסטיקות יופיעו כאן
            </p>
            <div className="text-xs text-gray-400">
              🚀 צא לדרך ותתחיל לעבוד!
            </div>
          </CardContent>
        </Card>
      ) : (
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
              <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">₪{stats.totalEarnings.toFixed(0)}</p>
              <p className="text-xs text-gray-500">הכנסות</p>
            </CardContent>
          </Card>
        </div>
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
            <div className="mt-6 text-center py-8">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-600 mb-2">אין משלוחים בחודש זה</h4>
              <p className="text-gray-500 text-sm">נסה לבחור חודש אחר או חכה למשלוחים נוספים</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
