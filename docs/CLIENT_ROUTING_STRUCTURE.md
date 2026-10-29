# מבנה הניתוב של הקליינט (Client Routing Structure)

## עיקרון

האתר הוא **דף בית אחד (Gateway)** שמציג את SafeAI, וממנו נכנסים לשתי פלטפורמות נפרדות.
כל פלטפורמה יושבת תחת prefix משלה ומקבלת **layout משלה** (סיידבר, צבעים, ניווט):

| אזור | נתיב | מטרה | גישה |
|------|------|------|------|
| Gateway | `/` | הסבר על SafeAI ובחירת פלטפורמה | ציבורי |
| **SafeAI Platform** | `/platform/*` | שימוש ב-SafeAI כספק AI: מפתחות API, שימוש, חיוב, ארגונים | `/platform` — דף היכרות לאורחים; כל השאר דורש התחברות |
| **SafeAI Hub** | `/hub/*` | שיתוף ידע: חדשות, פורום, מאמרים, קורסים, פרויקטים, סוכנים | קריאה ציבורית; פעולות (פרסום, תגובה, הגשה) דורשות התחברות |
| משותף | `/login`, `/register`, `/about`, `/contact`, `/privacy`... | התחברות ודפים כלליים | לפי הדף |

זו אפליקציית SPA אחת (build אחד, התחברות אחת). בפרודקשן היא מוגשת תחת `/console/` דרך `VITE_BASE_PATH` — כל הנתיבים כאן יחסיים ל-basename הזה.

## קבצים מרכזיים

| קובץ | תפקיד |
|------|-------|
| `apps/client/src/router/paths.ts` | **מקור האמת לכל הנתיבים** (`ROUTES`), טבלת הפניות מנתיבים ישנים (`LEGACY_REDIRECTS`), `safeNextPath()` ו-`loginPath()` |
| `apps/client/src/router/AppRouter.tsx` | הגדרת ה-routes, מקובצים לפי layout |
| `apps/client/src/router/guards.tsx` | `ProtectedRoute` ו-`PublicRoute` |
| `apps/client/src/router/LegacyRedirect.tsx` | הפניה מנתיב ישן לחדש, כולל query ו-hash |
| `apps/client/src/layout/SiteLayout.tsx` | layout לדפי ה-Gateway: ניווט עליון + באנר בטא |
| `apps/client/src/layout/PlatformLayout.tsx` | layout של Platform: סיידבר Platform |
| `apps/client/src/layout/HubLayout.tsx` | layout של Hub: סיידבר Hub + קישור התחברות לאורחים |

**כלל:** לא כותבים מחרוזת נתיב בתוך קומפוננטה — מייבאים מ-`ROUTES`. כך אפשר להזיז route בלי לחפש כל קישור אליו.

## התחברות וחזרה לדף המקורי (`?next=`)

- `ProtectedRoute` — אורח מועבר ל-`/login?next=<הדף שביקש>`.
- `LoginForm` — אחרי התחברות מוצלחת חוזר ל-`next`; בלי `next` — לדף הבית `/`.
- `PublicRoute` — משתמש מחובר שמגיע לדף אורחים (login, register, דף ההיכרות של Platform) מועבר ל-`next`, או ל-`redirectTo` אם הוגדר, או ל-`/`.
- `safeNextPath()` מקבל רק נתיב יחסי באותו אתר (מתחיל ב-`/` ולא ב-`//`) — הגנה מפני open-redirect.

## טאבים של האזור האישי

`SafeAIUIPage` (ב-`pages/SafeAIUIPage.tsx`) מציג טאב לפי `:section` ב-URL (אפשר לשלוח קישור לטאב, ו-refresh/back עובדים). הטאבים המותרים לכל תפקיד מוגדרים ב-`ROLE_SECTIONS`, והראשון הוא ברירת המחדל:

