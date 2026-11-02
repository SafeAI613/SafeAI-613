/**
 * server/src/services/filter/judge.ts
 *
 * LLM-as-a-judge: מחליט האם טקסט מותר לפי פרופיל.
 *
 * עקרונות:
 *  - Structured Output (json_schema strict) — התשובה תמיד JSON תקין עם
 *    verdict מתוך enum + reason, כך שאין פענוח שביר של טקסט חופשי.
 *  - שגיאה איננה חסימה: כל כשל (רשת, timeout, פרמטר לא נתמך, JSON שבור)
 *    מוחזר כ-verdict: "error" עם הודעת השגיאה. ההחלטה מה לעשות בשגיאה
 *    (fail-closed) מתקבלת בשכבה שמעל — ולא נבלעת כאן.
 *  - לא שולחים temperature: מודלי reasoning (משפחת gpt-5) תומכים רק
 *    בערך ברירת המחדל ומחזירים 400 על temperature: 0.
 */

import logger from "../../logger";
import { buildFilterPrompt } from "../promptBuilder";
import { openai } from "../../config/openai";

const DEFAULT_JUDGE_MODEL = "gpt-5.4-nano";
const JUDGE_TIMEOUT_MS = 15_000;

export type JudgeVerdict = "allowed" | "blocked";

interface JudgeMeta {
  judgeModel: string;
  latencyMs: number;
}

export type JudgeResult =
  | (JudgeMeta & { verdict: JudgeVerdict; reason: string })
  | (JudgeMeta & { verdict: "error"; error: string });

/** סכמת התשובה שה-judge חייב להחזיר. */
const DECISION_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["allowed", "blocked"] },
    reason: { type: "string" },
  },
  required: ["verdict", "reason"],
  additionalProperties: false,
} as const;

function isDecision(
  value: unknown,
): value is { verdict: JudgeVerdict; reason: string } {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v.verdict === "allowed" || v.verdict === "blocked") &&
    typeof v.reason === "string"
  );
}

export async function judgeText(
  text: string,
  profileName: string,
  profileDesc: string,
): Promise<JudgeResult> {
  const judgeModel = process.env.LLM_AS_A_JUDGE_MODEL || DEFAULT_JUDGE_MODEL;
  const start = Date.now();
  const meta = (): JudgeMeta => ({
    judgeModel,
    latencyMs: Date.now() - start,
  });

  try {
    const response = await openai.chat.completions.create(
      {
        model: judgeModel,
        messages: [
          {
            role: "system",
            content: await buildFilterPrompt(profileName, profileDesc),
          },
          { role: "user", content: text },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "filter_decision",
            strict: true,
            schema: DECISION_SCHEMA,
          },
        },
      },
      { timeout: JUDGE_TIMEOUT_MS, maxRetries: 1 },
    );

    const message = response.choices?.[0]?.message;

    // המודל סירב לענות (safety refusal) — זה סימן חזק שהתוכן בעייתי.
    if (message?.refusal) {
      const result: JudgeResult = {
        verdict: "blocked",
        reason: `judge-refused: ${message.refusal}`,
        ...meta(),
      };
      logger.info(JSON.stringify({ event: "judge.decision", ...result }));
      return result;
    }

    const content = message?.content;
    if (!content) {
      throw new Error("Judge returned empty content");
    }

    const parsed: unknown = JSON.parse(content);
    if (!isDecision(parsed)) {
      throw new Error(`Judge returned invalid decision: ${content}`);
    }

    const result: JudgeResult = { ...parsed, ...meta() };
    logger.info(
      JSON.stringify({ event: "judge.decision", profileName, ...result }),
    );
    return result;
  } catch (err) {
    const result: JudgeResult = {
      verdict: "error",
      error: err instanceof Error ? err.message : String(err),
      ...meta(),
    };
    logger.error(
      JSON.stringify({ event: "judge.error", profileName, ...result }),
    );
    return result;
  }
}
