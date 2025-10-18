import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  getAuth,
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { getDatabase, ref, get } from 'firebase/database';
import { app } from '../api/config/firebase.config';
import { 
  signInWithEmailAndPass, 
  signUpWithEmailAndPass, 
  SignUpParams,
  updateUserEmail,
  sendVerificationEmail,
  getCourierVehicleType
} from '../api/authFiles/AuthFuncs';
import { VehicleType } from '@/types';

// Types
interface AuthUser extends User {
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  country?: string;
  createdAt?: string;
  lastLogin?: string;
  isAvailable?: boolean;
  lastStatusUpdate?: string;
  vehicle_type?: VehicleType;
}

interface AuthContextType {
  // User state
  user: AuthUser | null;
  isLoading: boolean;
  isAuthInProgress: boolean;
  
  // Auth methods
  login: (email: string, password: string) => Promise<AuthUser | null>;
  register: (params: SignUpParams) => Promise<void>;
  logout: () => Promise<void>;
  
  // User data methods
  refreshUserData: () => Promise<void>;
  updateEmail: (newEmail: string, password?: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  
  // Availability methods
  updateAvailability: (isAvailable: boolean) => Promise<void>;
  
  // Vehicle type methods
  updateVehicleType: (vehicleType: VehicleType) => Promise<void>;
  
  // Navigation helpers
  clearAuthInProgress: () => void;
}

// Create Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider Props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth Provider Component
export function AuthProvider({ children }: AuthProviderProps) {
  //console.log('[AuthProvider] Initializing AuthProvider');
  
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthInProgress, setIsAuthInProgress] = useState(false);

  // Initialize auth listener
  useEffect(() => {
    const auth = getAuth(app);
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
         console.log('[AuthContext] Auth state changed:', firebaseUser ? `User: ${firebaseUser.uid}` : 'No user');
        
      if (firebaseUser) {
        try {
          console.log('[AuthContext] Loading user data for:', firebaseUser.uid);
          await loadUserData(firebaseUser);
          console.log('[AuthContext] User data loaded successfully in auth listener');
        } catch (error) {
          console.error('[AuthContext] Failed to load user data:', error);
          setUser(null);
        }
      } else {
        console.log('[AuthContext] No user, setting user to null');
        setUser(null);
      }
      
      console.log('[AuthContext] Setting isLoading to false');
      setIsLoading(false);
      
    });

