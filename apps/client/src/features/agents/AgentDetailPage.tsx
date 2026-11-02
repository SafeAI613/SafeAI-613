/**
 * client/src/features/agents/AgentDetailPage.tsx
 *
 * Full detail view for a single agent.
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLocale } from "../../i18n/useLocale";
import { fetchAgentById, recordDownload } from "./api/agentsApi";
import type { Agent } from "./types/agent.types";
import AgentIcon from "./AgentIcon";
import { ROUTES } from "../../router/paths";

export default function AgentDetailPage() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetchAgentById(id)
      .then((res) => setAgent(res.agent))
      .catch(() => setError(t("agents.detail.notFound")))
      .finally(() => setLoading(false));
  }, [id, t]);

  const handleDownload = async () => {
    if (!agent) return;
    await recordDownload(agent._id).catch(() => {});
    window.open(agent.download_url, "_blank", "noopener,noreferrer");
  };

  if (loading) return <div className="agents-loading"><div className="agents-spinner" /><p>{t("agents.detail.loading")}</p></div>;
  if (error || !agent) return <div className="agents-error">{error || t("agents.detail.unknownError")}</div>;

  const specs = agent.technical_specifications;

  return (
    <div className="agent-detail">
      <button className="agent-back-btn" onClick={() => navigate(ROUTES.hub.agents)}>
        {t("agents.detail.backToGallery")}
      </button>

      {/* Header */}
      <div className="agent-detail-header">
        <div className="agent-detail-icon">
          <AgentIcon svg={agent.icon} fallback="🤖" />
        </div>
        <div className="agent-detail-meta">
          <h1>{agent.name}</h1>
          <p className="agent-detail-version">
            v{agent.version} &nbsp;|&nbsp; {t("agents.detail.by")} <strong>{agent.creator_name}</strong>
          </p>
          {agent.ratingCount > 0 && (
            <p className="agent-detail-rating">
              ⭐ {agent.rating.toFixed(1)} ({t("agents.detail.ratingsCount", { count: agent.ratingCount })})
            </p>
          )}
          <button className="agent-download-btn" onClick={handleDownload}>
            ⬇ {t("agents.detail.downloadNow")}
          </button>
        </div>
      </div>

      {/* Description */}
      <section className="agent-detail-section">
        <h2>📝 {t("agents.detail.description")}</h2>
        <p>{agent.description}</p>
      </section>

      {/* Target audience */}
      {agent.target_audience && (
        <section className="agent-detail-section">
          <h2>🎯 {t("agents.detail.targetAudience")}</h2>
          <p>{agent.target_audience}</p>
        </section>
      )}

      {/* Professional fields */}
      {agent.professional_fields?.length > 0 && (
        <section className="agent-detail-section">
          <h2>🏢 {t("agents.detail.professionalFields")}</h2>
          <div className="agent-badges-row">
            {agent.professional_fields.map((f) => (
              <span key={f} className="agent-badge agent-badge--field">{f}</span>
            ))}
          </div>
        </section>
      )}

      {/* Tasks */}
      {agent.tasks_capable_of_performing?.length > 0 && (
        <section className="agent-detail-section">
          <h2>⚙️ {t("agents.detail.tasks")}</h2>
          <div className="agent-badges-row">
            {agent.tasks_capable_of_performing.map((task) => (
              <span key={task} className="agent-badge agent-badge--task">{task}</span>
            ))}
          </div>
        </section>
      )}

      {/* Example questions */}
      {agent.examples_of_suitable_questions?.length > 0 && (
        <section className="agent-detail-section">
          <h2>💬 {t("agents.detail.exampleQuestions")}</h2>
          <ul className="agent-examples-list">
            {agent.examples_of_suitable_questions.map((q, i) => (
              <li key={i}>"{q}"</li>
            ))}
          </ul>
        </section>
      )}

      {/* Technical specs */}
      {specs && (
        <section className="agent-detail-section">
          <h2>🛠 {t("agents.detail.techSpecs")}</h2>
          <div className="agent-tech-grid">
            {specs.framework && <div className="agent-tech-item"><span>Framework</span><strong>{specs.framework}</strong></div>}
            {specs.llm_provider && <div className="agent-tech-item"><span>LLM Provider</span><strong>{specs.llm_provider}</strong></div>}
            {specs.supported_models?.length > 0 && (
              <div className="agent-tech-item agent-tech-item--wide">
                <span>{t("agents.detail.supportedModels")}</span>
                <strong>{specs.supported_models.join(", ")}</strong>
              </div>
            )}
            {specs.required_permissions?.length > 0 && (
              <div className="agent-tech-item agent-tech-item--wide">
                <span>{t("agents.detail.requiredPermissions")}</span>
                <strong>{specs.required_permissions.join(", ")}</strong>
              </div>
            )}
          </div>
          {specs.features_enabled && (
            <div className="agent-features-row">
              <FeatureBadge label="RAG" enabled={specs.features_enabled.rag} />
              <FeatureBadge label="Web Search" enabled={specs.features_enabled.web_search} />
              <FeatureBadge label="Code Execution" enabled={specs.features_enabled.code_execution} />
              <FeatureBadge label="MCP" enabled={specs.features_enabled.mcp_support} />
            </div>
          )}
        </section>
      )}

      {/* Links */}
      <section className="agent-detail-section">
        <h2>🔗 {t("agents.detail.links")}</h2>
        <div className="agent-links">
          <a href={agent.repository_url} target="_blank" rel="noopener noreferrer">
            📁 GitHub Repository
          </a>
          {agent.release_date && <span>📅 {t("agents.detail.releaseDate", { date: agent.release_date })}</span>}
          {agent.contact_information && (
            <a href={`mailto:${agent.contact_information}`}>
              📧 {agent.contact_information}
            </a>
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="agent-detail-section agent-detail-stats">
        <span>⬇ {t("agents.detail.downloadsCount", { count: agent.downloads, formatted: agent.downloads.toLocaleString(locale) })}</span>
        <span>📦 {t("agents.detail.versionLabel", { version: agent.version })}</span>
      </section>
    </div>
  );
}

function FeatureBadge({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <span className={`agent-feature-badge ${enabled ? "agent-feature-badge--on" : "agent-feature-badge--off"}`}>
      {enabled ? "✅" : "❌"} {label}
    </span>
  );
}
