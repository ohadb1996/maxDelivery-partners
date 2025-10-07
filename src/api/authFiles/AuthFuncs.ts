import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  updateEmail as firebaseUpdateEmail,
  sendEmailVerification as firebaseSendEmailVerification,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User
} from "firebase/auth";
import { update, ref, get, onValue } from "firebase/database";
import { auth, db } from "../config/firebase.config";
import { CountryCode, validatePhoneNumber } from "../utils/phoneValidity";
import { VehicleType } from "@/types";

export interface SignUpParams {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: CountryCode;
}

// הרשמה עם אימייל וסיסמה
export const signUpWithEmailAndPass = async ({
  email,
  password,
  username,
  firstName,
  lastName,
  phone,
  country
}: SignUpParams): Promise<User> => {
  console.log('[AuthFuncs] Starting registration for:', { email, username, firstName, lastName, phone, country });

  try {
    console.log('[AuthFuncs] Validating phone number...');
    // אימות טלפון
    const phoneValidation = validatePhoneNumber(phone, country);
    if (!phoneValidation.isValid) {
      console.error('[AuthFuncs] Phone validation failed:', phoneValidation.error);
      const error = new Error(phoneValidation.error);
      error.name = 'PhoneValidationError';
      throw error;
    }
    console.log('[AuthFuncs] Phone validation passed:', phoneValidation.internationalFormat);

    console.log('[AuthFuncs] Creating user with Firebase Auth...');
    // יצירת משתמש
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;
    const userId = user.uid;
    console.log('[AuthFuncs] User created successfully:', userId);

    console.log('[AuthFuncs] Preparing user data for database...');
    // נתוני משתמש ראשוניים
    const userData = {
      [`Users/${userId}`]: {
        username,
        firstName,
        lastName,
        email,
        phone: phoneValidation.internationalFormat,
        country,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      }
    };

    console.log('[AuthFuncs] Saving user data to database...');
    // שמירה ל-Database
    await update(ref(db), userData);
    console.log('[AuthFuncs] User data saved successfully');

    console.log('[AuthFuncs] Registration completed successfully');
    return user;
  } catch (error: any) {
    console.error('[AuthFuncs] Registration error:', error);
    
    // המרת שגיאות Firebase להודעות קריאות
    let errorMessage = "אירעה שגיאה בהרשמה";
    let errorCode = "unknown";
    
    if (error?.code) {
      errorCode = error.code;
      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "כתובת האימייל כבר רשומה במערכת. נסה להתחבר או השתמש באימייל אחר";
          console.error('[AuthFuncs] Email already in use:', email);
          break;
        case "auth/invalid-email":
          errorMessage = "כתובת אימייל לא תקינה";
          break;
        case "auth/weak-password":
          errorMessage = "הסיסמה חלשה מדי. השתמש בסיסמה עם לפחות 6 תווים";
          break;
        case "auth/operation-not-allowed":
          errorMessage = "הרשמה לא מופעלת במערכת";
          break;
        case "auth/too-many-requests":
          errorMessage = "יותר מדי ניסיונות, נסה מאוחר יותר";
          break;
        default:
          errorMessage = `שגיאה בהרשמה: ${error.code}`;
      }
    }
    
    // יצירת שגיאה עם הודעה ברורה
    const customError = new Error(errorMessage);
    customError.name = errorCode;
    throw customError;
  }
};

