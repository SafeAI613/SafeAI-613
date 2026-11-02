/**
 * server/src/services/trace/requestTrace.ts
 *
 * RequestTrace — אוסף את כל מה שקרה בבקשה אחת לפרוקסי, ושומר רשומת
 * RequestLog אחת בסוף: שאלה → החלטת סינון → תשובה / שגיאה.
 *
 * שימוש (ראו withTrace ב-proxyService):
 *   const trace = new RequestTrace({ api, user, body });
 *   trace.recordFilter(text, evaluation);    // בתוך filterInput
 *   trace.setStage("provider");              // לפני הקריאה לספק
 *   trace.recordAnswer(extractAnswer(...));   // אחרי תשובה
 *   trace.fail(err);                          // בשגיאה
 *   await trace.save();                       // תמיד, פעם אחת
 *
 * save() לעולם לא זורק — כשל בכתיבת המעקב לא יפיל בקשה של משתמש.
 */

import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import logger, { requestContext } from "../../logger";
import {
  RequestLogApi,
  RequestLogData,
  RequestLogFilter,
  RequestLogStatus,
  TraceStage,
} from "../../models/requestLog";
import { createRequestLog } from "../../repositories/requestLogRepository";
import type { EvaluateResult } from "../../workflows/input/evaluate";
import { ExtractedAnswer, SSEAnswerCollector } from "./answerExtractor";

/** אורך מקסימלי לשאלה / לתשובה שנשמרות. */
export const MAX_CONTENT_CHARS = 2000;
const RETENTION_DAYS = 30;

/** REQUEST_LOG_STORE_CONTENT=false → נשמרים רק מטא-דאטה, בלי תוכן השאלה והתשובה. */
function shouldStoreContent(): boolean {
  return process.env.REQUEST_LOG_STORE_CONTENT !== "false";
}

function truncate(text: string, max = MAX_CONTENT_CHARS): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function toObjectId(value: unknown): mongoose.Types.ObjectId | undefined {
  const str = value?.toString();
  return str && mongoose.Types.ObjectId.isValid(str)
    ? new mongoose.Types.ObjectId(str)
    : undefined;
}

/** מתרגם את תוצאת ה-input workflow לשדות הסינון שנשמרים. */
function toFilterRecord(result: EvaluateResult): RequestLogFilter {
  const last = result.trace?.[result.trace.length - 1];
  const meta = (last?.metadata ?? {}) as Record<string, unknown>;

  const record: RequestLogFilter = {
    verdict: result.errored ? "error" : result.allowed ? "allowed" : "blocked",
    reason: result.reason,
  };
  if (typeof meta.judgeReason === "string") record.judgeReason = meta.judgeReason;
  if (typeof meta.judgeModel === "string") record.judgeModel = meta.judgeModel;
  if (typeof meta.latencyMs === "number") record.latencyMs = meta.latencyMs;
  if (result.errored && last?.reason) record.error = last.reason;
  return record;
}

interface TraceInit {
  api: RequestLogApi;
  user: { _id?: unknown; profileId?: unknown } | undefined;
  body: { model?: unknown; stream?: unknown } | undefined;
}

export class RequestTrace {
  readonly requestId: string;
  private readonly startedAt = Date.now();
  private readonly data: Omit<RequestLogData, "status" | "durationMs" | "expiresAt">;
  private stage: TraceStage = "setup";
  private saved = false;

  constructor({ api, user, body }: TraceInit) {
    this.requestId = requestContext.getStore()?.requestId ?? randomUUID();
    this.data = {
      requestId: this.requestId,
      api,
      stream: body?.stream === true,
    };
    const userId = toObjectId(user?._id);
    const profileId = toObjectId(user?.profileId);
    if (userId) this.data.userId = userId;
    if (profileId) this.data.profileId = profileId;
    if (typeof body?.model === "string") this.data.model = body.model;
  }

  setStage(stage: TraceStage): void {
    this.stage = stage;
  }

  /** evaluation === null → לא היה טקסט משתמש לבדוק. */
  recordFilter(text: string, evaluation: EvaluateResult | null): void {
    if (text && shouldStoreContent()) this.data.question = truncate(text);
    this.data.filter = evaluation ? toFilterRecord(evaluation) : { verdict: "skipped" };
  }

  /** true אם הבקשה נחסמה בשלב הסינון (מדיניות או שגיאה). */
  get isBlocked(): boolean {
    const verdict = this.data.filter?.verdict;
    return verdict === "blocked" || verdict === "error";
  }

  recordAnswer(answer: ExtractedAnswer): void {
    if (answer.text && shouldStoreContent()) this.data.answer = truncate(answer.text);
    if (answer.providerResponseId) this.data.providerResponseId = answer.providerResponseId;
  }

  fail(err: unknown): void {
    this.data.error = {
      stage: this.stage,
      message: truncate(err instanceof Error ? err.message : String(err), 1000),
    };
  }

  private status(): RequestLogStatus {
    if (this.data.error) return "error";
    if (this.data.filter?.verdict === "error") return "filter_error";
    if (this.data.filter?.verdict === "blocked") return "blocked";
    return "completed";
  }

  /** שומר את הרשומה. בטוח לקריאה כפולה; לעולם לא זורק. */
  async save(): Promise<void> {
    if (this.saved) return;
    this.saved = true;

    const record: RequestLogData = {
      ...this.data,
      status: this.status(),
      durationMs: Date.now() - this.startedAt,
      expiresAt: new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000),
    };

    logger.info(
      JSON.stringify({
        event: "request.completed",
        requestId: record.requestId,
        api: record.api,
        model: record.model,
        status: record.status,
        filter: record.filter?.verdict,
        errorStage: record.error?.stage,
        durationMs: record.durationMs,
      }),
    );

    try {
      await createRequestLog(record);
    } catch (err) {
      logger.error(
        JSON.stringify({
          event: "request_log.save_failed",
          requestId: record.requestId,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }

  /**
   * עוטף stream של תשובה: מעביר כל chunk ללקוח בלי שינוי, צובר את טקסט
   * התשובה, ושומר את הרשומה כשה-stream מסתיים, נכשל או מבוטל ע"י הלקוח.
   */
  tapStream(source: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
    const reader = source.getReader();
    const decoder = new TextDecoder();
    const collector = new SSEAnswerCollector(this.data.api);
    this.setStage("stream");

    const finish = () => {
      this.recordAnswer(collector.result());
      void this.save();
    };

    return new ReadableStream<Uint8Array>({
      pull: async (controller) => {
        try {
          const { done, value } = await reader.read();
          if (done) {
            finish();
            controller.close();
            return;
          }
          collector.push(decoder.decode(value, { stream: true }));
          controller.enqueue(value);
        } catch (err) {
          this.fail(err);
          finish();
          controller.error(err);
        }
      },
      cancel: async (reason) => {
        this.fail(new Error(`client cancelled stream${reason ? `: ${String(reason)}` : ""}`));
        finish();
        await reader.cancel(reason);
      },
    });
  }
}
