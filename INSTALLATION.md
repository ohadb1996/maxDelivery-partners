# הוראות התקנה והפעלה - MaxDelivery Partner App

## שלב 1: התקנת Dependencies

פתח את ה-Terminal בתיקיית הפרוייקט והרץ:

```bash
cd /d C:\Users\comp\SXPOfficial\maxDelivery\maxDelivery-app
npm install
```

אם יש בעיה עם ההתקנה, נסה:

```bash
npm install --legacy-peer-deps
```

## שלב 2: הפעלת שרת הפיתוח

לאחר ההתקנה, הרץ:

```bash
npm run dev
```

השרת יעלה בכתובת: http://localhost:5173

## שלב 3: בניית הפרוייקט לפרודקשן

```bash
npm run build
```

## מבנה הפרוייקט

```
maxDelivery-app/
├── src/
│   ├── components/
│   │   ├── ui/                    # רכיבי UI בסיסיים
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   └── alert.tsx
│   │   ├── courier/               # רכיבים ספציפיים לקוריר
│   │   │   ├── JobCard.tsx
│   │   │   ├── AvailabilityToggle.tsx
│   │   │   └── StatusTimeline.tsx
│   │   └── layout/
│   │       └── Layout.tsx
│   ├── pages/                     # דפי האפליקציה
│   │   ├── Dashboard.tsx          # לוח בקרה ראשי
│   │   ├── ActiveJob.tsx          # משלוח פעיל
│   │   ├── History.tsx            # היסטוריית משלוחים
│   │   ├── Profile.tsx            # פרופיל משתמש
│   │   └── JobDetails.tsx         # פרטי משלוח
│   ├── types/
│   │   └── index.ts               # הגדרות טיפוסים
│   ├── utils/
│   │   └── config.ts              # קונפיגורציה
│   ├── lib/
│   │   └── utils.ts               # פונקציות עזר
│   ├── App.tsx                    # רכיב ראשי
│   ├── main.tsx                   # נקודת כניסה
│   └── index.css                  # סגנונות גלובליים
├── public/                        # קבצים סטטיים
├── index.html                     # HTML ראשי
├── package.json                   # Dependencies
├── tsconfig.json                  # הגדרות TypeScript
├── vite.config.ts                 # הגדרות Vite
├── tailwind.config.js             # הגדרות Tailwind CSS
├── postcss.config.js              # הגדרות PostCSS
└── README.md                      # תיעוד

```

## תכונות עיקריות

### 1. Dashboard (/)
- הצגת הזמנות זמינות
- מתג זמינות online/offline
- כרטיסי הזמנות אינטראקטיביים
- רענון אוטומטי כל 30 שניות

### 2. Active Job (/active)
- ניהול משלוח פעיל
- ציר זמן התקדמות
- ניווט למיקומי איסוף ומשלוח
- כפתורים לעדכון סטטוס

### 3. History (/history)
- היסטוריית משלוחים שהושלמו
- סינון ומיון
- סטטיסטיקות משלוחים

### 4. Profile (/profile)
- מידע אישי
- סטטיסטיקות קוריר
- דירוג וביצועים
- התנתקות

### 5. Job Details (/job/:id)
- פרטי הזמנה מלאים
- מיקומי איסוף ומשלוח
- כפתור קבלת הזמנה

## טכנולוגיות

- **React 18** - ספריית UI
- **TypeScript** - תמיכה בטיפוסים
- **Vite** - כלי בנייה מהיר
- **Tailwind CSS** - CSS framework
- **React Router** - ניהול נתיבים
- **Framer Motion** - אנימציות
- **Lucide React** - אייקונים

## הערות חשובות

1. **נתונים מדומים**: כרגע האפליקציה משתמשת בנתונים מדומים. יש להחליף אותם בקריאות API אמיתיות.

2. **Authentication**: יש להוסיף מערכת אימות (Firebase Auth או אחר).

3. **API Integration**: יש להגדיר את ה-API endpoints בקובץ `src/utils/config.ts`.

4. **Environment Variables**: צור קובץ `.env` בשורש הפרוייקט עם המשתנים הנדרשים:
   ```
   VITE_API_BASE_URL=http://your-api-url
   ```

## פיתוח עתידי

- [ ] אינטגרציה עם Firebase/API אמיתי
- [ ] מערכת Push Notifications
- [ ] מפות מובנות (Google Maps)
- [ ] תמיכה בעברית ושפות נוספות
- [ ] מצב כהה (Dark Mode)
- [ ] PWA Support

## תמיכה ועזרה

אם יש בעיות, בדוק:
1. גרסת Node.js (מומלץ 18+)
2. התקנת Dependencies מלאה
3. לוגים בקונסול

## License

MIT