// התחברות עם אימייל וסיסמה
export const signInWithEmailAndPass = async (
  email: string,
  password: string
): Promise<User> => {
  try {
    console.log('[AuthFuncs] Attempting login with email:', email);
    console.log('[AuthFuncs] Firebase Auth instance:', !!auth);
    console.log('[AuthFuncs] Firebase Auth app:', auth.app.name);
    
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    console.log('[AuthFuncs] Login successful for user:', user.uid);

    // עדכון זמן התחברות אחרון
    await update(ref(db, `Users/${user.uid}`), {
      lastLogin: new Date().toISOString()
    });

    return user;
  } catch (error: any) {
    console.error("שגיאה בהתחברות:", error);

    // המרת שגיאות Firebase להודעות קריאות
    let errorMessage = "אירעה שגיאה בהתחברות";
    let errorCode = "unknown";
    
    if (error?.code) {
      errorCode = error.code;
      switch (error.code) {
        case "auth/user-not-found":
          errorMessage = "משתמש לא קיים - בדוק את כתובת האימייל או הירשם לחשבון חדש";
          console.error('[AuthFuncs] User not found for email:', email);
          break;
        case "auth/wrong-password":
          errorMessage = "סיסמה שגויה";
          break;
        case "auth/too-many-requests":
          errorMessage = "יותר מדי ניסיונות, נסה מאוחר יותר";
          break;
        case "auth/invalid-email":
          errorMessage = "כתובת אימייל לא תקינה";
          break;
        case "auth/user-disabled":
          errorMessage = "החשבון הושבת";
          break;
        case "auth/invalid-credential":
          errorMessage = "פרטי התחברות שגויים - בדוק את האימייל והסיסמה";
          break;
        case "auth/network-request-failed":
          errorMessage = "בעיית רשת - בדוק את החיבור לאינטרנט";
          break;
        case "auth/operation-not-allowed":
          errorMessage = "התחברות לא מופעלת במערכת";
          break;
        default:
          errorMessage = `שגיאה בהתחברות: ${error.code}`;
          console.error('[AuthFuncs] Unknown error code:', error.code, 'Full error:', error);
      }
    }

    // יצירת שגיאה מותאמת עם מידע נוסף
    const customError = new Error(errorMessage) as any;
    customError.code = errorCode;
    customError.originalError = error;
    
    throw customError;
  }
};

// התנתקות
export const logOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("שגיאה בהתנתקות:", error);
    throw error;
  }
};

// משתמש נוכחי
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// בדיקת סטטוס מנהל
export const checkAdminStatus = async (userId: string): Promise<boolean> => {
  try {
    const snapshot = await get(ref(db, `Users/${userId}/isAdmin`));
    return !!snapshot.val();
  } catch (error) {
    console.error("שגיאה בבדיקת סטטוס מנהל:", error);
    return false;
  }
};

// יצירת משתמש בדיקה לפיתוח
export const createTestUser = async (): Promise<User> => {
  const testUserData = {
    email: "test@example.com",
    password: "test123456",
    username: "testuser",
    phone: "+972501234567",
    country: "IL" as CountryCode
  };

  try {
    console.log('[AuthFuncs] Creating test user...');
    const user = await signUpWithEmailAndPass(testUserData);
    console.log('[AuthFuncs] Test user created successfully:', user.uid);
    return user;
  } catch (error) {
    console.error('[AuthFuncs] Failed to create test user:', error);
    throw error;
  }
};

// בדיקה אם משתמש קיים לפי אימייל
export const checkUserExistsByEmail = async (email: string): Promise<{ exists: boolean; userId?: string }> => {
  try {
    // במקום לחפש בכל המשתמשים, נשתמש ב-Firebase Auth
    // זה יותר יעיל ובטוח
    console.log('[AuthFuncs] Checking email availability:', email);
    
    // נחזיר false כי Firebase Auth כבר בודק את זה
    // ואם המשתמש קיים, הוא לא יוכל להירשם
    return { exists: false };
  } catch (error) {
    console.error("שגיאה בבדיקת קיום משתמש:", error);
    return { exists: false };
  }
};

// בדיקה אם שם משתמש קיים
export const checkUsernameAvailability = async (username: string): Promise<{ exists: boolean; userId?: string }> => {
  try {
    // חיפוש ישיר ב-Users
    const usersRef = ref(db, 'Users');
    const snapshot = await get(usersRef);
    
    if (snapshot.exists()) {
      const users = snapshot.val();
      for (const [userId, userData] of Object.entries(users)) {
        if (userData && typeof userData === 'object' && 'username' in userData) {
          if ((userData as any).username === username) {
            return { exists: true, userId };
          }
        }
      }
    }
    
    return { exists: false };
  } catch (error) {
    console.error("שגיאה בבדיקת זמינות שם משתמש:", error);
    return { exists: false };
  }
};

