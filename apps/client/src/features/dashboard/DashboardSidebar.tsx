import { Link, NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import { HomeIcon } from "../landing/icons";
import { ROUTES } from "../../router/paths";
import ThemeToggle from "../../components/ThemeToggle";

export interface SidebarItem {
  key: string;
  icon: ReactNode;
  label: string;
  path: string;
}

export interface SidebarCrossLink {
  icon: ReactNode;
  label: string;
  path: string;
}

interface DashboardSidebarProps {
  homeLabel: string;
  homePath: string;
  items: SidebarItem[];
  crossLink: SidebarCrossLink;
  footer?: ReactNode;
}

const itemClassName = ({ isActive }: { isActive: boolean }) =>
  isActive ? "dash-sidebar-item dash-sidebar-item-active" : "dash-sidebar-item";

// Shared navigation for the Hub and Platform layouts. The active item follows
// the current URL. The brand link at the top returns to the gateway, and the
// cross-link at the bottom moves between the two platforms — per team
// decision (SCRUM-227) they serve the same audience, so both stay reachable.
export default function DashboardSidebar({ homeLabel, homePath, items, crossLink, footer }: DashboardSidebarProps) {
  return (
    <nav className="dash-sidebar" aria-label={homeLabel}>
      <Link to={ROUTES.home} className="dash-sidebar-brand">
        SafeAI<span>613</span>
      </Link>

      <NavLink to={homePath} end className={itemClassName}>
        <HomeIcon size={18} />
        <span>בית</span>
      </NavLink>
      {items.map((item) => (
        <NavLink key={item.key} to={item.path} className={itemClassName}>
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}

      <div className="dash-sidebar-divider" role="separator" />
      <Link to={crossLink.path} className="dash-sidebar-item">
        {crossLink.icon}
        <span>{crossLink.label}</span>
      </Link>
      {footer}
      <div className="dash-sidebar-tools">
        <ThemeToggle />
      </div>
    </nav>
  );
}
