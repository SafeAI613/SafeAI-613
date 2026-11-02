/**
 * server/src/services/filter/inputFilter.ts
 *
 * סינון הקלט: בדיקת טקסט מול הפרופיל ע"י ה-judge, ורישום ב-EvaluationLog.
 *
 * נקרא משני מקומות:
 *  - הפרוקסי (proxyService.filterInput) — מתרגם חסימה לתשובת דמה.
 *  - POST /filter/evaluate (filterController) — מחזיר את ההחלטה כ-JSON.
 *
 * הערה: זה היה בעבר input "workflow" עם runner גנרי ו-nodes. היה בו
 * node אחד בלבד, ולכן הוא הוחלף בקריאה ישירה. כשיתווסף שלב בדיקה נוסף
 * (למשל prompt-injection), מוסיפים אותו כאן לפני/אחרי judgeText.
 */

import logger from "../../logger";
import { createEvaluationLog } from "../../repositories/evaluationRepository";
import { judgeText, JudgeResult } from "./judge";

/** השדות מהפרופיל שהסינון צריך (שימו לב: הקטגוריות הן select:false בסכמה). */
export interface FilterProfile {
  _id?: unknown;
  name?: string;
  allowedCategories?: string[];
  blockedCategories?: string[];
}

export type FilterResult = JudgeResult;

export type FilterReasonCode = "allowed-by-llm" | "blocked-by-llm" | "filter-error";

/**
 * קוד סיבה קצר וקבוע. ה-client (ProfileTester) מתרגם אותו לטקסט,
 * והוא מופיע גם בהודעת החסימה למשתמש וב-EvaluationLog.initialDecision.
 */
export function reasonCode(result: FilterResult): FilterReasonCode {
  if (result.verdict === "error") return "filter-error";
  return result.verdict === "allowed" ? "allowed-by-llm" : "blocked-by-llm";
}

function buildProfileDesc(profile: FilterProfile): string {
  return (
    `allowed categories: ${(profile.allowedCategories ?? []).join(", ")}\n` +
    `blocked categories: ${(profile.blockedCategories ?? []).join(", ")}`
  );
}

/** רישום אודיט — לא חוסם את הבקשה ולא זורק. */
function auditEvaluation(profile: FilterProfile, text: string, result: FilterResult): void {
  createEvaluationLog({
    profileId: profile._id as never,
    text,
    initialDecision: reasonCode(result),
    llmFinalDecision: result.verdict,
    ...(result.verdict === "allowed" ? {} : { blockedBy: "llm-decision" }),
    ...(result.verdict === "error"
      ? { error: result.error }
      : { judgeReason: result.reason }),
    judgeModel: result.judgeModel,
    latencyMs: result.latencyMs,
  }).catch((err: Error) =>
    logger.error(JSON.stringify({ event: "evaluation_log.save_failed", error: err.message })),
  );
}

export interface EvaluateInputOptions {
  /** false → לא לכתוב EvaluationLog. */
  audit?: boolean;
}

/** בודק טקסט מול הפרופיל. לעולם לא זורק בגלל ה-judge — כשל מוחזר כ-verdict: "error". */
export async function evaluateInput(
  profile: FilterProfile,
  text: string,
  { audit = true }: EvaluateInputOptions = {},
): Promise<FilterResult> {
  const result = await judgeText(text, profile.name ?? "", buildProfileDesc(profile));
  if (audit) auditEvaluation(profile, text, result);
  return result;
}
