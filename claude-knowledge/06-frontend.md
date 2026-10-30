# SafeAI — צד הלקוח (client/)

React 19 + Vite 7 + TypeScript + React Router 7 + Redux Toolkit. פורט dev `5173`.
תלויות בולטות: `recharts` (גרפים), `xlsx` + `file-saver` (ייצוא Excel), `date-fns`, `axios`.

## מבנה
```
client/src/
├─ main.tsx, App.tsx        # bootstrap
├─ router/                  # AppRouter, paths (ROUTES), guards, LegacyRedirect
├─ config/api.ts            # API_BASE_URL, API_ENDPOINTS, apiCall<T>()
├─ app/store.ts, hooks.ts   # Redux Toolkit store + typed hooks
├─ context/                 # AuthContext (useAuth) — מקור האמת ל-auth
├─ layout/                  # SiteLayout, PlatformLayout, HubLayout
├─ components/              # TopNavigation, BetaBanner, ProfileSelectionModal...
├─ features/                # Redux slices + UI לפי דומיין
│  ├─ auth/                 # Login/Register/Forgot/Reset/ApiKeyDisplay/Google
│  ├─ safeai-ui/            # הליבה: ProfilesManagement, UsersManagement,
│  │                        #   ProviderKeysManagement, Statistics, UserDashboard,
│  │                        #   ProfileTester, UserApiKeysPage
│  ├─ organizations/        # api/ + components/ + pages/ (PendingOrganizations)
│  ├─ data-history/         # גרפים: APIrequests, chatConversations, GrafsCompo
│  ├─ FilterManagement/     # ניהול prompts (Add/Edit/Group)
│  ├─ Inquiries/, tasks/, tabl_data/, example/, landing/
├─ pages/                   # עמודים ברמת route (Landing, SafeAIUI, About, Docs...)
├─ utils/tokenManager.ts    # ניהול טוקנים
└─ styles/                  # CSS (design-system.css ועוד)
```

## Routing
האתר הוא דף בית (Gateway) ושתי פלטפורמות: **SafeAI Platform** (`/platform/*`, דורש התחברות) ו-**SafeAI Hub** (`/hub/*`, קריאה ציבורית). המבנה המלא, הכללים ומפת הנתיבים: [CLIENT_ROUTING_STRUCTURE.md](../docs/CLIENT_ROUTING_STRUCTURE.md).
- `router/paths.ts` — `ROUTES` (מקור אמת לכל הנתיבים — לא כותבים מחרוזת נתיב בקומפוננטה), `LEGACY_REDIRECTS`, `safeNextPath()`, `loginPath()`.
- `router/guards.tsx` — `ProtectedRoute` (אורח → `/login?next=<הדף>`), `PublicRoute` (מחובר → `next` / `redirectTo` / `/`).
- `layout/SiteLayout` (ניווט עליון + באנר), `layout/PlatformLayout`, `layout/HubLayout` (סיידבר לכל פלטפורמה + `ErrorBoundary`).

> **production sub-path:** האתר מוגש תחת `/console/`. צריך `basename="/console"` ב-Router. ראה [07-deployment-and-env.md].

## API layer (`config/api.ts`)
- `API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"`.
- `API_ENDPOINTS` — אובייקט מרוכז של כל ה-URLs (auth, profiles, users, usage, adminStats, proxyKey, organizations, contact...).
- **`apiCall<T>(endpoint, options)`** — ה-helper המרכזי. מצרף `Authorization` מ-localStorage ומטפל ב-**refresh אוטומטי על 401**.

## מוסכמות קוד (חובה — feedback מאומת)
1. **תמיד `apiCall<T>()`**, לא `fetch()` גולמי — אחרת token refresh נשבר אחרי תפוגה.
2. **תמיד `useAuth()`** מ-AuthContext, לא קריאות ישירות ל-`localStorage` עבור user/role.
3. **`AbortController` + cleanup** בכל `useEffect` עם fetch אסינכרוני; להתעלם מ-`AbortError` ב-catch.
4. **הגנה מחלוקה באפס:** `total > 0 ? (x/total)*100 : 0`.
5. **`useMemo`** לפעולות מערך יקרות (filter/reduce על רשימות גדולות) עם deps נכונים.

## State
Redux Toolkit (`app/store.ts`) + slices לכל feature (`*Slice.ts`). hooks מוקלדים ב-`app/hooks.ts`.
auth מנוהל ב-Context (לא ב-Redux) — `AuthContext` הוא מקור האמת.
