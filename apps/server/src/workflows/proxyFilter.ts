/**
 * server/src/workflows/proxyFilter.ts
 *
 * Glue בין שכבת הפרוקסי ל-workflows, כדי לחסל את הכפילות
 * שחזרה ב-6 פונקציות ה-proxy (extract → evaluateText → throw).
 *
 * שימוש בכל פונקציית proxy:
 *
 *   const blocked = await guardInput({
 *     profile, text: userQuery, model, api: "chat", stream: body.stream,
 *   });
 *   if (blocked) return blocked;   // תשובת דמה, לא Error
 */

import logger from "../logger";
import {
  BlockKind,
  buildBlockedAnthropicMessage,
  buildBlockedChatCompletion,
  buildBlockedResponsesApi,
  toSSEStream,
} from "./blockedResponse";
import { evaluateText, EvaluateResult } from "./input/evaluate";

export type ProxyApi = "chat" | "responses" | "anthropic";

interface GuardInputArgs {
  profile: any;
  text: string;
  model: string;
  api: ProxyApi;
  stream?: boolean;
  /** נקרא עם תוצאת הסינון המלאה (לצורכי מעקב — RequestTrace). */
  onEvaluated?: (result: EvaluateResult) => void;
}

/**
 * מפעיל את הערכת הקלט דרך evaluateText
 * (= input workflow + כתיבת EvaluationLog).
 * אושר → null (המשך רגיל). נחסם → תשובת דמה לפי ה-API.
 */
export async function guardInput(
  args: GuardInputArgs,
): Promise<object | ReadableStream | null> {
  const { profile, text, model, api, stream, onEvaluated } = args;

  const result = await evaluateText({
    profileId: profile?._id?.toString() ?? "",
    text,
  });
  onEvaluated?.(result);

  if (result.allowed) {
    return null;
  }

  const reason = result.reason || "Unknown reason";
  const kind: BlockKind = result.errored ? "unavailable" : "policy";
  const logLine = JSON.stringify({
    event: result.errored ? "proxy.filter_error" : "proxy.blocked",
    api,
    model,
    reason,
    blockedBy: result.blockedBy,
  });
  if (result.errored) logger.error(logLine);
  else logger.info(logLine);

  const payload =
    api === "anthropic"
      ? buildBlockedAnthropicMessage(model, reason, kind)
      : api === "responses"
        ? buildBlockedResponsesApi(model, reason, kind)
        : buildBlockedChatCompletion(model, reason, kind);

  return stream ? toSSEStream(payload) : payload;
}