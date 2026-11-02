/**
 * server/src/controllers/requestLogController.ts
 *
 * צפייה ברשומות המעקב של הפרוקסי (RequestLog) — לאדמין בלבד.
 *
 * GET /admin/request-logs
 *   query: status? (completed|blocked|filter_error|error), api? (chat|responses|anthropic|image),
 *          userId?, before? (ISO date, ל-pagination), limit? (1-100, ברירת מחדל 50)
 *   200: { items: RequestLog[], nextBefore: string | null }
 *   400: { error } — פרמטר לא תקין
 *
 * GET /admin/request-logs/:requestId
 *   200: RequestLog   404: { error }
 */

import { Request, Response } from "express";
import mongoose from "mongoose";
import logger from "../logger";
import {
  REQUEST_LOG_APIS,
  REQUEST_LOG_STATUSES,
  RequestLogApi,
  RequestLogStatus,
} from "../models/requestLog";
import {
  findRequestLogByRequestId,
  findRequestLogs,
  RequestLogQuery,
} from "../repositories/requestLogRepository";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

/** מחזיר את השאילתה, או הודעת שגיאה אם פרמטר לא תקין. */
export function parseRequestLogQuery(
  q: Request["query"],
): { query: RequestLogQuery } | { error: string } {
  const query: RequestLogQuery = { limit: DEFAULT_LIMIT };

  if (q.status !== undefined) {
    if (!isOneOf<RequestLogStatus>(REQUEST_LOG_STATUSES, q.status)) return { error: "Invalid status" };
    query.status = q.status;
  }
  if (q.api !== undefined) {
    if (!isOneOf<RequestLogApi>(REQUEST_LOG_APIS, q.api)) return { error: "Invalid api" };
    query.api = q.api;
  }
  if (q.userId !== undefined) {
    if (typeof q.userId !== "string" || !mongoose.Types.ObjectId.isValid(q.userId)) {
      return { error: "Invalid userId" };
    }
    query.userId = q.userId;
  }
  if (q.before !== undefined) {
    const before = new Date(String(q.before));
    if (Number.isNaN(before.getTime())) return { error: "Invalid before" };
    query.before = before;
  }
  if (q.limit !== undefined) {
    const limit = Number(q.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      return { error: `limit must be an integer between 1 and ${MAX_LIMIT}` };
    }
    query.limit = limit;
  }

  return { query };
}

export async function listRequestLogs(req: Request, res: Response) {
  const parsed = parseRequestLogQuery(req.query);
  if ("error" in parsed) return res.status(400).json({ error: parsed.error });

  try {
    const items = await findRequestLogs(parsed.query);
    const last = items[items.length - 1] as { createdAt?: Date } | undefined;
    const nextBefore =
      items.length === parsed.query.limit && last?.createdAt
        ? new Date(last.createdAt).toISOString()
        : null;
    return res.json({ items, nextBefore });
  } catch (err) {
    logger.error("Failed to list request logs", { error: (err as Error).message });
    return res.status(500).json({ error: "Failed to list request logs" });
  }
}

export async function getRequestLog(req: Request, res: Response) {
  try {
    const log = await findRequestLogByRequestId(String(req.params.requestId));
    if (!log) return res.status(404).json({ error: "Request log not found" });
    return res.json(log);
  } catch (err) {
    logger.error("Failed to get request log", { error: (err as Error).message });
    return res.status(500).json({ error: "Failed to get request log" });
  }
}
