import { Outlet, useLocation } from "react-router-dom";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import "../styles/landing-page-v2.css";
import "../styles/dashboard-pages.css";
import { DocIcon, MailIcon, UserIcon, KeyIcon, BookIcon, ClipboardIcon } from "../features/landing/icons";
import ErrorBoundary from "../components/ErrorBoundary";
import { useAuth } from "../context/authStore";
import DashboardSidebar from "../features/dashboard/DashboardSidebar";
import { ROUTES } from "../router/paths";
import { useLocale } from "../i18n/useLocale";

// System admins manage the platform from /platform/admin; everyone else has a
// personal area (API keys are one of its tabs).
function sidebarItems(isAdmin: boolean, t: TFunction) {
  return [
    { key: "docs", icon: <DocIcon size={18} />, label: t("shell.sidebar.platform.docs"), path: ROUTES.hub.articles },
    isAdmin
      ? { key: "admin", icon: <UserIcon size={18} />, label: t("shell.sidebar.platform.admin"), path: ROUTES.platform.admin }
      : {
          key: "personal-area",
          icon: <KeyIcon size={18} />,
          label: t("shell.sidebar.platform.personalArea"),
          path: ROUTES.platform.account,
        },
    { key: "changelog", icon: <ClipboardIcon size={18} />, label: t("shell.sidebar.platform.changelog"), path: ROUTES.platform.changelog },
    { key: "contact", icon: <MailIcon size={18} />, label: t("shell.sidebar.platform.contact"), path: "/contact" },
  ];
}

/** Shell for every SafeAI Platform page: the Platform sidebar plus the page content. Mounted behind ProtectedRoute. */
export default function PlatformLayout() {
  const { pathname } = useLocation();
  const { userRole } = useAuth();
  const { t } = useTranslation();
  const { dir } = useLocale();

  return (
    <div className="landing-v2 dash-page theme-platform" dir={dir}>
      <DashboardSidebar
        homeLabel="SafeAI Platform"
        homePath={ROUTES.platform.dashboard}
        items={sidebarItems(userRole === "admin", t)}
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
