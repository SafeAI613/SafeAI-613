import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import ThemeToggle from "../../components/ThemeToggle";
import { ROUTES } from "../../router/paths";

interface ShowcaseHeaderProps {
  brand: string;
  /** The page's main call to action, shown at the end of the bar. */
  action: ReactNode;
}

/** Slim floating bar for the Hub / Platform intro pages, which sit outside the site's top navigation. */
export default function ShowcaseHeader({ brand, action }: ShowcaseHeaderProps) {
  return (
    <header className="sx-header">
      <div className="sx-wrap">
        <nav className="sx-header-bar" aria-label={brand}>
          <Link to={ROUTES.home} className="sx-header-back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 5l7 7-7 7" />
            </svg>
            <span className="sx-logo" dir="ltr">
              SafeAI<span>613</span>
            </span>
          </Link>
          <span className="sx-header-brand">{brand}</span>
          <div className="sx-header-actions">
            <ThemeToggle />
            {action}
          </div>
        </nav>
      </div>
    </header>
  );
}