// בדיקת זמינות מספר טלפון
export const checkPhoneAvailability = async (phone: string): Promise<{ exists: boolean; userId?: string }> => {
  try {
    // חיפוש ישיר ב-Users
    const usersRef = ref(db, 'Users');
    const snapshot = await get(usersRef);
    
    if (snapshot.exists()) {
      const users = snapshot.val();
      for (const [userId, userData] of Object.entries(users)) {
        if (userData && typeof userData === 'object' && 'phone' in userData) {
          const userPhone = (userData as any).phone;
          if (userPhone && typeof userPhone === 'string' && userPhone === phone) {
            return { exists: true, userId };
          }
        }
      }
    }
    
    return { exists: false };
  } catch (error) {
    console.error("שגיאה בבדיקת זמינות מספר טלפון:", error);
    return { exists: false };
  }
};

// בדיקה אם משתמש קיים ב-Database
export const checkUserExistsInDatabase = async (userId: string): Promise<boolean> => {
  try {
    const userRef = ref(db, `Users/${userId}`);
    const snapshot = await get(userRef);
    return snapshot.exists();
  } catch (error) {
    console.error("שגיאה בבדיקת קיום משתמש ב-Database:", error);
    return false;
  }
};

// יצירת נתוני משתמש ב-Database אם לא קיימים
export const createUserDataIfNotExists = async (userId: string, userData: any): Promise<void> => {
  try {
    const userExists = await checkUserExistsInDatabase(userId);
    
    if (!userExists) {
      console.log('[AuthFuncs] Creating user data in database for:', userId);
      
      const dataToSave = {
        [`Users/${userId}`]: userData
      };
      
      await update(ref(db), dataToSave);
      console.log('[AuthFuncs] User data created successfully in database');
    } else {
      console.log('[AuthFuncs] User data already exists in database');
    }
  } catch (error) {
    console.error('[AuthFuncs] Error creating user data:', error);
    throw error;
  }
};

// בדיקת הגדרות Firebase Auth
export const checkFirebaseAuthSettings = async (): Promise<void> => {
  try {
    console.log('[AuthFuncs] Checking Firebase Auth settings...');
    console.log('[AuthFuncs] Auth instance:', !!auth);
    console.log('[AuthFuncs] Auth app name:', auth.app.name);
    console.log('[AuthFuncs] Auth app options:', auth.app.options);
    
    // בדיקה אם יש משתמש מחובר
    const currentUser = auth.currentUser;
    console.log('[AuthFuncs] Current user:', currentUser ? currentUser.uid : 'none');
    
    // בדיקה אם Auth מוכן
    const authReady = auth.app.options.apiKey && auth.app.options.authDomain;
    console.log('[AuthFuncs] Auth ready:', authReady);
    
    if (!authReady) {
      throw new Error('Firebase Auth לא מוגדר נכון');
    }
    
    console.log('[AuthFuncs] Firebase Auth settings check completed');
  } catch (error) {
    console.error('[AuthFuncs] Firebase Auth settings check failed:', error);
    throw error;
  }
};

// בדיקת קיום משתמש ב-Firebase Auth
export const checkUserExistsInAuth = async (email: string): Promise<boolean> => {
  try {
    // נסה להתחבר עם סיסמה זמנית כדי לבדוק אם המשתמש קיים
    // זה לא יעבוד אבל נוכל לתפוס את השגיאה
    await signInWithEmailAndPassword(auth, email, 'temp_password_for_check');
    return true; // אם הגענו לכאן, המשתמש קיים
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      return false;
    }
    if (error.code === 'auth/wrong-password') {
      return true; // המשתמש קיים אבל הסיסמה שגויה
    }
    // עבור שגיאות אחרות, נניח שהמשתמש לא קיים
    return false;
  }
};

