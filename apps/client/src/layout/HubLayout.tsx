import { Link, Outlet, useLocation } from "react-router-dom";
import "../styles/landing-page-v2.css";
import "../styles/dashboard-pages.css";
import { useAuth } from "../context/authStore";
import { ChatIcon, BookIcon, CompassIcon, ClipboardIcon, NewsIcon, ShieldIcon, UserIcon } from "../features/landing/icons";
import DashboardSidebar from "../features/dashboard/DashboardSidebar";
import { ROUTES, loginPath } from "../router/paths";

// TODO(routing): these still point at the pre-split URLs; they move under
// /hub/* together with their pages.
const SIDEBAR_ITEMS = [
  { key: "forum", icon: <ChatIcon size={18} />, label: "פורום", path: "/forum" },
  { key: "courses", icon: <BookIcon size={18} />, label: "קורסים", path: "/courses" },
  { key: "guides", icon: <CompassIcon size={18} />, label: "מדריכים מומלצים", path: "/recommended-guides" },
  { key: "tenders", icon: <ClipboardIcon size={18} />, label: "לוח פרויקטים", path: "/tender-board" },
  { key: "news", icon: <NewsIcon size={18} />, label: "חדשות AI", path: "/ai-news" },
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
        <Outlet />
      </div>
    </div>
  );
}
