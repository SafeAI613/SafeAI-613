import { Outlet, useLocation } from "react-router-dom";
import "../styles/landing-page-v2.css";
import "../styles/dashboard-pages.css";
import { DocIcon, MailIcon, UserIcon, KeyIcon, BookIcon, ClipboardIcon } from "../features/landing/icons";
import ErrorBoundary from "../components/ErrorBoundary";
import { useAuth } from "../context/authStore";
import DashboardSidebar from "../features/dashboard/DashboardSidebar";
import { ROUTES } from "../router/paths";

// System admins manage the platform from /platform/admin; everyone else has a
// personal area (API keys are one of its tabs).
function sidebarItems(isAdmin: boolean) {
  return [
    { key: "docs", icon: <DocIcon size={18} />, label: "תיעוד", path: ROUTES.hub.articles },
    isAdmin
      ? { key: "admin", icon: <UserIcon size={18} />, label: "ניהול מערכת", path: ROUTES.platform.admin }
      : { key: "personal-area", icon: <KeyIcon size={18} />, label: "אזור אישי ומפתחות API", path: ROUTES.platform.account },
    { key: "changelog", icon: <ClipboardIcon size={18} />, label: "מה חדש", path: ROUTES.platform.changelog },
    { key: "contact", icon: <MailIcon size={18} />, label: "צור קשר", path: "/contact" },
  ];
}

/** Shell for every SafeAI Platform page: the Platform sidebar plus the page content. Mounted behind ProtectedRoute. */
export default function PlatformLayout() {
  const { pathname } = useLocation();
  const { userRole } = useAuth();

  return (
    <div className="landing-v2 dash-page theme-platform" dir="rtl">
      <DashboardSidebar
        homeLabel="SafeAI Platform"
        homePath={ROUTES.platform.dashboard}
        items={sidebarItems(userRole === "admin")}
        crossLink={{ icon: <BookIcon size={18} />, label: "SafeAI Hub", path: ROUTES.hub.root }}
      />

      <div className="dash-main">
        {/* Resets on navigation, so a crashed page recovers when the user moves on */}
        <ErrorBoundary resetKey={pathname}>
          <Outlet />
        </ErrorBoundary>
      </div>
    </div>
  );
}
