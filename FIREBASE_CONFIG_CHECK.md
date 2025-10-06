# Firebase Configuration Check

## בדיקת הגדרות Firebase

### 1. בדיקת הגדרות Authentication
```bash
# בדוק אם Email/Password מופעל
firebase auth:export users.json --project maxdeliveries
```

### 2. בדיקת הגדרות Database
```bash
# בדוק את כללי Database
firebase database:get / --project maxdeliveries
```

### 3. בדיקת הגדרות Project
```bash
# בדוק הגדרות פרויקט
firebase projects:list
```

## הגדרות נדרשות ב-Firebase Console:

### Authentication Settings:
1. **Sign-in method**: Email/Password ✅
2. **Authorized domains**: 
   - localhost:5173 (לפיתוח)
   - your-domain.com (לפרודקשן)
3. **User management**: Enabled

### Database Settings:
1. **Rules**: פרוסו מהקובץ `database.rules.json`
2. **Location**: europe-west1
3. **Security**: Rules-based

### Project Settings:
1. **Project ID**: maxdeliveries
2. **Web App**: מוגדר עם API keys נכונים
3. **Billing**: מופעל (אם נדרש)

## פתרון שגיאת 400:

### אפשרות 1: בעיית Domain
- ודא ש-localhost:5173 מורשה ב-Authorized domains
- הוסף את הדומיין ל-Firebase Console > Authentication > Settings

### אפשרות 2: בעיית API Key
- בדוק שה-API key נכון ב-firebaseConfig.json
- ודא שה-API key מופעל ב-Google Cloud Console

### אפשרות 3: בעיית CORS
- Firebase Auth לא דורש הגדרות CORS מיוחדות
- אבל ודא שאין חסימות ברשת

## בדיקות נוספות:

1. **Network Tab**: בדוק את הבקשות ל-Firebase
2. **Console Logs**: חפש שגיאות נוספות
3. **Firebase Console**: בדוק את ה-Logs ב-Firebase Console

## אם עדיין יש בעיות:

1. נסה ליצור משתמש חדש ב-Firebase Console
2. בדוק אם יש הגבלות על הפרויקט
3. ודא שהפרויקט לא מושבת
4. בדוק את הגדרות Billing אם יש הגבלות
