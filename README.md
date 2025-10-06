# MaxDelivery Partner App

אפליקציית ניהול עבור שותפי משלוחים של MaxDelivery.

## תכונות

- 📱 ממשק משתמש מודרני ומותאם למובייל
- 🚚 ניהול משלוחים פעילים
- 📊 לוח בקרה עם סטטיסטיקות
- 📋 היסטוריית משלוחים
- 👤 ניהול פרופיל אישי
- 🗺️ ניווט מובנה למפות

## טכנולוגיות

- **React 18** - ספריית UI מודרנית
- **TypeScript** - תמיכה בטיפוסים
- **Vite** - כלי בנייה מהיר
- **Tailwind CSS** - עיצוב מודרני
- **React Router** - ניווט בין דפים
- **Framer Motion** - אנימציות חלקות
- **Lucide React** - אייקונים מודרניים

## מבנה הפרוייקט

```
src/
├── components/          # רכיבים משותפים
│   ├── ui/             # רכיבי UI בסיסיים
│   ├── courier/        # רכיבים ספציפיים לקוריר
│   └── layout/         # רכיבי פריסה
├── pages/              # דפי האפליקציה
├── types/              # הגדרות טיפוסים
├── hooks/              # hooks מותאמים אישית
├── services/           # שירותי API
├── utils/               # פונקציות עזר
└── lib/                 # ספריות חיצוניות
```

## התקנה והפעלה

1. **התקנת dependencies:**
   ```bash
   npm install
   ```

2. **הפעלת שרת הפיתוח:**
   ```bash
   npm run dev
   ```

3. **בניית הפרוייקט:**
   ```bash
   npm run build
   ```

4. **תצוגה מקדימה:**
   ```bash
   npm run preview
   ```

## דפים עיקריים

- **Dashboard** (`/`) - לוח בקרה עם הזמנות זמינות
- **Active Job** (`/active`) - ניהול משלוח פעיל
- **History** (`/history`) - היסטוריית משלוחים
- **Profile** (`/profile`) - ניהול פרופיל אישי
- **Job Details** (`/job/:id`) - פרטי הזמנה

## רכיבים עיקריים

### Layout
- Header עם מידע על הקוריר
- ניווט תחתון עם 4 דפים עיקריים
- תצוגת סטטוס זמינות

### JobCard
- כרטיס הזמנה עם פרטים בסיסיים
- מיקומי איסוף ומשלוח
- מחיר וזמן משוער

### AvailabilityToggle
- מתג זמינות/לא זמין
- עיצוב מודרני עם אנימציות

### StatusTimeline
- ציר זמן התקדמות המשלוח
- סטטוסים: Accepted → Picked Up → Delivered

## API Integration

האפליקציה מוכנה לאינטגרציה עם API אמיתי. כרגע משתמשת בנתונים מדומים.

### Endpoints נדרשים:
- `GET /user/me` - מידע על המשתמש
- `GET /courier/profile` - פרופיל הקוריר
- `GET /deliveries/available` - הזמנות זמינות
- `GET /deliveries/active` - משלוח פעיל
- `GET /deliveries/history` - היסטוריית משלוחים
- `POST /deliveries/:id/accept` - קבלת הזמנה
- `PUT /deliveries/:id/status` - עדכון סטטוס

## עיצוב

האפליקציה משתמשת ב-Tailwind CSS עם עיצוב מודרני:
- צבעים: כחול (#3B82F6) כצבע ראשי
- פונטים: Inter (ברירת מחדל)
- רכיבים: עיצוב Material Design מודרני
- אנימציות: Framer Motion לחלקות

## פיתוח עתידי

- [ ] אינטגרציה עם Firebase
- [ ] Push notifications
- [ ] מפות מובנות
- [ ] תמיכה במספר שפות
- [ ] מצב כהה
- [ ] PWA support