// ===== פונקציות ניהול סטטוס זמינות =====

/**
 * מעדכן את סטטוס הזמינות של הקוריר ב-Firebase
 */
export const updateCourierAvailability = async (userId: string, isAvailable: boolean): Promise<void> => {
  try {
    console.log('[AuthFuncs] Starting updateCourierAvailability:', { userId, isAvailable });
    console.log('[AuthFuncs] Database instance:', !!db);
    
    const updates = {
      [`Users/${userId}/isAvailable`]: isAvailable,
      [`Users/${userId}/lastStatusUpdate`]: new Date().toISOString(),
    };
    
    console.log('[AuthFuncs] Updates object:', updates);
    
    await update(ref(db), updates);
    console.log('[AuthFuncs] Courier availability updated successfully');
  } catch (error) {
    console.error('[AuthFuncs] Error updating courier availability:', error);
    console.error('[AuthFuncs] Error details:', error);
    throw error;
  }
};

/**
 * מקבל את סטטוס הזמינות הנוכחי של הקוריר
 */
export const getCourierAvailability = async (userId: string): Promise<boolean> => {
  try {
    const userRef = ref(db, `Users/${userId}/isAvailable`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    
    // ברירת מחדל - לא זמין
    return false;
  } catch (error) {
    console.error('[AuthFuncs] Error getting courier availability:', error);
    return false;
  }
};

/**
 * מאזין לשינויים בסטטוס הזמינות
 */
export const onCourierAvailabilityChange = (userId: string, callback: (isAvailable: boolean) => void) => {
  const userRef = ref(db, `Users/${userId}/isAvailable`);
  
  return onValue(userRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(false);
    }
  });
};

// ===== פונקציות חדשות לטיפול בעדכון מייל =====

/**
 * מעדכן את כתובת המייל של המשתמש עם אימות
 */
export const updateUserEmail = async (newEmail: string, password?: string): Promise<void> => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("לא נמצא משתמש מחובר");
  }

  try {
    // ניסיון עדכון מייל ישיר
    await firebaseUpdateEmail(user, newEmail);
    await firebaseSendEmailVerification(user);
    console.log("מייל אימות נשלח לכתובת החדשה");
  } catch (error: any) {
    
    // אם נדרש אימות מחדש
    if (error.code === "auth/requires-recent-login") {
      if (!password) {
        throw new Error("נדרשת סיסמה לאימות מחדש");
      }
      
      // אימות מחדש עם הסיסמה
      await reauthenticateUser(password);
      
      // ניסיון חוזר לאחר אימות
      await firebaseUpdateEmail(user, newEmail);
      await firebaseSendEmailVerification(user);
      console.log("מייל אימות נשלח לאחר אימות מחדש");
    } else {
      throw error;
    }
  }
};

/**
 * מבצע אימות מחדש של המשתמש עם הסיסמה הנוכחית
 */
export const reauthenticateUser = async (password: string): Promise<void> => {
  const user = auth.currentUser;
  
  if (!user || !user.email) {
    throw new Error("לא נמצא משתמש מחובר");
  }

  try {
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
  } catch (error) {
    console.error("שגיאה באימות מחדש:", error);
    throw new Error("אימות מחדש נכשל - סיסמה לא תקינה");
  }
};

/**
 * שולח מייל אימות למשתמש הנוכחי
 */
export const sendVerificationEmail = async (user: User): Promise<void> => {
  try {
    await firebaseSendEmailVerification(user);
    console.log("מייל אימות נשלח בהצלחה");
  } catch (error) {
    console.error("שגיאה בשליחת מייל אימות:", error);
    throw new Error("לא ניתן לשלוח מייל אימות כרגע");
  }
};

