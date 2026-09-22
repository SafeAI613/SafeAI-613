# מבנה הניתוב החדש של הקליינט (Client Routing Structure)

## סקירה כללית

המערכת עברה ממבנה ניתוב פשוט למבנה מודרני עם אימות מלא, הפרדה בין דפים ציבוריים ומוגנים, וזרימת משתמש משופרת.

## דפים עיקריים

### 1. **LandingPageV2** (`/`)
- **תיאור**: דף הבית הראשי של האתר (SCRUM-227), מסתעף לשני דפי בית פנימיים
- **גישה**: ציבורי
- **תכונות**:
  - דרופדאון "המוצרים שלנו", חיפוש, וסטטיסטיקות ציבוריות חיות (`/public-stats`)
  - שני באנרים שמובילים לענפי התוכן: **SafeAI Hub** ו-**SafeAI Platform** — ראו סעיף "דפי בית פנימיים" למטה
  - כפתורי התחברות והרשמה בניווט
- **הערה**: הדף הישן `LandingPage` (`pages/LandingPage.tsx`) הוסר מהניתוב הראשי; הנתיב `/landing-preview` (שבו LandingPageV2 שירת בעבר כתצוגה מקדימה בלבד) הפך להפניה (`redirect`) ל-`/`

### 1א. דפי בית פנימיים (SCRUM-228 / SCRUM-229)

| נתיב | קומפוננטה | גישה | תוכן |
|---|---|---|---|
| `/safeai-hub` | `SafeAIHubHomePage` | ProtectedRoute | פורום/קורסים/מדריכים/פרויקטים/חדשות |
| `/safeai-platform` | `SafeAIPlatformHomePage` | ProtectedRoute | תיעוד/מפתחות API/אזור אישי/יצירת קשר |

שני הענפים מיועדים **לאותו קהל משתמשים** — זו הפרדה חזותית/תוכנית בלבד בין שני תחומי עניין, לא פיצול הרשאות. שניהם משתמשים ב-`DashboardSidebar` המשותף (`features/dashboard/`) וניגשים דרך אותו guard (`handleProtectedNav` ב-`LandingPageV2`) שמשמש לכל שאר הדפים המוגנים בעמוד הבית.

### 2. **SafeAIUIPage** (`/safeai-ui`)
- **תיאור**: דשבורד ראשי למשתמשים מחוברים
- **גישה**: מוגן (Protected Route)
- **תכונות**:
  - **למנהלים (Admin)**:
    - ניהול פרופילים (ProfilesManagement)
    - ניהול משתמשים (UsersManagement)
  - **למשתמשים רגילים (User)**:
    - לוח משתמש (UserDashboard)
    - מפתחות API (UserApiKeysPage)
    - סטטיסטיקות (Statistics)

## דפי אימות (Authentication Pages)

### 3. **LoginForm** (`/login`)
- **תיאור**: דף התחברות
- **גישה**: ציבורי (PublicRoute - מפנה לדשבורד אם כבר מחובר)
- **תכונות**:
  - טופס התחברות עם אימייל וסיסמה
  - קישור לשכחתי סיסמה (`/forgot-password`)
  - קישור להרשמה (`/register`)
  - שמירת tokens ב-localStorage
  - ניווט אוטומטי ל-`/safeai-ui` לאחר התחברות מוצלחת

### 4. **RegisterForm** (`/register`)
- **תיאור**: דף הרשמה
- **גישה**: ציבורי (PublicRoute - מפנה לדשבורד אם כבר מחובר)
- **תכונות**:
  - טופס הרשמה מלא עם:
    - שם מלא
    - אימייל
    - סיסמה (עם אימות חוזק)
    - אימות סיסמה
    - ארגון (אופציונלי)
    - בחירת פרופיל AI (אופציונלי)
    - מצב שימוש (BYOK/MANAGED)
  - אימות סיסמה חזק (8+ תווים, אותיות גדולות/קטנות, ספרות)
  - ניווט ל-`/api-key-display` לאחר הרשמה מוצלחת

### 5. **ApiKeyDisplay** (`/api-key-display`)
- **תיאור**: הצגת מפתח API חד-פעמי לאחר הרשמה
- **גישה**: מוגן (Protected Route)
- **תכונות**:
  - הצגת מפתח API בצורה בולטת
  - אזהרה שזו ההזדמנות האחרונה לראות את המפתח
  - כפתור העתקה ללוח
  - כפתור הורדה כקובץ טקסט
  - דוגמאות שימוש (Python)
  - ניווט ל-`/safeai-ui` לאחר אישור

### 6. **EmailVerification** (`/verify-email/:token`)
- **תיאור**: אימות כתובת אימייל
- **גישה**: ציבורי
- **תכונות**:
  - אימות אוטומטי של token
  - הצגת סטטוס (טוען/הצלחה/שגיאה)
  - ניווט אוטומטי ל-`/login` לאחר 3 שניות במקרה של הצלחה
  - כפתורים לחזרה להתחברות או הרשמה מחדש במקרה של שגיאה

## רכיבי ניתוב (Route Components)

### ProtectedRoute
```typescript
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const accessToken = localStorage.getItem("accessToken");
  const user = localStorage.getItem("user");

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```
- **מטרה**: הגנה על דפים שדורשים אימות
- **לוגיקה**: בודק אם קיימים `accessToken` ו-`user` ב-localStorage
- **במקרה של כישלון**: מפנה ל-`/login`