    return () => unsubscribe();
  }, []);

  // Load user data from database
  const loadUserData = async (firebaseUser: User, retryCount = 0) => {
    console.log('[AuthContext] loadUserData: starting for user:', firebaseUser.uid, 'retry:', retryCount);
    
    // עבור משתמש חדש (הרשמה), תמיד נטען את הנתונים
    // רק עבור משתמש קיים (התחברות), נבדוק אם כבר יש לנו את המידע
    if (user && user.uid === firebaseUser.uid && user.username && !isAuthInProgress) {
      console.log('[AuthContext] User data already loaded, skipping...');
      return;
    }
    
    try {
      const db = getDatabase(app);
      //console.log('[AuthContext] Database instance created:', !!db);
      
      const userRef = ref(db, `Couriers/${firebaseUser.uid}`);
  
      //console.log('[AuthContext] About to fetch user data...');
      const snapshot = await get(userRef);
      //console.log('[AuthContext] Snapshot received:', snapshot.exists() ? 'exists' : 'not exists');
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        console.log('[AuthContext] ✅ Courier data found:', userData);
        
        // טעינת רמת התחבורה
        let vehicleType: VehicleType = 'bike'; // ברירת מחדל
        try {
          vehicleType = await getCourierVehicleType(firebaseUser.uid);
        } catch (error) {
          console.log('[AuthContext] Using default vehicle type:', error);
        }
        
        const authUser = {
          ...firebaseUser,
          username: userData.username,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone,
          address: userData.address,
          country: userData.country,
          createdAt: userData.createdAt,
          lastLogin: userData.lastLogin,
          isAvailable: userData.isAvailable || false,
          lastStatusUpdate: userData.lastStatusUpdate,
          vehicle_type: vehicleType
        };
        console.log('[AuthContext] Setting user with username:', authUser.username, 'vehicle_type:', authUser.vehicle_type);
        setUser(authUser);
      } else {
        // 🚨 פרצת אבטחה: משתמש לא קיים ב-Couriers!
        console.error('🚨 [AuthContext] SECURITY: User not found in Couriers database!');
        console.error('🚨 [AuthContext] This user may be a Business user trying to access the Courier app');
        console.error('🚨 [AuthContext] Logging out and blocking access...');
        
        // אם זה משתמש חדש ואין עדיין נתונים, נסה שוב אחרי עיכוב
        if (retryCount < 3) {
          console.log('[AuthContext] Retrying loadUserData in 1 second...');
          setTimeout(() => {
            loadUserData(firebaseUser, retryCount + 1);
          }, 1000);
          return;
        }
        
        // אחרי 3 נסיונות - חסום גישה!
        console.error('🚨 [AuthContext] BLOCKING ACCESS: User does not exist in Couriers database');
        alert('שגיאת הרשאות: חשבון זה לא רשום כשליח.\n\nאנא השתמש באפליקציית בעלי העסקים או הירשם מחדש כשליח.');
        
        // התנתק מיד
        const auth = getAuth(app);
        await auth.signOut();
        setUser(null);
        return;
        
        // 🚫 הקוד הישן הוסר - לא יוצרים נתונים אוטומטית!
        console.log('[AuthContext] OLD CODE - Creating basic user data for existing Firebase user');
        try {
              const basicUserData = {
                username: firebaseUser.email?.split('@')[0] || 'user',
                firstName: 'משתמש',
                lastName: 'חדש',
                email: firebaseUser.email || '',
                phone: firebaseUser.phoneNumber || '',
                country: 'IL',
                createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                isAvailable: false,
                lastStatusUpdate: new Date().toISOString()
              };
          
          // נסה ליצור את הנתונים ב-Database
          const { createUserDataIfNotExists } = await import('../api/authFiles/AuthFuncs');
          await createUserDataIfNotExists(firebaseUser.uid, basicUserData);
          
          // נסה לטעון שוב
          const retrySnapshot = await get(userRef);
          if (retrySnapshot.exists()) {
            const userData = retrySnapshot.val();
            const authUser = {
              ...firebaseUser,
              username: userData.username,
              firstName: userData.firstName,
              lastName: userData.lastName,
              phone: userData.phone,
              address: userData.address,
              country: userData.country,
              createdAt: userData.createdAt,
              lastLogin: userData.lastLogin,
              isAvailable: userData.isAvailable || false,
              lastStatusUpdate: userData.lastStatusUpdate
            };
            setUser(authUser);
            return;
          }
        } catch (createError) {
          console.error('[AuthContext] Error creating basic user data:', createError);
        }
        
        // אם הכל נכשל, השתמש בנתוני Firebase בלבד
        setUser(firebaseUser);
      }
    } catch (error) {
      console.error('[AuthContext] Error loading user data:', error);
      if (error instanceof Error) {
        console.error('[AuthContext] Error details:', error.message, error.stack);
      }
      setUser(firebaseUser);
    }
  };

  // Login function
  const login = async (email: string, password: string): Promise<AuthUser | null> => {
    setIsAuthInProgress(true);
    try {
      console.log('[AuthContext] Starting login for email:', email);
      const user = await signInWithEmailAndPass(email, password);
      console.log('[AuthContext] Login successful, loading user data...');
      
      // רק אם ההתחברות הצליחה, נטען את המידע
      if (user) {
        await loadUserData(user as User);
        console.log('[AuthContext] User data loaded successfully');
        // האפס את isAuthInProgress רק אחרי שהכל הצליח
        setIsAuthInProgress(false);
        return user as AuthUser;
      } else {
        console.error('[AuthContext] Login failed - no user returned');
        setIsAuthInProgress(false);
        return null;
      }
    } catch (error) {
      console.error('[AuthContext] Login error:', error);
      
      // Handle all authentication errors gracefully without throwing
      if (error instanceof Error) {
        const errorCode = (error as any).code;
        
        // Log specific error types for debugging
        switch (errorCode) {
          case 'auth/user-not-found':
            console.error('[AuthContext] User not found - this could mean the user was never registered or the email is incorrect');
            break;
          case 'auth/wrong-password':
            console.error('[AuthContext] Wrong password provided for user:', email);
            break;
          case 'auth/too-many-requests':
            console.error('[AuthContext] Too many failed login attempts');
            break;
          case 'auth/user-disabled':
            console.error('[AuthContext] User account has been disabled');
            break;
          case 'auth/invalid-email':
            console.error('[AuthContext] Invalid email format provided');
            break;
          default:
            console.error('[AuthContext] Unhandled authentication error:', errorCode, error.message);
        }
      }
      
      // Always return null for failed login instead of throwing
      // This allows the UI to handle the error gracefully
      setIsAuthInProgress(false);
      return null;
    }
    // הסרנו את finally - עכשיו מאפסים את isAuthInProgress רק במקומות הנכונים
  };

  // Register function
  const register = async (params: SignUpParams): Promise<void> => {
    setIsAuthInProgress(true);
    try {
      console.log('[AuthContext] Starting registration...');
      const firebaseUser = await signUpWithEmailAndPass(params);
      console.log('[AuthContext] Registration successful, user created:', firebaseUser.uid);
      
      // אל תטען את הנתונים מיד - תן ל-onAuthStateChanged לעשות את זה
      // כי הנתונים עדיין לא נשמרו בדטבייס בזמן הזה
      console.log('[AuthContext] Waiting for onAuthStateChanged to load user data...');
      
      // ה-cache יתנקה אוטומטית כשהמשתמש החדש יטען
      console.log('[AuthContext] New user registered successfully');
      
      // שמירת isAuthInProgress כ-true עד שהניווט יתחיל בפועל
      // זה ימנע מהמשתמש ללחוץ שוב על הרשמה
    } catch (error) {
      console.error('[AuthContext] Registration error:', error);
      setIsAuthInProgress(false);
      throw error;
    }
    // לא מאפסים את isAuthInProgress כאן - זה יקרה רק כשהניווט יתחיל
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      const auth = getAuth(app);
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Refresh user data
  const refreshUserData = async (): Promise<void> => {
    if (!user) return;
    
    try {
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (currentUser) {
        await loadUserData(currentUser);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
      throw error;
    }
  };

  // Update email
  const updateEmail = async (newEmail: string, password?: string): Promise<void> => {
    if (!user) throw new Error('No user logged in');
    
    try {
      await updateUserEmail(newEmail, password);
      await refreshUserData();
    } catch (error) {
      console.error('Error updating email:', error);
      throw error;
    }
  };

  // Send verification email
  const sendVerificationEmailToUser = async (): Promise<void> => {
    if (!user) throw new Error('No user logged in');
    
    try {
      // Convert AuthUser back to Firebase User for the API call
      const firebaseUser = user as any;
      await sendVerificationEmail(firebaseUser);
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw error;
    }
  };

  // Update availability status
  const updateAvailability = async (isAvailable: boolean): Promise<void> => {
    if (!user) throw new Error('No user logged in');
    
    try {
      const { updateCourierAvailability } = await import('../api/authFiles/AuthFuncs');
      await updateCourierAvailability(user.uid, isAvailable);
      
      // Update local user state
      setUser(prev => prev ? { ...prev, isAvailable, lastStatusUpdate: new Date().toISOString() } : null);
      
      console.log('[AuthContext] Availability updated:', isAvailable);
    } catch (error) {
      console.error('Error updating availability:', error);
      throw error;
    }
  };

  // Update vehicle type
  const updateVehicleType = async (vehicleType: VehicleType): Promise<void> => {
    if (!user) throw new Error('No user logged in');
    
    try {
      const { updateCourierVehicleType } = await import('../api/authFiles/AuthFuncs');
      await updateCourierVehicleType(user.uid, vehicleType);
      
      // Update local user state
      setUser(prev => prev ? { ...prev, vehicle_type: vehicleType } : null);
      
      console.log('[AuthContext] Vehicle type updated:', vehicleType);
    } catch (error) {
      console.error('Error updating vehicle type:', error);
      throw error;
    }
  };

  // Clear auth in progress (for navigation handling)
  const clearAuthInProgress = (): void => {
    console.log('[AuthContext] Clearing auth in progress state');
    setIsAuthInProgress(false);
  };

  // Context value
  const contextValue: AuthContextType = {
    // State
    user,
    isLoading,
    isAuthInProgress,
    
    // Auth methods
    login,
    register,
    logout,
    
    // User data methods
    refreshUserData,
    updateEmail,
    sendVerificationEmail: sendVerificationEmailToUser,
    
    // Availability methods
    updateAvailability,
    
    // Vehicle type methods
    updateVehicleType,
    
    // Navigation helpers
    clearAuthInProgress,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// HOC for components that require authentication
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function AuthenticatedComponent(props: P) {
    const { user, isLoading } = useAuth();
    
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#020817]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-white/70">טוען...</p>
          </div>
        </div>
      );
    }
    
    if (!user) {
      return (
        <div className="relative min-h-screen">
          <div className="relative z-10 min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-4">נדרשת התחברות</h2>
              <p className="text-white/70">אנא התחבר כדי לגשת לעמוד זה</p>
            </div>
          </div>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
}