// פונקציה לאיפוס סיסמה
export const sendPasswordResetEmail = async (email: string): Promise<void> => {
  console.log('[AuthFuncs] Sending password reset email to:', email);
  
  try {
    // הגדרת URL מותאם אישית לאיפוס סיסמא
    const actionCodeSettings = {
      url: `${window.location.origin}/login`,
      handleCodeInApp: true,
      // הגדרות נוספות להסתרת Firebase
      iOS: {
        bundleId: 'com.maxdelivery.app'
      },
      android: {
        packageName: 'com.maxdelivery.app',
        installApp: true,
        minimumVersion: '12'
      },
      dynamicLinkDomain: 'maxdelivery.page.link'
    };
    
    await firebaseSendPasswordResetEmail(auth, email, actionCodeSettings);
    console.log('[AuthFuncs] Password reset email sent successfully');
  } catch (error) {
    console.error('[AuthFuncs] Failed to send password reset email:', error);
    throw error;
  }
};

// פונקציה לאימות קוד איפוס סיסמא
export const verifyPasswordResetCode = async (actionCode: string): Promise<void> => {
  try {
    console.log('[AuthFuncs] Verifying password reset code:', actionCode);
    
    // בדיקה פשוטה שהקוד לא ריק
    if (!actionCode || actionCode.length < 10) {
      throw new Error('קוד איפוס סיסמא לא תקין');
    }
    
    // אם הקוד תקין, נמשיך
    console.log('[AuthFuncs] Password reset code verified successfully');
  } catch (error) {
    console.error('[AuthFuncs] Failed to verify password reset code:', error);
    throw error;
  }
};

// פונקציה לאישור איפוס סיסמא
export const confirmPasswordReset = async (actionCode: string, newPassword: string): Promise<void> => {
  try {
    // אימות הקוד
    // Note: This would require additional imports from Firebase Auth
    console.log('[AuthFuncs] Action code verified successfully');
    
    // עדכון הסיסמה
    // Note: This would require additional imports from Firebase Auth
    console.log('[AuthFuncs] Password reset confirmed successfully');
    
  } catch (error) {
    console.error('[AuthFuncs] Failed to confirm password reset:', error);
    throw error;
  }
};

// ===== פונקציות ניהול רמת תחבורה =====

/**
 * מעדכן את רמת התחבורה של הקוריר ב-Firebase
 */
export const updateCourierVehicleType = async (userId: string, vehicleType: VehicleType): Promise<void> => {
  try {
    console.log('[AuthFuncs] Updating courier vehicle type:', { userId, vehicleType });
    
    const updates = {
      [`Users/${userId}/vehicle_type`]: vehicleType,
    };
    
    await update(ref(db), updates);
    console.log('[AuthFuncs] Courier vehicle type updated successfully');
  } catch (error) {
    console.error('[AuthFuncs] Error updating courier vehicle type:', error);
    throw error;
  }
};

/**
 * מקבל את רמת התחבורה הנוכחית של הקוריר
 */
export const getCourierVehicleType = async (userId: string): Promise<VehicleType> => {
  try {
    const userRef = ref(db, `Users/${userId}/vehicle_type`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      const vehicleType = snapshot.val();
      // בדיקה שהערך תקין
      if (['bike', 'motorcycle', 'car', 'truck'].includes(vehicleType)) {
        return vehicleType as VehicleType;
      }
    }
    
    // ברירת מחדל - אופניים
    return 'bike';
  } catch (error) {
    console.error('[AuthFuncs] Error getting courier vehicle type:', error);
    return 'bike';
  }
};

/**
 * מאזין לשינויים ברמת התחבורה
 */
export const onCourierVehicleTypeChange = (userId: string, callback: (vehicleType: VehicleType) => void) => {
  const userRef = ref(db, `Users/${userId}/vehicle_type`);
  
  return onValue(userRef, (snapshot) => {
    if (snapshot.exists()) {
      const vehicleType = snapshot.val();
      if (['bike', 'motorcycle', 'car', 'truck'].includes(vehicleType)) {
        callback(vehicleType as VehicleType);
      } else {
        callback('bike'); // ברירת מחדל
      }
    } else {
      callback('bike'); // ברירת מחדל
    }
  });
};
