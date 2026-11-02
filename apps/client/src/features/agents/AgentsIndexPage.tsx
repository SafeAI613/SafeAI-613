/**
 * client/src/features/agents/AgentsIndexPage.tsx
 *
 * Layout wrapper for the entire agents marketplace feature.
 * Renders tab navigation + outlet for sub-pages.
 * Registered in AppRouter as the parent route for /hub/agents/*
 */

import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../../styles/agents.css";
import { ROUTES } from "../../router/paths";
import { useLocale } from "../../i18n/useLocale";

const TABS = [
  { to: ROUTES.hub.agents, labelKey: "agents.tabs.gallery", end: true },
  { to: ROUTES.hub.agentsSubmit, labelKey: "agents.tabs.submit" },
  { to: ROUTES.hub.agentsStats, labelKey: "agents.tabs.stats" },
  { to: ROUTES.hub.agentsDownload, labelKey: "agents.tabs.desktop" },
];

export default function AgentsIndexPage() {
  const { t } = useTranslation();
  const { dir } = useLocale();
  return (
    <div className="agents-layout" dir={dir}>
      <div className="agents-header">
        <h1 className="agents-title">{t("agents.title")}</h1>
        <p className="agents-subtitle">{t("agents.subtitle")}</p>
      </div>

      <nav className="agents-tabs">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              isActive ? "agents-tab agents-tab--active" : "agents-tab"
            }
          >
            {t(tab.labelKey)}
          </NavLink>
        ))}
      </nav>

      <div className="agents-content">
        <Outlet />
      </div>
    </div>
  );
}
