import { Outlet } from "react-router-dom";
import "../styles/landing-page-v2.css";
import "../styles/dashboard-pages.css";
import { DocIcon, MailIcon, UserIcon, KeyIcon, BookIcon } from "../features/landing/icons";
import DashboardSidebar from "../features/dashboard/DashboardSidebar";
import { ROUTES } from "../router/paths";

// TODO(routing): these still point at the pre-split URLs; they move under
// /platform/* together with their pages.
const SIDEBAR_ITEMS = [
  { key: "docs", icon: <DocIcon size={18} />, label: "תיעוד", path: "/docs" },
  { key: "api-keys", icon: <KeyIcon size={18} />, label: "מפתחות API", path: "/api-key-display" },
  { key: "personal-area", icon: <UserIcon size={18} />, label: "אזור אישי", path: "/safeai-ui" },
  { key: "contact", icon: <MailIcon size={18} />, label: "צור קשר", path: "/contact" },
];

/** Shell for every SafeAI Platform page: the Platform sidebar plus the page content. Mounted behind ProtectedRoute. */
export default function PlatformLayout() {
  return (
    <div className="landing-v2 dash-page theme-platform" dir="rtl">
      <DashboardSidebar
        homeLabel="SafeAI Platform"
        homePath={ROUTES.platform.dashboard}
        items={SIDEBAR_ITEMS}
        crossLink={{ icon: <BookIcon size={18} />, label: "SafeAI Hub", path: ROUTES.hub.root }}
      />

      <div className="dash-main">
        <Outlet />
      </div>
    </div>
  );
}
