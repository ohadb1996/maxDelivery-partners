# בדיקת הגדרות Firebase Auth

## מה שמצאתי:

### 1. ✅ משתמש קיים ב-Firebase Auth
- **Email:** ohadb1996@gmail.com
- **UID:** KH5uCdqpDzLodWaVqIfY1ONg4w32
- **Email Verified:** false
- **Created:** 1759778674315

### 2. 🔍 סיבות אפשריות לשגיאת 400:

#### A. בעיית Domain Authorization
- Firebase Auth דורש שה-Domain יהיה מורשה
- צריך להוסיף `localhost:5173` ל-Authorized domains

#### B. בעיית Email Verification
- המשתמש לא אימת את האימייל
- Firebase Auth יכול לדרוש אימות לפני התחברות

#### C. בעיית API Key
- ה-API key לא מופעל או לא נכון
- צריך לבדוק ב-Google Cloud Console

#### D. בעיית CORS
- בעיות רשת או חסימות

## 🔧 פתרונות מומלצים:

### פתרון 1: בדיקת Domain Authorization
1. לך ל-Firebase Console
2. Authentication > Settings > Authorized domains
3. ודא ש-localhost:5173 קיים
4. אם לא, הוסף אותו

### פתרון 2: בדיקת Email Verification
1. בדוק אם המשתמש צריך לאמת את האימייל
2. אם כן, שלח אימייל אימות

### פתרון 3: בדיקת API Key
1. לך ל-Google Cloud Console
2. בחר בפרויקט maxdeliveries
3. APIs & Services > Credentials
4. בדוק שה-API key מופעל

### פתרון 4: בדיקת הגדרות Authentication
1. Firebase Console > Authentication > Sign-in method
2. ודא ש-Email/Password מופעל
3. בדוק את ההגדרות

## 🧪 בדיקות מומלצות:

1. **נסה עם אימייל אחר** - בדוק אם הבעיה כללית
2. **נסה עם סיסמה אחרת** - בדוק אם הסיסמה נכונה
3. **בדוק את Network tab** - חפש פרטים נוספים על השגיאה
4. **נסה ב-Incognito** - בדוק אם יש בעיות cache

## 📋 רשימת בדיקות:

- [ ] Domain מורשה ב-Firebase Console
- [ ] Email/Password מופעל
- [ ] API key מופעל
- [ ] אין בעיות CORS
- [ ] הסיסמה נכונה
- [ ] האימייל נכון
