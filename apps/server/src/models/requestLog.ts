/**
 * server/src/models/requestLog.ts
 *
 * רשומה אחת לכל בקשה שעוברת בפרוקסי (/v1/**):
 * השאלה, החלטת הסינון, התשובה מהספק והשגיאה (אם הייתה).
 *
 * - requestId זהה ל-requestId שמופיע בכל שורות הלוג של אותה בקשה
 *   (ApplicationLog) ובכותרת התשובה x-request-id.
 * - providerResponseId זהה ל-UsageLog.requestId — כך מחברים לעלות ולטוקנים.
 * - התוכן (question / answer) מקוצר, ונמחק אוטומטית אחרי 30 יום (TTL).
 */

import mongoose from "mongoose";

export const REQUEST_LOG_STATUSES = [
  "completed",
  "blocked",
  "filter_error",
  "error",
] as const;
export type RequestLogStatus = (typeof REQUEST_LOG_STATUSES)[number];

export const REQUEST_LOG_APIS = ["chat", "responses", "anthropic", "image"] as const;
export type RequestLogApi = (typeof REQUEST_LOG_APIS)[number];

export type FilterVerdict = "allowed" | "blocked" | "error" | "skipped";
export type TraceStage = "setup" | "filter" | "provider" | "stream";

export interface RequestLogFilter {
  verdict: FilterVerdict;
  /** ההסבר של ה-judge במילים. */
  judgeReason?: string;
  /** הודעת השגיאה כשה-judge נכשל. */
  error?: string;
  judgeModel?: string;
  latencyMs?: number;
}

export interface RequestLogData {
  requestId: string;
  userId?: mongoose.Types.ObjectId;
  profileId?: mongoose.Types.ObjectId;
  api: RequestLogApi;
  model?: string;
  stream: boolean;
  status: RequestLogStatus;
  question?: string;
  filter?: RequestLogFilter;
  answer?: string;
  providerResponseId?: string;
  error?: { stage: TraceStage; message: string };
  durationMs: number;
  expiresAt: Date;
}

export type RequestLogDoc = mongoose.Document & RequestLogData;

const RequestLogSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: "AIProfile" },
    api: { type: String, enum: REQUEST_LOG_APIS, required: true },
    model: String,
    stream: { type: Boolean, default: false },
    status: { type: String, enum: REQUEST_LOG_STATUSES, required: true },
    question: String,
    filter: {
      verdict: { type: String, enum: ["allowed", "blocked", "error", "skipped"] },
      judgeReason: String,
      error: String,
      judgeModel: String,
      latencyMs: Number,
    },
    answer: String,
    providerResponseId: { type: String, index: true },
    error: {
      stage: { type: String, enum: ["setup", "filter", "provider", "stream"] },
      message: String,
    },
    durationMs: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

RequestLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
RequestLogSchema.index({ userId: 1, createdAt: -1 });
RequestLogSchema.index({ status: 1, createdAt: -1 });

export const RequestLog = mongoose.model<RequestLogDoc>(
  "RequestLog",
  RequestLogSchema,
);