| תפקיד | אזור | טאבים |
|-------|------|-------|
| `user` | `/platform/account` | `overview`, `statistics`, `api-keys`, `requests`, `billing` |
| `org_owner` | `/platform/account` | `org-statistics`, `org-users` |
| `admin` | `/platform/admin` | `statistics`, `profiles`, `users`, `organizations`, `all-requests`, `contact-types` |

טאב לא מוכר, טאב של תפקיד אחר, או האזור הלא נכון לתפקיד → הפניה לטאב ברירת המחדל של התפקיד. קישור לטאב: `` `${ROUTES.platform.account}/requests` ``.

## הפניות מנתיבים ישנים

כשנתיב זז, מוסיפים שורה ל-`LEGACY_REDIRECTS` ב-`paths.ts` במקום למחוק את הנתיב הישן — כך קישורים במיילים, סימניות ומנועי חיפוש ממשיכים לעבוד (המקבילה ב-SPA להפניה קבועה 301).

**לא מזיזים** נתיבים שמערכות חיצוניות שולחות אליהם: `/verify-email/:token`, `/reset-password/:token` (קישורים במייל), ו-`/organizations/:id/wallet/payme/*` (PayMe).

## מפת הנתיבים הנוכחית

```
/                         → LandingPageV2 (Gateway)

/platform                       → PlatformTeaserPage (אורחים; מחובר → /platform/dashboard)
/platform/dashboard             → SafeAIPlatformHomePage
/platform/account/:section      → SafeAIUIPage — אזור אישי (user, org_owner)
/platform/admin/:section        → SafeAIUIPage — ניהול מערכת (admin)
/platform/requests/:id          → RequestDetails
/platform/organization/users    → OrganizationUsersPage
/platform/organization/invoices → OrganizationInvoicesPage
/platform/changelog             → ActivityLogPage
/platform/api-key-created       → ApiKeyDisplay (הצגה חד-פעמית של מפתח חדש; המפתח מגיע ב-navigation state)

/hub                      → SafeAIHubHomePage (ציבורי)

כל `/platform/*` (חוץ מ-`/platform` עצמו) מוגן ומוצג בתוך `PlatformLayout`, שעוטף את התוכן ב-`ErrorBoundary` אחד שמתאפס במעבר דף.

הפניות מנתיבים ישנים (`LEGACY_REDIRECTS`):

```
/safeai-platform          → /platform/dashboard
/safeai-hub               → /hub
/landing-preview          → /
/safeai-ui                → /platform/account   (מקושר גם ממיילים של השרת)
/admin/all-requests       → /platform/admin/all-requests
/admin/organizations      → /platform/admin/organizations
/request/:id              → /platform/requests/:id
/organization/users       → /platform/organization/users
/organization/invoices    → /platform/organization/invoices
/activity-log             → /platform/changelog
/api-key-display          → /platform/api-key-created
```

שאר הדפים עדיין בנתיבים הישנים תחת `SiteLayout`, עד שיועברו לפי התוכנית למטה.

## תוכנית ההעברה (PRs הדרגתיים מול `develop`)

1. **תשתית** ✅ — `ROUTES`, guards עם `next`, layouts לכל פלטפורמה, מנגנון הפניות, דפי הבית של שתי הפלטפורמות.
2. **Platform** ✅ — העברת האזור האישי (`/safeai-ui` והטאבים שלו), מפתחות API, בקשות, חשבוניות ארגון, ניהול מערכת (`/platform/admin/*`), ו-`/activity-log` כ-changelog של הפלטפורמה (`/platform/changelog`).
3. **Hub** — העברת חדשות, פורום, מאמרים (`/docs`), קורסים, מדריכים מומלצים, לוח פרויקטים, מרקטפלייס הסוכנים והורדת הסוכנים, וניהול תוכן (`/hub/admin/*`). קריאה ציבורית בכל אלה.
4. **ניקוי** — הסרת קוד מת (`layout/AppLayout.tsx`, `layout/Sidebar.tsx`, `GoogleAuthCallback`, `DocsPage` הישן), איחוד הניווט העליון, ועדכון המסמך הזה.
