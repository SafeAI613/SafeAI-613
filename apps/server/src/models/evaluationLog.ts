/**
 * server/src/models/evaluationLog.ts
 *
 * Mongoose model that records each evaluation of a text input.
 * Used for audit/logging purposes and future analysis.
 */

import mongoose from "mongoose";

export interface EvaluationLogDoc extends mongoose.Document {
  profileId: mongoose.Types.ObjectId;
  text: string;
  /** שדה ישן (סינון וקטורי) — לא נכתב יותר, נשאר לרשומות קיימות. */
  vectorScores?: {
    bestAllowed: number;
    bestBlocked: number;
  };
  /** קוד סיבה: allowed-by-llm / blocked-by-llm / filter-error. */
  initialDecision: string;
  /** allowed / blocked / error. */
  llmFinalDecision: string;
  isManuallyReviewed: boolean;
  blockedBy?: string;
  /** ההסבר של ה-judge. */
  judgeReason?: string;
  /** הודעת השגיאה כשה-judge נכשל. */
  error?: string;
  judgeModel?: string;
  latencyMs?: number;
  /** שדה ישן (trace של ה-workflow) — לא נכתב יותר, נשאר לרשומות קיימות. */
  trace?: Record<string, unknown>[];
}

const EvaluationLogSchema = new mongoose.Schema(
  {
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: "AIProfile" },
    text: String,
    vectorScores: {
      bestAllowed: Number,
      bestBlocked: Number,
    },
    initialDecision: String,
    llmFinalDecision: String,
    isManuallyReviewed: { type: Boolean, default: false },
    blockedBy: { type: String },
    judgeReason: String,
    error: String,
    judgeModel: String,
    latencyMs: Number,
    trace: { type: [mongoose.Schema.Types.Mixed] },
  },
  { timestamps: true },
);

export const EvaluationLog = mongoose.model<EvaluationLogDoc>(
  "EvaluationLog",
  EvaluationLogSchema,
);
