/**
 * server/src/services/filter/blockedResponse.ts
 *
 * הופך verdict חוסם ל"תשובת דמה" בצורת תשובת LLM אמיתית,
 * במקום לזרוק Error שהופך ל-500/400 ושובר את הלקוח.
 *
 * יש פורמט נפרד לכל API (chat completions / responses / anthropic messages),
 * ועטיפת SSE למקרה של stream:true.
 */

/**
 * סוג החסימה:
 *  - policy      → התוכן נחסם לפי מדיניות הפרופיל.
 *  - unavailable → שירות הסינון נכשל (fail-closed); התוכן לא נבדק בכלל.
 */
export type BlockKind = "policy" | "unavailable";

/** הטקסט שהמשתמש יראה כתשובת ה-assistant. */
export function blockedMessageText(
  reason: string,
  kind: BlockKind = "policy",
): string {
  if (kind === "unavailable") {
    return `שירות סינון התוכן של SafeAI אינו זמין זמנית, ולכן הבקשה לא נשלחה. אנא נסו שוב בעוד מספר דקות.`;
  }
  return `הבקשה נחסמה ע"י מסנן התוכן של SafeAI (${reason}). אנא נסחו מחדש בהתאם למדיניות הפרופיל.`;
}

/* ============================================================
 * Non-streaming shapes
 * ============================================================ */

/** OpenAI Chat Completions shape. */
export function buildBlockedChatCompletion(
  model: string,
  reason: string,
  kind: BlockKind = "policy",
) {
  return {
    id: `safeai-blocked-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: blockedMessageText(reason, kind) },
        finish_reason: "content_filter",
      },
    ],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    safeai: { blocked: true, reason, kind },
  };
}

/** OpenAI Responses API shape. */
export function buildBlockedResponsesApi(
  model: string,
  reason: string,
  kind: BlockKind = "policy",
) {
  return {
    id: `safeai-blocked-${Date.now()}`,
    object: "response",
    created_at: Math.floor(Date.now() / 1000),
    model,
    status: "completed",
    output: [
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: blockedMessageText(reason, kind) }],
      },
    ],
    usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
    safeai: { blocked: true, reason, kind },
  };
}

/** Anthropic Messages shape. */
export function buildBlockedAnthropicMessage(
  model: string,
  reason: string,
  kind: BlockKind = "policy",
) {
  return {
    id: `safeai-blocked-${Date.now()}`,
    type: "message",
    role: "assistant",
    model,
    stop_reason: "end_turn",
    content: [{ type: "text", text: blockedMessageText(reason, kind) }],
    usage: { input_tokens: 0, output_tokens: 0 },
    safeai: { blocked: true, reason, kind },
  };
}

/* ============================================================
 * Streaming wrapper
 * ============================================================ */

/**
 * עוטף אובייקט JSON כ-SSE stream בעל chunk אחד + [DONE],
 * כדי שלקוח שמצפה ל-stream יקבל תשובת חסימה בלי להיתקע.
 */
export function toSSEStream(payload: unknown): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
      );
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}
/* ============================================================
 * Entry point
 * ============================================================ */

export type BlockedApi = "chat" | "responses" | "anthropic";

/** תשובת חסימה בפורמט של ה-API שהלקוח קרא לו (כולל SSE ל-stream). */
export function buildBlockedResponse(
  api: BlockedApi,
  model: string,
  reason: string,
  kind: BlockKind,
  stream?: boolean,
): object | ReadableStream {
  const payload =
    api === "anthropic"
      ? buildBlockedAnthropicMessage(model, reason, kind)
      : api === "responses"
        ? buildBlockedResponsesApi(model, reason, kind)
        : buildBlockedChatCompletion(model, reason, kind);

  return stream ? toSSEStream(payload) : payload;
}
