import { Link, Outlet, useLocation } from "react-router-dom";
import "../styles/landing-page-v2.css";
import "../styles/dashboard-pages.css";
import { useAuth } from "../context/authStore";
import { ChatIcon, BookIcon, BoxIcon, CompassIcon, ClipboardIcon, DocIcon, NewsIcon, ShieldIcon, UserIcon } from "../features/landing/icons";
import ErrorBoundary from "../components/ErrorBoundary";
import DashboardSidebar from "../features/dashboard/DashboardSidebar";
import { ROUTES, loginPath } from "../router/paths";

const SIDEBAR_ITEMS = [
  { key: "news", icon: <NewsIcon size={18} />, label: "חדשות AI", path: ROUTES.hub.news },
  { key: "forum", icon: <ChatIcon size={18} />, label: "פורום", path: ROUTES.hub.forum },
  { key: "articles", icon: <DocIcon size={18} />, label: "מאמרים", path: ROUTES.hub.articles },
  { key: "courses", icon: <BookIcon size={18} />, label: "קורסים", path: ROUTES.hub.courses },
  { key: "guides", icon: <CompassIcon size={18} />, label: "מדריכים מומלצים", path: ROUTES.hub.guides },
  { key: "projects", icon: <ClipboardIcon size={18} />, label: "לוח פרויקטים", path: ROUTES.hub.projects },
  { key: "agents", icon: <BoxIcon size={18} />, label: "סוכנים", path: ROUTES.hub.agents },
];

/**
 * Shell for every SafeAI Hub page: the Hub sidebar plus the page content.
 * The Hub is public for reading, so a guest gets a login link that returns
 * them to the page they were on; actions inside pages require login.
 */
export default function HubLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const guestLogin = !isAuthenticated && (
    <Link to={loginPath(location.pathname + location.search + location.hash)} className="dash-sidebar-item">
      <UserIcon size={18} />
      <span>התחברות</span>
    </Link>
  );

  return (
    <div className="landing-v2 dash-page theme-hub" dir="rtl">
      <DashboardSidebar
        homeLabel="SafeAI Hub"
        homePath={ROUTES.hub.root}
        items={SIDEBAR_ITEMS}
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
