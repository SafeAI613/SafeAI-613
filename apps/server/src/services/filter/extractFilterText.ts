/**
 * server/src/services/filter/extractFilterText.ts
 *
 * חילוץ הטקסט שנשלח ל-judge — פונקציה אחת לכל ה-APIs של הפרוקסי.
 *
 * הכלל זהה בכל ה-APIs:
 *  1. נבדקות רק הודעות שהמשתמש כתב (role: "user"). הודעות system / developer /
 *     assistant לא נבדקות — הן לא "השאלה", ובדיקתן גרמה לחסימות שגויות
 *     (למשל system prompt של agent שנשפט כאילו המשתמש כתב אותו).
 *  2. מכל הודעה נלקחים רק בלוקי טקסט. תוצאות כלים (tool_result /
 *     function_call_output) וקריאות לכלים לא נבדקות: אלה תוכן קבצים ופלטי
 *     פקודות של agents, לא כוונת המשתמש.
 *  3. בלוקים מתויגים שמוזרקים ע"י agents (כמו <system-reminder>...</system-reminder>)
 *     מוסרים מתוך הטקסט — אבל ההודעה עצמה לא נזרקת. כך אי אפשר לעקוף את
 *     הסינון ע"י הוספת תגית כזו להודעה.
 *  4. נלקחות N ההודעות האחרונות שנשאר בהן טקסט, וכל הודעה מקוצרת לאורך מקסימלי.
 */

export type FilterApi = "chat" | "responses" | "anthropic" | "image";

export interface ExtractOptions {
  /** כמה הודעות משתמש אחרונות לבדוק. */
  maxMessages?: number;
  /** אורך מקסימלי לכל הודעה (תווים). */
  maxCharsPerMessage?: number;
}

const DEFAULT_MAX_MESSAGES = 3;
const DEFAULT_MAX_CHARS = 4000;

/** תגיות שמוזרקות ע"י כלי agent ואינן חלק ממה שהמשתמש כתב. */
const AGENT_TAGS = [
  "system-reminder",
  "environment_details",
  "tool_use_instructions",
];

const AGENT_BLOCK_RE = new RegExp(
  AGENT_TAGS.map((tag) => `<${tag}>[\\s\\S]*?</${tag}>`).join("|"),
  "gi",
);

/** סוגי בלוקים שנחשבים טקסט שהמשתמש כתב. */
const TEXT_PART_TYPES = new Set(["text", "input_text"]);

type Part = { type?: unknown; text?: unknown };

/** מחזיר את טקסט ההודעה מתוך content (string או מערך בלוקים). */
function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .filter(
      (part: Part) =>
        TEXT_PART_TYPES.has(part?.type as string) &&
        typeof part.text === "string",
    )
    .map((part: Part) => part.text as string)
    .join("\n");
}

function stripAgentBlocks(text: string): string {
  return text.replace(AGENT_BLOCK_RE, "").trim();
}

/** מקצר מהאמצע — שומר את ההתחלה ואת הסוף, ששם בדרך כלל נמצאת השאלה. */
function truncateMiddle(text: string, max: number): string {
  if (text.length <= max) return text;
  const half = Math.floor(max / 2);
  return `${text.slice(0, half)}\n[...]\n${text.slice(-half)}`;
}

type Item = { role?: unknown; content?: unknown };

/** גוף הבקשה מגיע מהלקוח כ-JSON לא מאומת — ניגשים אליו בזהירות. */
function field(body: unknown, key: string): unknown {
  return typeof body === "object" && body !== null
    ? (body as Record<string, unknown>)[key]
    : undefined;
}

/** טקסטי ההודעות שה-role שלהן "user", לפי הסדר. */
function userItemTexts(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item: Item) => item?.role === "user")
    .map((item: Item) => contentToText(item.content));
}

/** מחזיר את טקסטי הודעות המשתמש לפי סדרן, לפני ניקוי וקיצור. */
function userTexts(api: FilterApi, body: unknown): string[] {
  switch (api) {
    case "image": {
      const prompt = field(body, "prompt");
      return typeof prompt === "string" ? [prompt] : [];
    }

    case "responses": {
      const input = field(body, "input");
      if (typeof input === "string") return [input];
      // פריטים ללא role (function_call_output וכו') אינם הודעות משתמש.
      return userItemTexts(input);
    }

    case "chat":
    case "anthropic":
      return userItemTexts(field(body, "messages"));
  }
}

/**
 * מחזיר את הטקסט שה-judge צריך לבדוק, או "" אם אין טקסט משתמש לבדוק.
 */
export function extractFilterText(
  api: FilterApi,
  body: unknown,
  options: ExtractOptions = {},
): string {
  const maxMessages = options.maxMessages ?? DEFAULT_MAX_MESSAGES;
  const maxChars = options.maxCharsPerMessage ?? DEFAULT_MAX_CHARS;

  const texts = userTexts(api, body)
    .map(stripAgentBlocks)
    .filter(Boolean)
    .slice(-maxMessages)
    .map((text) => truncateMiddle(text, maxChars));

  if (texts.length <= 1) return texts[0] ?? "";

  return texts
    .map((text, i) => `Message ${i + 1}:\n${text}`)
    .join("\n\n---\n\n");
}
