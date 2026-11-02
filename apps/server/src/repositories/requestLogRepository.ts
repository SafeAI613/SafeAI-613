/**
 * server/src/repositories/requestLogRepository.ts
 *
 * גישה לנתונים של RequestLog.
 */

import { RequestLog, RequestLogData, RequestLogStatus, RequestLogApi } from "../models/requestLog";

export async function createRequestLog(data: RequestLogData) {
  return RequestLog.create(data);
}

export interface RequestLogQuery {
  status?: RequestLogStatus;
  api?: RequestLogApi;
  userId?: string;
  /** מחזיר רשומות שנוצרו לפני התאריך הזה (pagination לפי זמן). */
  before?: Date;
  limit: number;
}

export async function findRequestLogs(query: RequestLogQuery) {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.api) filter.api = query.api;
  if (query.userId) filter.userId = query.userId;
  if (query.before) filter.createdAt = { $lt: query.before };

  return RequestLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(query.limit)
    .lean();
}

export async function findRequestLogByRequestId(requestId: string) {
  return RequestLog.findOne({ requestId }).lean();
}
