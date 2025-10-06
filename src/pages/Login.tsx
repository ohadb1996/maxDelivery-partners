import React, { useState, useEffect } from 'react';
import { Lock, User, AlertCircle, Mail } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AuthCard } from '../components/auth/AuthCard';
import { AuthInput } from '../components/auth/AuthInput';
import { AuthSubmitButton } from '../components/auth/AuthSubmitButton';
import { AuthLink } from '../components/auth/AuthLink';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { createTestUser, checkUserExistsInAuth, sendPasswordResetEmail } from '../api/authFiles/AuthFuncs';

export default function LoginPage() {
  const { login, isAuthInProgress, user, isLoading, clearAuthInProgress } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loginError, setLoginError] = useState('');
  const [isPasswordResetSent, setIsPasswordResetSent] = useState(false);
  const [isPasswordResetLoading, setIsPasswordResetLoading] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!formData.email) newErrors.email = 'נדרש אימייל';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'אימייל לא תקין';
    }
    if (!formData.password) newErrors.password = 'נדרשת סיסמה';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    // מניעת redirect loop - רק אם המשתמש באמת מחובר ויש לו username
    if (user && user.username && !isAuthInProgress && !isLoading) {
      // בדיקה נוספת שהמשתמש באמת מחובר
      if (user.emailVerified !== false) { // אם email לא מאומת, זה עדיין תקין
        console.log('[LoginPage] Redirecting to dashboard for user:', user.username);
        navigate('/');
      }
    }
  }, [user, navigate, isAuthInProgress, isLoading, clearAuthInProgress]);

  // Additional redirect check for when user becomes available
  useEffect(() => {
    if (user && user.uid) {
      console.log('[LoginPage] User detected, redirecting immediately...');
      // Use setTimeout to ensure the redirect happens after the current render cycle
      setTimeout(() => {
        navigate('/');
      }, 100);
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // מניעת לחיצות מרובות - בדיקה מחמירה יותר
    if (isLoginLoading || isAuthInProgress || isLoading) {
      console.log('[LoginPage] Blocking submit - already in progress:', { isLoginLoading, isAuthInProgress, isLoading });
      return;
    }
    
    setLoginError('');

    if (!validateForm()) return;

    console.log('[LoginPage] Starting login process...');
    setIsLoginLoading(true);

    try {
      // בדיקת הגדרות Firebase Auth
      const { checkFirebaseAuthSettings } = await import('../api/authFiles/AuthFuncs');
      await checkFirebaseAuthSettings();
      
      console.log('[LoginPage] Starting login process...');
      const result = await login(formData.email, formData.password);
      
      // Check if login was successful
      if (!result) {
        // Login failed but no exception was thrown - this means authentication failed
        setLoginError('אימייל או סיסמה לא נכונים');
        return;
      }
      
      // ניווט יתבצע אוטומטית ב-useEffect רק אם ההתחברות הצליחה
      console.log('[LoginPage] Login successful, waiting for redirect...');
      
      // התחברות הצליחה - הניווט יתבצע ב-useEffect
      // לא מנקים את isAuthInProgress כדי לא להפריע לזיהוי הבעלים
      
    } catch (error: any) {
      // This should rarely happen now since we handle errors gracefully in AuthContext
      console.error('[LoginPage] Unexpected error during login:', error);
      setLoginError('אירעה שגיאה בהתחברות. אנא נסה שוב.');
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleCreateTestUser = async () => {
    try {
      setLoginError('');
      await createTestUser();
      setLoginError('משתמש בדיקה נוצר בהצלחה! התחבר עם test@example.com / test123456');
    } catch (error: any) {
      setLoginError('שגיאה ביצירת משתמש בדיקה: ' + error.message);
    }
  };

  const handlePasswordReset = async () => {
    if (!formData.email.trim()) {
      setLoginError('אנא הכנס את כתובת האימייל שלך לאיפוס סיסמה');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setLoginError('אנא הכנס כתובת אימייל תקינה');
      return;
    }

    setIsPasswordResetLoading(true);
    setLoginError('');

    try {
      // בדיקה אם המשתמש קיים
      const userExists = await checkUserExistsInAuth(formData.email);
      
      if (!userExists) {
        setLoginError('כתובת האימייל לא קיימת במערכת');
        return;
      }

      // שליחת מייל לאיפוס סיסמה
      await sendPasswordResetEmail(formData.email);
      
      setIsPasswordResetSent(true);
      setLoginError('');
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      if (error.code === 'auth/user-not-found') {
        setLoginError('כתובת האימייל לא קיימת במערכת');
      } else if (error.code === 'auth/too-many-requests') {
        setLoginError('יותר מדי בקשות לאיפוס סיסמה. נסה שוב מאוחר יותר');
      } else if (error.code === 'auth/invalid-email') {
        setLoginError('כתובת אימייל לא תקינה');
      } else {
        setLoginError('שגיאה בשליחת מייל לאיפוס סיסמה. נסה שוב');
      }
    } finally {
      setIsPasswordResetLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard>
        <h3 className="text-2xl font-bold mb-6 text-center">התחברות</h3>
        
        {isLoading && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3 text-blue-400">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
            <p>בודק אם יש התחברות קיימת...</p>
          </div>
        )}

        {loginError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{loginError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <AuthInput
            type="email"
            value={formData.email}
            onChange={(e) => {
              setFormData({...formData, email: e.target.value});
              if (errors.email) setErrors({...errors, email: undefined});
              setLoginError('');
              setIsPasswordResetSent(false);
            }}
            placeholder="הכנס אימייל"
            icon={<User className="h-5 w-5" />}
            label="אימייל"
            error={errors.email}
          />

          <AuthInput
            type="password"
            value={formData.password}
            onChange={(e) => {
              setFormData({...formData, password: e.target.value});
              if (errors.password) setErrors({...errors, password: undefined});
              setLoginError('');
            }}
            placeholder="הכנס סיסמה"
            icon={<Lock className="h-5 w-5" />}
            label="סיסמה"
            error={errors.password}
          />

          {/* כפתור שכחתי סיסמא */}
          <div className="text-center">
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={isPasswordResetLoading || !formData.email.trim()}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isPasswordResetLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                שולח מייל לאיפוס סיסמא...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2 hover:gap-3 transition-all duration-200">
                  <Mail className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                  שכחת סיסמא? לחץ כאן לאיפוס לפי המייל שהזנת
                </span>
              )}
            </button>
          </div>

          {/* הודעת אישור שליחת מייל לאיפוס סיסמה */}
          {isPasswordResetSent && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-400">
              <Mail className="h-5 w-5 flex-shrink-0" />
              <p>נשלח מייל לאיפוס סיסמה לכתובת {formData.email}</p>
            </div>
          )}

          <AuthSubmitButton
            type="submit"
            disabled={isAuthInProgress || isLoginLoading || isLoading}
            loading={isAuthInProgress || isLoginLoading || isLoading}
          >
            {isLoading ? 'בודק התחברות קיימת...' : isAuthInProgress || isLoginLoading ? 'מתחבר...' : 'התחברות'}
          </AuthSubmitButton>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handlePasswordReset}
            disabled={isPasswordResetLoading || isAuthInProgress || isLoginLoading || isLoading}
            className="text-blue-400 hover:text-blue-300 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPasswordResetLoading ? 'שולח מייל...' : 'שכחת סיסמה?'}
          </button>
        </div>

        <div className="mt-4 text-center">
          <AuthLink to="/register">
            אין לך חשבון? הירשם כאן
          </AuthLink>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