### PublicRoute
```typescript
function PublicRoute({ children }: { children: React.ReactNode }) {
  const accessToken = localStorage.getItem("accessToken");
  const user = localStorage.getItem("user");

  if (accessToken && user) {
    return <Navigate to="/safeai-ui" replace />;
  }

  return <>{children}</>;
}
```
- **מטרה**: מניעת גישה לדפי אימות למשתמשים מחוברים
- **לוגיקה**: בודק אם המשתמש כבר מחובר
- **במקרה של הצלחה**: מפנה ל-`/safeai-ui`

## מבנה הניתוב המלא

```
/                           → LandingPageV2 (ציבורי)
/landing-preview            → redirect → /
/login                      → LoginForm (PublicRoute)
/register                   → RegisterForm (PublicRoute)
/verify-email/:token        → EmailVerification (ציבורי)
/api-key-display            → ApiKeyDisplay (ProtectedRoute)
/safeai-ui                  → SafeAIUIPage (ProtectedRoute)
/safeai-hub                 → SafeAIHubHomePage (ProtectedRoute)
/safeai-platform            → SafeAIPlatformHomePage (ProtectedRoute)
/*                          → NotFound (404)
```

> הרשימה לעיל מתמקדת בדפי הבית ובאימות. ה-router המלא (`apps/client/src/router/AppRouter.tsx`) כולל נתיבים נוספים רבים (פורום, חדשות, לוח פרויקטים, סוכנים, ארגונים ועוד) שאינם מתועדים כאן.

## זרימת משתמש (User Flow)

### הרשמה חדשה:
1. משתמש נכנס ל-`/` (LandingPage)
2. לוחץ על "הרשמה" → מועבר ל-`/register`
3. ממלא טופס הרשמה
4. לאחר הרשמה מוצלחת → מועבר ל-`/api-key-display`
5. שומר את מפתח ה-API
6. לוחץ "המשך לדשבורד" → מועבר ל-`/safeai-ui`

### התחברות:
1. משתמש נכנס ל-`/` (LandingPage)
2. לוחץ על "התחברות" → מועבר ל-`/login`
3. מזין אימייל וסיסמה
4. לאחר התחברות מוצלחת → מועבר ל-`/safeai-ui`

### אימות אימייל:
1. משתמש מקבל מייל עם קישור
2. לוחץ על הקישור → מועבר ל-`/verify-email/:token`
3. המערכת מאמתת את ה-token
4. לאחר 3 שניות → מועבר ל-`/login`

## שינויים עיקריים

### הוסר:
- ❌ `AuthForm` הישן מ-`LandingPage`
- ❌ לוגיקת אימות פשוטה (admin@safeai.com)
- ❌ מבנה ניתוב פשוט ללא הגנה

### נוסף:
- ✅ `LoginForm` נפרד
- ✅ `RegisterForm` נפרד עם אימות מלא
- ✅ `ApiKeyDisplay` להצגת מפתח חד-פעמי
- ✅ `EmailVerification` לאימות אימייל
- ✅ `ProtectedRoute` להגנה על דפים
- ✅ `PublicRoute` למניעת גישה כפולה
- ✅ ניהול tokens מלא (accessToken, refreshToken)
- ✅ אימות סיסמה חזק
- ✅ בחירת פרופיל AI בהרשמה

## קבצים שהשתנו

1. **`client/src/router/AppRouter.tsx`** - מבנה ניתוב חדש לגמרי
2. **`client/src/pages/LandingPage.tsx`** - הוסר AuthForm, נוספו כפתורי ניווט
3. **`client/src/styles/landing-page.css`** - נוספו סגנונות:
   - `.landing-nav-btn-primary` - כפתור הרשמה מודגש
   - `.auth-title` - כותרת לדפי אימות
   - `.form-footer` - פוטר לטפסים

## דפים שלא השתנו (לא רלוונטיים כרגע)

הדפים הבאים נשארו במערכת אך לא בשימוש פעיל:
- `HomePage`
- `FilterAdminPage`
- `TasksList`, `AddTask`, `UpdateTask`
- `TableView`
- `GrafsCompo`

ניתן לשקול הסרתם או שילובם בעתיד.

## הערות טכניות

### LocalStorage Keys:
- `accessToken` - JWT token לאימות
- `refreshToken` - JWT token לרענון
- `user` - אובייקט משתמש (JSON)
- `userRole` - תפקיד המשתמש (admin/user)

### API Endpoints בשימוש:
- `POST /api/auth/login` - התחברות
- `POST /api/auth/register` - הרשמה
- `GET /api/auth/verify-email/:token` - אימות אימייל
- `GET /api/profiles` - קבלת רשימת פרופילים

## המלצות לעתיד

1. **הוספת Forgot Password Flow** - כרגע יש קישור אך אין דף
2. **Context API או Redux** - במקום localStorage ישיר
3. **Token Refresh Logic** - רענון אוטומטי של tokens
4. **Loading States** - מצבי טעינה גלובליים
5. **Error Boundaries** - טיפול בשגיאות ברמת האפליקציה
6. **ניקוי דפים לא בשימוש** - הסרת HomePage, Tasks, וכו'

---

**תאריך עדכון**: 22/09/2026
**גרסה**: 2.1
**מחבר**: AI Assistant
