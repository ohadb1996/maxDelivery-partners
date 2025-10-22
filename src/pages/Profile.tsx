import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { User2, Phone, Mail, Bike, Car, Truck, Settings, X, CreditCard } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { VehicleType } from "@/types";
import { updateEmail, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth, db } from "@/api/config/firebase.config";
import { ref as dbRef, update } from "firebase/database";
import { validatePhoneNumber } from "@/api/utils/phoneValidity";

export default function Profile() {
  const { user, updateVehicleType } = useAuth();
  const [courier, setCourier] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('bike');
  
  // מצבים לעריכת פרופיל
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedPhone, setEditedPhone] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [editedBankName, setEditedBankName] = useState('');
  const [editedBankAccount, setEditedBankAccount] = useState('');
  const [editedBankBranch, setEditedBankBranch] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

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
        vehicle_type: user.vehicle_type || 'motorcycle',
        is_available: user.isAvailable || false,
        bank_name: user.bank_name || "",
        bank_account: user.bank_account || "",
        bank_branch: user.bank_branch || "",
        created_at: user.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setCourier(courierData);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setIsLoading(false);
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
    setEditedBankName(courier?.bank_name || '');
    setEditedBankAccount(courier?.bank_account || '');
    setEditedBankBranch(courier?.bank_branch || '');
    setPhoneError('');
    setIsEditingProfile(true);
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setEditedPhone('');
    setEditedEmail('');
    setEditedBankName('');
    setEditedBankAccount('');
    setEditedBankBranch('');
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

      // עדכון פרטי בנק
      const bankChanged = 
        editedBankName !== courier?.bank_name ||
        editedBankAccount !== courier?.bank_account ||
        editedBankBranch !== courier?.bank_branch;

      if (bankChanged) {
        console.log('🏦 [Profile] Updating bank details');
        await update(dbRef(db, `Couriers/${user.uid}`), {
          bank_name: editedBankName,
          bank_account: editedBankAccount,
          bank_branch: editedBankBranch
        });
        console.log('✅ [Profile] Bank details updated successfully');
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
                        placeholder="50-123-4567"
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

                <div className="pt-3 border-t">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 text-right flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    פרטי חשבון בנק
                  </h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                        שם הבנק
                      </label>
                      <Input
                        type="text"
                        value={editedBankName}
                        onChange={(e) => setEditedBankName(e.target.value)}
                        placeholder="לאומי, הפועלים, דיסקונט..."
                        className="text-right"
                        dir="rtl"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                        מספר סניף
                      </label>
                      <Input
                        type="text"
                        value={editedBankBranch}
                        onChange={(e) => setEditedBankBranch(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="123"
                        className="text-left"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                        מספר חשבון
                      </label>
                      <Input
                        type="text"
                        value={editedBankAccount}
                        onChange={(e) => setEditedBankAccount(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="123456"
                        className="text-left"
                        dir="ltr"
                      />
                    </div>
                  </div>
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

              {/* Bank Account Details Display */}
              {(courier?.bank_name || courier?.bank_account || courier?.bank_branch) && (
                <div className="pt-4 mt-4 border-t">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 text-right flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    פרטי חשבון בנק
                  </h4>
                  <div className="space-y-2 text-right">
                    {courier?.bank_name && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-900 font-medium">{courier.bank_name}</span>
                        <span className="text-xs text-gray-500">שם הבנק:</span>
                      </div>
                    )}
                    {courier?.bank_branch && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-900 font-medium" dir="ltr">{courier.bank_branch}</span>
                        <span className="text-xs text-gray-500">מספר סניף:</span>
                      </div>
                    )}
                    {courier?.bank_account && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-900 font-medium" dir="ltr">{courier.bank_account}</span>
                        <span className="text-xs text-gray-500">מספר חשבון:</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
    </div>
  );
}
