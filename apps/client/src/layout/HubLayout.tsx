import { Link, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../styles/landing-page-v2.css";
import "../styles/dashboard-pages.css";
import { useAuth } from "../context/authStore";
import { ChatIcon, BookIcon, BoxIcon, CompassIcon, ClipboardIcon, DocIcon, NewsIcon, ShieldIcon, UserIcon } from "../features/landing/icons";
import ErrorBoundary from "../components/ErrorBoundary";
import DashboardSidebar from "../features/dashboard/DashboardSidebar";
import { ROUTES, loginPath } from "../router/paths";
import { useLocale } from "../i18n/useLocale";

// `labelKey` is resolved with t() at render time, so the sidebar follows the UI language.
const SIDEBAR_ITEMS = [
  { key: "news", icon: <NewsIcon size={18} />, labelKey: "shell.sidebar.hub.news", path: ROUTES.hub.news },
  { key: "forum", icon: <ChatIcon size={18} />, labelKey: "shell.sidebar.hub.forum", path: ROUTES.hub.forum },
  { key: "articles", icon: <DocIcon size={18} />, labelKey: "shell.sidebar.hub.articles", path: ROUTES.hub.articles },
  { key: "courses", icon: <BookIcon size={18} />, labelKey: "shell.sidebar.hub.courses", path: ROUTES.hub.courses },
  { key: "guides", icon: <CompassIcon size={18} />, labelKey: "shell.sidebar.hub.guides", path: ROUTES.hub.guides },
  { key: "projects", icon: <ClipboardIcon size={18} />, labelKey: "shell.sidebar.hub.projects", path: ROUTES.hub.projects },
  { key: "agents", icon: <BoxIcon size={18} />, labelKey: "shell.sidebar.hub.agents", path: ROUTES.hub.agents },
];

/**
 * Shell for every SafeAI Hub page: the Hub sidebar plus the page content.
 * The Hub is public for reading, so a guest gets a login link that returns
 * them to the page they were on; actions inside pages require login.
 */
export default function HubLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();
  const { dir } = useLocale();

  const guestLogin = !isAuthenticated && (
    <Link to={loginPath(location.pathname + location.search + location.hash)} className="dash-sidebar-item">
      <UserIcon size={18} />
      <span>{t("shell.sidebar.login")}</span>
    </Link>
  );

  return (
    <div className="landing-v2 dash-page theme-hub" dir={dir}>
      <DashboardSidebar
        homeLabel="SafeAI Hub"
        homePath={ROUTES.hub.root}
        items={SIDEBAR_ITEMS.map(({ labelKey, ...item }) => ({ ...item, label: t(labelKey) }))}
        crossLink={{ icon: <ShieldIcon size={18} />, label: "SafeAI Platform", path: ROUTES.platform.root }}
        footer={guestLogin}
      />

      <div className="dash-main">
        {/* Resets on navigation, so a crashed page recovers when the user moves on */}
        <ErrorBoundary resetKey={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </div>
    </div>
  );
}
