/**
 * RequestLogsList — ניטור בקשות ה-AI שעברו בפרוקסי (אדמין בלבד).
 *
 * כל שורה היא RequestLog אחד מהשרת: השאלה שנבדקה, החלטת הסינון,
 * התשובה מהספק ושגיאה (אם הייתה). לחיצה על שורה פותחת את הפרטים.
 *
 * API (ראו server/src/controllers/requestLogController.ts):
 *   GET /admin/request-logs?status&api&before&limit → { items, nextBefore }
 *   GET /admin/request-logs/:requestId              → RequestLog | 404
 */

import { Fragment, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiCall, API_ENDPOINTS } from "../../config/api";
import { useLocale } from "../../i18n/useLocale";

type RequestLogStatus = "completed" | "blocked" | "filter_error" | "error";
type RequestLogApi = "chat" | "responses" | "anthropic" | "image";
type FilterVerdict = "allowed" | "blocked" | "error" | "skipped";

interface RequestLogUser {
  _id: string;
  name?: string;
  email?: string;
}

interface RequestLog {
  _id: string;
  requestId: string;
  /** מאוכלס ע"י השרת; null אם המשתמש נמחק. */
  userId?: RequestLogUser | string | null;
  api: RequestLogApi;
  model?: string;
  stream: boolean;
  status: RequestLogStatus;
  question?: string;
  filter?: {
    verdict: FilterVerdict;
    judgeReason?: string;
    error?: string;
    judgeModel?: string;
    latencyMs?: number;
  };
  answer?: string;
  providerResponseId?: string;
  error?: { stage: string; message: string };
  durationMs: number;
  createdAt: string;
}

interface RequestLogPage {
  items: RequestLog[];
  nextBefore: string | null;
}

const STATUSES: RequestLogStatus[] = ["completed", "blocked", "filter_error", "error"];
const APIS: RequestLogApi[] = ["chat", "responses", "anthropic", "image"];

const STATUS_BADGE: Record<RequestLogStatus, string> = {
  completed: "badge badge-success",
  blocked: "badge badge-warning",
  filter_error: "badge badge-danger",
  error: "badge badge-danger",
};

const PAGE_SIZE = 50;
const PREVIEW_CHARS = 80;

interface Filters {
  status: string;
  api: string;
}

const EMPTY_FILTERS: Filters = { status: "", api: "" };

function preview(text: string | undefined): string {
  if (!text) return "—";
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > PREVIEW_CHARS ? `${oneLine.slice(0, PREVIEW_CHARS)}…` : oneLine;
}

function userLabel(user: RequestLog["userId"], unknown: string): string {
  if (user && typeof user === "object") return user.name || user.email || user._id;
  return typeof user === "string" ? user : unknown;
}

