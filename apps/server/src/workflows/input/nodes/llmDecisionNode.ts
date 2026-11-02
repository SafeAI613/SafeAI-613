/**
 * server/src/workflows/input/nodes/llmDecisionNode.ts
 *
 * ה-node היחיד שפעיל כרגע ב-Input workflow.
 * עוטף את judgeText. כשל של ה-judge נזרק כ-NodeError, כדי שה-runner
 * ירשום אותו כ-"error" ב-trace (ולא כ"חסימה" — כמו שהיה קודם).
 */

import logger from "../../../logger";
import { judgeText } from "../../../services/llmService";
import { GuardNode, NodeError } from "../../types";

/** בונה את תיאור הפרופיל ל-LLM (הועבר לכאן מתוך evaluateText). */
function buildProfileDesc(profile: any): string {
  return (
    "allowed categories:" +
    (profile.allowedCategories ?? []).join(", ") +
    " " +
    "blocked categories:" +
    (profile.blockedCategories ?? []).join(", ")
  );
}

export const llmDecisionNode: GuardNode = {
  name: "llm-decision",

  async run(ctx) {
    const profileDesc = buildProfileDesc(ctx.profile);
    logger.info("profileDesc: " + profileDesc);

    const judge = await judgeText(ctx.text, ctx.profile.name, profileDesc);
    const metadata = {
      profileDesc,
      judgeModel: judge.judgeModel,
      latencyMs: judge.latencyMs,
    };

    if (judge.verdict === "error") {
      throw new NodeError(judge.error, metadata);
    }

    const allowed = judge.verdict === "allowed";
    return {
      verdict: allowed ? "allow" : "block",
      reason: allowed ? "allowed-by-llm" : "blocked-by-llm",
      // ההסבר של ה-judge — נשמר ב-trace/EvaluationLog לצורכי מעקב.
      metadata: { ...metadata, judgeReason: judge.reason },
    };
  },
};

/* ------------------------------------------------------------
 * נקודות הרחבה עתידיות (לדוגמה בלבד — לא פעילות):
 *
 *   export const embeddingGuardNode: GuardNode = {
 *     name: "embedding-guardrail",
 *     async run(ctx) { ... cosineSimilarity מול allowed/blocked categories ... }
 *   };
 *
 *   export const promptInjectionNode: GuardNode = {
 *     name: "prompt-injection-guardrail",
 *     async run(ctx) { ... }
 *   };
 *
 * מוסיפים אותן פשוט למערך ב-inputFilterWorkflow.ts לפי הסדר הרצוי.
 * ------------------------------------------------------------ */