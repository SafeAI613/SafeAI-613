# SafeAI — מנוע הסינון

הלב של המוצר. הקוד תחת `server/src/services/filter/` ו-`server/src/services/trace/`.

## מבנה
```
services/filter/
├─ extractFilterText.ts  # איזה טקסט נבדק — כלל אחד לכל ה-APIs
├─ judge.ts              # judgeText — LLM-as-a-judge עם Structured Output
├─ inputFilter.ts        # evaluateInput — judge + כתיבת EvaluationLog
└─ blockedResponse.ts    # "תשובות דמה" כשנחסם (chat/responses/anthropic + SSE)

services/trace/
├─ requestTrace.ts       # RequestTrace — רשומת RequestLog אחת לכל בקשה
└─ answerExtractor.ts    # חילוץ טקסט התשובה (רגיל + stream)
```

## הזרימה בפרוקסי (`proxyService.ts`)
```
withTrace(api)                       ← RequestTrace אחד לבקשה
 └─ loadProfile(user)                ← getFullProfileById: כולל שדות select:false
 └─ filterInput(api, body, profile)
     ├─ extractFilterText            ← "" → filter.skipped, ממשיכים
     ├─ evaluateInput → judgeText    ← allowed / blocked / error
     └─ blocked/error → buildBlockedResponse (לא Error, תשובת LLM רגילה לכאורה)
 └─ buildSystemPrompt(profile) → LiteLLM
 └─ התשובה (או ה-stream דרך tapStream) נרשמת ב-RequestLog
```

> חשוב: `AIProfile.findById` רגיל **לא** מחזיר את `allowedCategories`, `blockedCategories`
> ו-`*Prompts` (מוגדרים `select:false`). תמיד להשתמש ב-`getFullProfileById`.

## extractFilterText — מה נבדק
- רק הודעות `role: "user"`. לא `system` / `developer` / `assistant`.
- רק בלוקי טקסט (`text`, `input_text`). תוצאות כלים (`tool_result`, `function_call_output`)
  וקריאות לכלים **לא** נבדקות — זה תוכן קבצים/פקודות של agents, לא כוונת המשתמש.
  סינון תוכן כזה הוא תפקיד של סינון פלט עתידי.
- תגיות של agents (`<system-reminder>`, `<environment_details>`, `<tool_use_instructions>`)
  **מוסרות מהטקסט**, וההודעה עצמה נבדקת. (בעבר הודעה כזו נזרקה כולה — פרצת עקיפה.)
- 3 הודעות המשתמש האחרונות, כל אחת מקוצרת מהאמצע ל-4000 תווים.

## judgeText (`judge.ts`)
- מודל: `LLM_AS_A_JUDGE_MODEL` (ברירת מחדל `gpt-5.4-nano`). בלי `temperature` — מודלי reasoning דוחים אותו.
- `response_format: json_schema` (strict) → `{ verdict: "allowed" | "blocked", reason }`.
- timeout 15 שניות, ניסיון חוזר אחד.
- **שגיאה אינה חסימה**: כל כשל מוחזר כ-`{ verdict: "error", error }`. סירוב של המודל (refusal) = `blocked`.
- ה-prompt: `FILTER_PROMPT` מה-DB + שם הפרופיל + הקטגוריות + הוראת פורמט ה-JSON (`promptBuilder.buildFilterPrompt`).

## החלטה ← מה המשתמש מקבל
| verdict | התנהגות | `safeai.kind` | RequestLog.status |
|---|---|---|---|
| `allowed` | ממשיכים לספק | — | `completed` / `error` |
| `blocked` | תשובת חסימה: "נסחו מחדש" | `policy` | `blocked` |
| `error` | **fail-closed**: "השירות אינו זמין זמנית" | `unavailable` | `filter_error` |

קוד הסיבה (`reasonCode`): `allowed-by-llm` / `blocked-by-llm` / `filter-error`.

## מעקב
- **RequestLog** (`models/requestLog.ts`): רשומה אחת לכל בקשה בפרוקסי — שאלה, החלטת סינון
  (`verdict`, `judgeReason`, `judgeModel`, `latencyMs`, `error`), תשובה, `providerResponseId`
  (= `UsageLog.requestId`), סטטוס, `error.stage` (`setup`/`filter`/`provider`/`stream`).
  `requestId` זהה ל-`ApplicationLog.requestId` ולכותרת `x-request-id`.
  TTL של 30 יום; `REQUEST_LOG_STORE_CONTENT=false` → בלי תוכן.
  צפייה: `GET /admin/request-logs`, `GET /admin/request-logs/:requestId` (אדמין).
- **EvaluationLog**: כל הפעלה של `evaluateInput` (פרוקסי + `/filter/evaluate`).
  `llmFinalDecision`: `allowed`/`blocked`/`error`, ועוד `judgeReason`, `judgeModel`, `latencyMs`.
  משמש את סטטיסטיקות האדמין (ספירת חסימות).

## `/filter/evaluate`
אדמין בלבד (`authenticateToken` + `requireAdmin`) — משמש את ProfileTester.
body: `{ profileId, text, auditDisabled? }` → `{ allowed, verdict, reason, judgeReason?, error?, judgeModel, latencyMs }`.

## הוספת שלב בדיקה
אין runner גנרי (היה, עם node אחד בלבד — הוסר). שלב נוסף (למשל prompt-injection או embedding guard)
מוסיפים ב-`evaluateInput`, לפני/אחרי `judgeText`, ומחזירים את אותו `FilterResult`.