export default function RequestLogsList() {
  const { t } = useTranslation();
  const { locale } = useLocale();

  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // שדות הטופס, ומה שהוחל בפועל (רק לחיצה על "סנן" שולחת בקשה).
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [requestIdInput, setRequestIdInput] = useState("");
  const [lookupId, setLookupId] = useState<string | null>(null);

  const buildListUrl = useCallback(
    (before?: string) => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (applied.status) params.set("status", applied.status);
      if (applied.api) params.set("api", applied.api);
      if (before) params.set("before", before);
      return `${API_ENDPOINTS.requestLogs}?${params.toString()}`;
    },
    [applied],
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      setExpandedId(null);
      try {
        if (lookupId) {
          const log = await apiCall<RequestLog>(
            `${API_ENDPOINTS.requestLogs}/${encodeURIComponent(lookupId)}`,
          );
          if (!active) return;
          setLogs([log]);
          setNextBefore(null);
          setExpandedId(log._id);
        } else {
          const page = await apiCall<RequestLogPage>(buildListUrl());
          if (!active) return;
          setLogs(page.items);
          setNextBefore(page.nextBefore);
        }
      } catch (err) {
        if (!active) return;
        const status = (err as { status?: number }).status;
        setLogs([]);
        setNextBefore(null);
        setError(
          lookupId && status === 404
            ? t("requestLogs.notFound", { id: lookupId })
            : status === 403
              ? t("requestLogs.forbidden")
              : t("requestLogs.loadFailed"),
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [buildListUrl, lookupId, t]);

  const loadMore = async () => {
    if (!nextBefore) return;
    setLoadingMore(true);
    try {
      const page = await apiCall<RequestLogPage>(buildListUrl(nextBefore));
      setLogs((prev) => [...prev, ...page.items]);
      setNextBefore(page.nextBefore);
    } catch {
      setError(t("requestLogs.loadFailed"));
    } finally {
      setLoadingMore(false);
    }
  };

  const applyFilters = () => {
    setLookupId(null);
    setApplied(draft);
  };

  const resetFilters = () => {
    setDraft(EMPTY_FILTERS);
    setRequestIdInput("");
    setLookupId(null);
    setApplied(EMPTY_FILTERS);
  };

  const searchById = () => {
    const id = requestIdInput.trim();
    if (id) setLookupId(id);
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString(locale, { dateStyle: "short", timeStyle: "medium" });

  const renderDetails = (log: RequestLog) => (
    <div className="request-log-details">
      <dl className="request-log-meta">
        <dt>{t("requestLogs.requestId")}</dt>
        <dd><code dir="ltr">{log.requestId}</code></dd>
        <dt>{t("requestLogs.model")}</dt>
        <dd><bdi dir="ltr">{log.model || "—"} · {log.api}{log.stream ? " · stream" : ""}</bdi></dd>
        <dt>{t("requestLogs.duration")}</dt>
        <dd><bdi dir="ltr">{t("requestLogs.ms", { value: log.durationMs })}</bdi></dd>
        {log.providerResponseId && (
          <>
            <dt>{t("requestLogs.providerResponseId")}</dt>
            <dd><code dir="ltr">{log.providerResponseId}</code></dd>
          </>
        )}
      </dl>

      <section>
        <h4>{t("requestLogs.questionTitle")}</h4>
        <pre className="request-log-text" dir="auto">
          {log.question || t("requestLogs.noContent")}
        </pre>
      </section>

      <section>
        <h4>{t("requestLogs.filterTitle")}</h4>
        {log.filter ? (
          <p>
            <strong>{t(`requestLogs.verdict.${log.filter.verdict}`)}</strong>
            {log.filter.judgeReason && <> — <span dir="auto">{log.filter.judgeReason}</span></>}
            {log.filter.error && (
              <> — <span className="request-log-error" dir="ltr">{log.filter.error}</span></>
            )}
            {log.filter.judgeModel && (
              <bdi className="request-log-muted request-log-judge" dir="ltr">
                ({log.filter.judgeModel}
                {log.filter.latencyMs !== undefined && `, ${log.filter.latencyMs}ms`})
              </bdi>
            )}
          </p>
        ) : (
          <p>—</p>
        )}
      </section>

      {log.error && (
        <section>
          <h4>{t("requestLogs.errorTitle")}</h4>
          <p className="request-log-error">
            <strong>{t(`requestLogs.stage.${log.error.stage}`, log.error.stage)}</strong>:{" "}
            <span dir="ltr">{log.error.message}</span>
          </p>
        </section>
      )}

      <section>
        <h4>{t("requestLogs.answerTitle")}</h4>
        <pre className="request-log-text" dir="auto">
          {log.answer || t("requestLogs.noContent")}
        </pre>
      </section>
    </div>
  );

  return (
    <div className="admin-requests-container request-logs-page">
      <h2>{t("requestLogs.title")}</h2>
      <p className="request-log-muted">{t("requestLogs.subtitle")}</p>

      <div className="requests-filters-card">
        <div className="requests-filters-row">
          <select
            aria-label={t("requestLogs.statusColumn")}
            value={draft.status}
            onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
          >
            <option value="">{t("requestLogs.allStatuses")}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{t(`requestLogs.status.${s}`)}</option>
            ))}
          </select>

          <select
            aria-label={t("requestLogs.apiColumn")}
            value={draft.api}
            onChange={(e) => setDraft((d) => ({ ...d, api: e.target.value }))}
          >
            <option value="">{t("requestLogs.allApis")}</option>
            {APIS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <div className="requests-filters-buttons">
            <button className="btn btn-primary" type="button" onClick={applyFilters}>
              {t("inquiries.filterBtn")}
            </button>
            <button className="btn btn-secondary" type="button" onClick={resetFilters}>
              {t("inquiries.resetBtn")}
            </button>
          </div>
        </div>

        <form
          className="requests-filters-row request-logs-lookup"
          onSubmit={(e) => {
            e.preventDefault();
            searchById();
          }}
        >
          <input
            className="requests-filters-search"
            type="text"
            dir="ltr"
            placeholder={t("requestLogs.requestIdPlaceholder")}
            aria-label={t("requestLogs.requestId")}
            value={requestIdInput}
            onChange={(e) => setRequestIdInput(e.target.value)}
          />
          <button className="btn btn-secondary" type="submit" disabled={!requestIdInput.trim()}>
            {t("requestLogs.searchById")}
          </button>
        </form>
      </div>

      {loading ? (
        <p>{t("common.loading")}</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : logs.length === 0 ? (
        <p>{t("requestLogs.empty")}</p>
      ) : (
        <div className="request-logs-table-wrap">
          <table className="requests-table">
            <thead>
              <tr>
                <th>{t("requestLogs.timeColumn")}</th>
                <th>{t("requestLogs.userColumn")}</th>
                <th>{t("requestLogs.apiColumn")}</th>
                <th>{t("requestLogs.statusColumn")}</th>
                <th>{t("requestLogs.questionColumn")}</th>
                <th>{t("requestLogs.durationColumn")}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const expanded = expandedId === log._id;
                const toggle = () => setExpandedId(expanded ? null : log._id);
                return (
                  <Fragment key={log._id}>
                    <tr
                      className="request-log-row"
                      tabIndex={0}
                      aria-expanded={expanded}
                      onClick={toggle}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggle();
                        }
                      }}
                    >
                      <td className="request-log-nowrap">{formatTime(log.createdAt)}</td>
                      <td className="request-log-nowrap" dir="auto">
                        {userLabel(log.userId, t("requests.unknownValue"))}
                      </td>
                      <td dir="ltr">{log.api}</td>
                      <td className="request-log-nowrap">
                        <span className={STATUS_BADGE[log.status]}>
                          {t(`requestLogs.status.${log.status}`)}
                        </span>
                      </td>
                      <td dir="auto">{preview(log.question)}</td>
                      <td className="request-log-nowrap">
                        <bdi dir="ltr">{t("requestLogs.ms", { value: log.durationMs })}</bdi>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="request-log-details-row">
                        <td colSpan={6}>{renderDetails(log)}</td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          {nextBefore && (
            <div className="request-logs-more">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? t("common.loading") : t("requestLogs.loadMore")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
