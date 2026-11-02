/**
 * client/src/features/agents/AgentsMarketplace.tsx
 *
 * Main gallery page — grid of agent cards with search and filters.
 */

import { useState, useEffect, useCallback } from "react";
import { generatePath, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchAgents } from "./api/agentsApi";
import type { Agent, AgentFilters } from "./types/agent.types";
import AgentIcon from "./AgentIcon";
import { ROUTES } from "../../router/paths";
import { useLocale } from "../../i18n/useLocale";

const SORT_OPTIONS = [
  { value: "downloads", labelKey: "agents.marketplace.sort.downloads" },
  { value: "rating", labelKey: "agents.marketplace.sort.rating" },
  { value: "newest", labelKey: "agents.marketplace.sort.newest" },
];

// Values are sent to the server as-is; only the labels are translated.
const FIELD_OPTIONS = [
  { value: "Financial Management", labelKey: "agents.fields.financialManagement" },
  { value: "Legal", labelKey: "agents.fields.legal" },
  { value: "Medical", labelKey: "agents.fields.medical" },
  { value: "Education", labelKey: "agents.fields.education" },
  { value: "Business Automation", labelKey: "agents.fields.businessAutomation" },
  { value: "Software Development", labelKey: "agents.fields.softwareDevelopment" },
];

export default function AgentsMarketplace() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<AgentFilters>({
    search: "",
    professional_field: "",
    task: "",
    framework: "",
    sortBy: "downloads",
  });
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchAgents({ ...filters, page });
      setAgents(res.agents);
      setTotal(res.total);
    } catch {
      setError(t("agents.marketplace.loadError"));
    } finally {
      setLoading(false);
    }
  }, [filters, page, t]);

  useEffect(() => {
    const timer = setTimeout(load, filters.search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [load, filters.search]);

  const setFilter = (key: keyof AgentFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  return (
    <div className="agents-marketplace">
      {/* Search + Filters */}
      <div className="agents-filters-bar">
        <div className="agents-search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            className="agents-search-input"
            type="text"
            placeholder={t("agents.marketplace.searchPlaceholder")}
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
          />
        </div>

        <div className="agents-filter-row">
          <select
            value={filters.professional_field}
            onChange={(e) => setFilter("professional_field", e.target.value)}
            className="agents-filter-select"
          >
            <option value="">{t("agents.marketplace.allFields")}</option>
            {FIELD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
            ))}
          </select>

          <select
            value={filters.framework}
            onChange={(e) => setFilter("framework", e.target.value)}
            className="agents-filter-select"
          >
            <option value="">{t("agents.marketplace.allFrameworks")}</option>
            <option value="LangGraph">LangGraph</option>
            <option value="CrewAI">CrewAI</option>
            <option value="AutoGen">AutoGen</option>
            <option value="LangChain">LangChain</option>
            <option value="Custom">Custom</option>
          </select>

          <select
            value={filters.sortBy}
            onChange={(e) => setFilter("sortBy", e.target.value as AgentFilters["sortBy"])}
            className="agents-filter-select"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      {!loading && (
        <p className="agents-results-count">
          {t("agents.marketplace.resultsCount", { count: total })}
        </p>
      )}

      {/* Error */}
      {error && <div className="agents-error">{error}</div>}

      {/* Grid */}
      {loading ? (
        <div className="agents-loading">
          <div className="agents-spinner" />
          <p>{t("agents.marketplace.loading")}</p>
        </div>
      ) : agents.length === 0 ? (
        <div className="agents-empty">
          <span>🤖</span>
          <p>{t("agents.marketplace.empty")}</p>
        </div>
      ) : (
        <div className="agents-grid">
          {agents.map((agent) => (
            <div
              key={agent._id}
              className="agent-card"
              onClick={() => navigate(generatePath(ROUTES.hub.agent, { id: agent._id }))}
            >
              <div className="agent-card-icon">
                <AgentIcon svg={agent.icon} />
              </div>

              <div className="agent-card-body">
                <h3 className="agent-card-name">{agent.name}</h3>
                <p className="agent-card-creator">{t("agents.byCreator", { name: agent.creator_name })}</p>
                <p className="agent-card-desc">{agent.description}</p>

                <div className="agent-card-tags">
                  {agent.professional_fields.slice(0, 2).map((f) => (
                    <span key={f} className="agent-badge agent-badge--field">{f}</span>
                  ))}
                  {agent.technical_specifications?.framework && (
                    <span className="agent-badge agent-badge--framework">
                      {agent.technical_specifications.framework}
                    </span>
                  )}
                </div>
              </div>

              <div className="agent-card-footer">
                <span className="agent-stat">⬇ {agent.downloads.toLocaleString(locale)}</span>
                {agent.ratingCount > 0 && (
                  <span className="agent-stat">⭐ {agent.rating.toFixed(1)}</span>
                )}
                <button className="agent-btn-details">{t("agents.marketplace.moreDetails")}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 12 && (
        <div className="agents-pagination">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>{t("agents.marketplace.prev")}</button>
          <span>{t("agents.marketplace.page", { page })}</span>
          <button disabled={agents.length < 12} onClick={() => setPage((p) => p + 1)}>{t("agents.marketplace.next")}</button>
        </div>
      )}
    </div>
  );
}
