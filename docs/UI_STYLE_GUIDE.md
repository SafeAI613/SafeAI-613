# מדריך סגנון UI — SafeAI613

שפה עיצובית אחת לכל האתר. הבסיס הוא דפי התצוגה (דף הבית ו-`/welcome/*`), ושאר הדפים מקבלים גרסה **סולידית** שלהם: אותם צבעים, גופן, פינות ותנועה, אבל בלי כותרות ענק, כתמי רקע או אנימציות מושכות-עין.

## מקורות אמת

| קובץ | מה יש בו |
|------|----------|
| `apps/client/src/styles/design-system.css` | כל ה-tokens הגלובליים (צבעים, פינות, צללים, גופן, תנועה) + מצב לילה, וסגנון בסיס ל-`.btn`, `input`, `.table`, `.card` |
| `apps/client/src/styles/showcase.css` | דפי התצוגה בלבד (`.sx-*`). לא משתמשים בו בדפים רגילים |
| `apps/client/src/styles/landing-page-v2.css` | tokens של מעטפת Hub/Platform (`--lv2-*`), מיושרים לאותה פלטה |

## כללים

1. **רק tokens, בלי צבעים קשיחים.** משתמשים ב-`var(--text-primary)`, `var(--bg-surface)`, `var(--border-default)`, `var(--brand-primary)` וכו'. צבע hex מותר רק בתוך הגדרת token. כך מצב לילה עובד אוטומטית.
2. **צבעי מותג:** ירוק SafeAI `--brand-primary` (פעולה ראשית), כחול Platform `--brand-secondary` (משני/קישורים), נחושת Hub `--brand-hub`. גרסאות רכות לרקע: `--brand-primary-soft`, `--brand-secondary-soft`, `--brand-hub-soft`.
3. **פינות:** `--radius-sm` (10px) לכפתורים ושדות, `--radius-md` (14px) לכרטיסים, `--radius-lg` (22px) לפאנלים גדולים, `--radius-pill` לתגיות ו-chips.
4. **צללים:** `--shadow-sm/md/lg` בלבד. ברירת מחדל לכרטיס: גבול `--border-default` בלי צל; ב-hover: `--shadow-md`.
5. **טיפוגרפיה:** Heebo (`--font-family`). כותרת דף: 28–32px, משקל 800, `letter-spacing: -0.02em`. כותרת משנה: 20px/700. טקסט גוף 15px בצבע `--text-secondary`; טקסט משני `--text-muted`.
6. **כפתורים:** ראשי = רקע `--brand-primary`, טקסט `--text-inverse`; משני = רקע `--bg-surface` + גבול `--border-default`, וב-hover גבול וטקסט בצבע המותג. ב-hover: הרמה של 1px לכל היותר.
7. **שדות טופס:** פינה `--radius-sm`, גבול `--border-default`, ובפוקוס גבול `--brand-primary` + `box-shadow: var(--focus-ring)`.
8. **תנועה (סולידית):** `transition` של 0.2–0.3s עם `var(--ease-out)`. כרטיס ב-hover: `translateY(-2px)` לכל היותר. דפים מקבלים אנימציית כניסה דרך ה-layout (אין צורך להוסיף בכל דף). כל אנימציה חדשה חייבת כיבוי ב-`@media (prefers-reduced-motion: reduce)`.
9. **תגיות סטטוס:** משתמשים ב-`--color-success/danger/warning/info` עם `-bg` ו-`-border` התואמים.
10. **נגישות:** לא מורידים `outline` בלי תחליף (`--focus-ring`). ניגודיות טקסט לפחות 4.5:1.
