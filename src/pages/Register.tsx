import React, { useState, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { Lock, User, Mail, Phone, AlertCircle } from "lucide-react";
import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthCard } from "../components/auth/AuthCard";
import { AuthInput } from "../components/auth/AuthInput";
import { AuthSubmitButton } from "../components/auth/AuthSubmitButton";
import { AuthLink } from "../components/auth/AuthLink";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  countryData,
  CountryCode
} from "../api/utils/phoneValidity";

interface RegistrationForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: CountryCode;
  password: string;
}

export default function RegistrationPage() {
  const { register, isAuthInProgress, clearAuthInProgress } = useAuth();
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);
  
  const [formData, setFormData] = useState<RegistrationForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "IL",
    password: "",
  });
  const [errors, setErrors] = useState<Partial<RegistrationForm>>({});
  const [registrationError, setRegistrationError] = useState("");
  const [showCountryList, setShowCountryList] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  // איפוס isNavigating כשהניווט מסתיים
  useEffect(() => {
    const handleRouteChangeStart = () => {
      // הניווט התחיל
    };
    
    const handleRouteChangeComplete = () => {
      // הניווט הסתיים
      setIsNavigating(false);
    };
    
    const handleRouteChangeError = () => {
      // הניווט נכשל
      setIsNavigating(false);
    };

    // Note: In React Router, we don't have router events like Next.js
    // We'll handle navigation state differently

    return () => {
      // Cleanup if needed
    };
  }, [navigate]);

  // בדיקת וולידציה על כל שינוי
  useEffect(() => {
    const validateAllFields = async () => {
      const newErrors = { ...errors };
      
      // בדיקת אימייל
      if (formData.email.trim()) {
        if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
          newErrors.email = "כתובת מייל לא תקינה";
        } else {
          try {
            const { checkUserExistsByEmail } = await import("../api/authFiles/AuthFuncs");
            const emailExists = await checkUserExistsByEmail(formData.email);
            if (emailExists.exists) {
              newErrors.email = "כתובת המייל כבר קיימת במערכת";
            } else {
              delete newErrors.email;
            }
          } catch (error) {
            console.error('Error checking email availability:', error);
          }
        }
      } else {
        delete newErrors.email;
      }

      // בדיקת שם פרטי
      if (formData.firstName.trim()) {
        if (!/^[a-zA-Z\u0590-\u05FF\s]+$/.test(formData.firstName)) {
          newErrors.firstName = "שם פרטי יכול להכיל רק אותיות";
        } else if (formData.firstName.length < 2) {
          newErrors.firstName = "שם פרטי חייב להיות לפחות 2 תווים";
        } else {
          delete newErrors.firstName;
        }
      } else {
        delete newErrors.firstName;
      }

      // בדיקת שם משפחה
      if (formData.lastName.trim()) {
        if (!/^[a-zA-Z\u0590-\u05FF\s]+$/.test(formData.lastName)) {
          newErrors.lastName = "שם משפחה יכול להכיל רק אותיות";
        } else if (formData.lastName.length < 2) {
          newErrors.lastName = "שם משפחה חייב להיות לפחות 2 תווים";
        } else {
          delete newErrors.lastName;
        }
      } else {
        delete newErrors.lastName;
      }

      // בדיקת מספר טלפון
      if (formData.phone.trim()) {
        const { validatePhoneNumber } = await import("../api/utils/phoneValidity");
        const phoneValidation = validatePhoneNumber(formData.phone, formData.country);
        if (!phoneValidation.isValid) {
          newErrors.phone = phoneValidation.error;
        } else {
          // בדיקת זמינות מספר הטלפון
          try {
            const { checkPhoneAvailability } = await import("../api/authFiles/AuthFuncs");
            const phoneExists = await checkPhoneAvailability(formData.phone);
            if (phoneExists.exists) {
              newErrors.phone = "מספר הטלפון כבר קיים במערכת";
            } else {
              delete newErrors.phone;
            }
          } catch (error) {
            console.error('Error checking phone availability:', error);
            delete newErrors.phone;
          }
        }
      } else {
        delete newErrors.phone;
      }

      // בדיקת סיסמה
      if (formData.password) {
        if (formData.password.length < 8) {
          newErrors.password = "הסיסמה חייבת להכיל לפחות 8 תווים";
        } else if (!/[A-Z]/.test(formData.password)) {
          newErrors.password = "הסיסמה חייבת להכיל לפחות אות גדולה אחת";
        } else if (!/^[A-Za-z0-9]+$/.test(formData.password)) {
          newErrors.password = "הסיסמה יכולה להכיל רק אותיות באנגלית ומספרים";
        } else {
          delete newErrors.password;
        }
      } else {
        delete newErrors.password;
      }

      setErrors(newErrors);
    };

    // בדוק כל 500ms כדי לא לעשות יותר מדי קריאות
    const timeoutId = setTimeout(validateAllFields, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.email, formData.username, formData.phone, formData.password, formData.country]);

  // סגירת התפריט בלחיצה מחוץ לו
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.country-selector')) {
        setShowCountryList(false);
      }
    };

    if (showCountryList) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCountryList]);

  const validateForm = (): boolean => {
    const newErrors: Partial<RegistrationForm> = {};

    // בדיקת שם פרטי
    if (!formData.firstName.trim()) {
      newErrors.firstName = "שם פרטי הוא שדה חובה";
    } else if (!/^[a-zA-Z\u0590-\u05FF\s]+$/.test(formData.firstName)) {
      newErrors.firstName = "שם פרטי יכול להכיל רק אותיות";
    } else if (formData.firstName.length < 2) {
      newErrors.firstName = "שם פרטי חייב להיות לפחות 2 תווים";
    }

    // בדיקת שם משפחה
    if (!formData.lastName.trim()) {
      newErrors.lastName = "שם משפחה הוא שדה חובה";
    } else if (!/^[a-zA-Z\u0590-\u05FF\s]+$/.test(formData.lastName)) {
      newErrors.lastName = "שם משפחה יכול להכיל רק אותיות";
    } else if (formData.lastName.length < 2) {
      newErrors.lastName = "שם משפחה חייב להיות לפחות 2 תווים";
    }

    // בדיקת אימייל
    if (!formData.email.trim()) {
      newErrors.email = "כתובת מייל היא שדה חובה";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = "כתובת מייל לא תקינה";
    }

    // בדיקת טלפון
    if (!formData.phone.trim()) {
      newErrors.phone = "מספר טלפון הוא שדה חובה";
    } else {
      // בדיקת וולידציה של מספר טלפון
      import("../api/utils/phoneValidity").then(({ validatePhoneNumber }) => {
        const phoneValidation = validatePhoneNumber(formData.phone, formData.country);
        if (!phoneValidation.isValid) {
          newErrors.phone = phoneValidation.error;
        }
      });
    }

    // בדיקת סיסמה
    if (!formData.password) {
      newErrors.password = "סיסמה היא שדה חובה";
    } else if (formData.password.length < 8) {
      newErrors.password = "הסיסמה חייבת להכיל לפחות 8 תווים";
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = "הסיסמה חייבת להכיל לפחות אות גדולה אחת";
    } else if (!/^[A-Za-z0-9]+$/.test(formData.password)) {
      newErrors.password = "הסיסמה יכולה להכיל רק אותיות באנגלית ומספרים";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // בדיקת זמינות אימייל ושם משתמש
  const checkAvailability = async (): Promise<boolean> => {
    setIsCheckingAvailability(true);
    try {
      // בדיקת זמינות אימייל
      const { checkUserExistsByEmail } = await import("../api/authFiles/AuthFuncs");
      const emailExists = await checkUserExistsByEmail(formData.email);
      
      if (emailExists.exists) {
        setErrors(prev => ({ ...prev, email: "כתובת המייל כבר קיימת במערכת" }));
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking availability:', error);
      return false;
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistrationError("");

    // בדיקת וולידציה
    if (!validateForm()) return;

    // בדיקת זמינות
    const isAvailable = await checkAvailability();
    if (!isAvailable) return;

    try {
      // יצירת username אוטומטי מהאימייל
      const username = formData.email.split('@')[0];
      
      await register({
        email: formData.email,
        password: formData.password,
        username: username,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        country: formData.country
      });
      
      // ניווט אוטומטי לדשבורד
      console.log('[RegistrationPage] Registration successful, navigating to dashboard...');
      setIsNavigating(true); // התחל מצב ניווט
      
      // נקה את מצב ה-auth progress כדי לאפשר לניווט לעבוד
      clearAuthInProgress();
      
      navigate('/');
      
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // טיפול מיוחד בשגיאות אימות טלפון
      if (error.name === 'PhoneValidationError' || (error.message && error.message.includes('מספר טלפון'))) {
        setRegistrationError(error.message);
      } else if (error.message && error.message.includes('Registration failed:')) {
        // הסרת הקידומת "Registration failed:" מהשגיאה
        const cleanError = error.message.replace('Registration failed: ', '');
        setRegistrationError(cleanError);
      } else {
        setRegistrationError(error.message || "אירעה שגיאה בהרשמה");
      }
    }
  };

  const handleChange =
    (field: keyof RegistrationForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;

      // הגבלת שם פרטי ושם משפחה לאותיות בלבד
      if (field === "firstName" || field === "lastName") {
        value = value.replace(/[^a-zA-Z\u0590-\u05FF\s]/g, "");
      }

      // הגבלת סיסמה לתווים מותרים
      if (field === "password") {
        value = value.replace(/[^A-Za-z0-9]/g, "");
      }

      setFormData((prev) => ({ ...prev, [field]: value }));

      // איפוס שגיאה כשהשדה משתנה
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
      
      // איפוס שגיאת הרשמה כשמשנים מספר טלפון
      if (field === "phone") {
        setRegistrationError("");
      }
    };

 return (
    <AuthLayout>
      <AuthCard>
        <h3 className="text-2xl font-bold mb-6 text-center">הרשמה</h3>

        {registrationError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{registrationError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <AuthInput
              type="text"
              value={formData.firstName}
              onChange={handleChange("firstName")}
              placeholder="הכנס שם פרטי"
              icon={<User className="h-5 w-5" />}
              label="שם פרטי"
              error={errors.firstName}
            />
            
            <AuthInput
              type="text"
              value={formData.lastName}
              onChange={handleChange("lastName")}
              placeholder="הכנס שם משפחה"
              icon={<User className="h-5 w-5" />}
              label="שם משפחה"
              error={errors.lastName}
            />
          </div>

          <AuthInput
            type="email"
            value={formData.email}
            onChange={handleChange("email")}
            placeholder="הכנס כתובת מייל"
            icon={<Mail className="h-5 w-5" />}
            label="כתובת מייל"
            error={errors.email}
          />

          <div className="space-y-2">
        <label className="block text-sm mb-2">מספר טלפון</label>
        <div className="relative country-selector">
          <div className="flex items-center w-full bg-white/5 border rounded-xl focus-within:ring-2 transition-all focus-within:border-blue-500 focus-within:ring-blue-500/20 overflow-hidden">
            {/* אייקון טלפון (שמאל) */}
            <div className="px-3 text-gray-400 flex-shrink-0">
              <Phone className="h-5 w-5" />
            </div>
            
            {/* מספר טלפון (אמצע) */}
            <input
              type="tel"
              value={formData.phone}
              onChange={handleChange("phone")}
              placeholder={
                formData.country === "IL"
                  ? "501234567"
                  : formData.country === "US"
                  ? "2015550123"
                  : "612345678"
              }
              className="flex-1 bg-transparent px-3 py-3 text-white focus:outline-none border-none min-w-0"
              dir="ltr"
            />

            {/* בחירת מדינה (ימין) */}
            <div className="flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowCountryList(!showCountryList)}
                className="h-full px-4 py-3 border-l border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-200 flex items-center gap-2 min-w-[120px] group"
              >
                <span className="text-lg">
                  {countryData[formData.country]?.flag}
                </span>
                <span className="text-sm font-medium text-white">
                  {countryData[formData.country]?.prefix}
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                  showCountryList ? 'rotate-180' : ''
                }`} />
              </button>
              
              {showCountryList && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-[#0a1122]/95 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden z-50 shadow-2xl">
                  <div className="max-h-72 overflow-y-auto">
                    {Object.entries(countryData).map(([code, data]) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          setFormData({...formData, country: code as CountryCode});
                          setShowCountryList(false);
                        }}
                        className="w-full px-4 py-3 text-right hover:bg-white/10 flex items-center gap-3 transition-all duration-200"
                      >
                        <span className="text-xl">{data.flag}</span>
                        <div className="flex-1 text-left">
                          <span className="block text-sm font-medium text-white">
                            {data.name} ({data.prefix})
                          </span>
                        </div>
                        {code === formData.country && (
                          <div className="p-1.5 rounded-lg bg-blue-500/20">
                            <Check className="h-3.5 w-3.5 text-blue-400" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {errors.phone && (
          <p className="mt-1 text-sm text-red-400">{errors.phone}</p>
        )}
        
      </div>
          <AuthInput
            type="password"
            value={formData.password}
            onChange={handleChange("password")}
            placeholder="מינימום 8 תווים ואות גדולה אחת לפחות"
            icon={<Lock className="h-5 w-5" />}
            label="סיסמה"
            error={errors.password}
          />

          <AuthSubmitButton 
            type="submit"
            disabled={isAuthInProgress || isCheckingAvailability || isNavigating || Object.keys(errors).length > 0}
            loading={isAuthInProgress || isCheckingAvailability || isNavigating}
          >
            {isAuthInProgress ? "מבצע הרשמה..." : isCheckingAvailability ? "בודק זמינות..." : isNavigating ? "מעביר לדשבורד..." : "הרשמה"}
          </AuthSubmitButton>
        </form>

        <AuthLink to="/login">כבר רשומים? לחצו כאן להתחברות</AuthLink>
      </AuthCard>
    </AuthLayout>
  );
}
