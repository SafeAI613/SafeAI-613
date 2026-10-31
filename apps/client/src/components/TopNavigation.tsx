import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import "../styles/top-navigation.css";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/authStore";
import ThemeToggle from "./ThemeToggle";
import { ROUTES } from "../router/paths";

// Shown only on gateway-level pages (SiteLayout); inside a platform its own
// sidebar takes over, so this lists just the two platforms and general pages.
// The home page itself is built from these same five topics as sections, so
// there the links are hidden and only the brand and account actions remain.
const PRIMARY_LINKS = [
  { to: ROUTES.hub.root, labelKey: "nav.safeaiHub" },
  { to: ROUTES.platform.root, labelKey: "nav.safeaiPlatform" },
  { to: ROUTES.about, labelKey: "nav.why" },
  { to: ROUTES.contact, labelKey: "nav.contact" },
];

export default function TopNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [prevLocationKey, setPrevLocationKey] = useState(location.key);
  const menuRef = useRef<HTMLDivElement>(null);
  const isHomePage = location.pathname === ROUTES.home;

  // Close menus on navigation
  if (location.key !== prevLocationKey) {
    setPrevLocationKey(location.key);
    setShowUserMenu(false);
  }

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate(ROUTES.home);
  };

  return (
    <nav className="top-navigation">
      <div className="top-nav-container">
        {/* Logo and Brand */}
        <div className="top-nav-brand">
          <Link to={ROUTES.home} className="brand-link" aria-label="SafeAI 613">
            <svg
              className="brand-logo"
              viewBox="0 0 400 120"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-hidden="true"
              style={{ direction: "ltr" }}
            >
              <defs>
                <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10a37f" stopOpacity={1} />
                  <stop offset="100%" stopColor="#0d8f6f" stopOpacity={1} />
                </linearGradient>
              </defs>
              <text
                x="20"
                y="80"
                fontFamily="'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                fontSize="52"
                fontWeight="bold"
                fill="var(--text-primary)"
                style={{ direction: "ltr" }}
              >
                SafeAI
              </text>
              <text
                x="182"
                y="80"
                fontFamily="'Brush Script MT', 'Comic Sans MS', cursive"
                fontSize="52"
                fontStyle="italic"
                fill="url(#brandGradient)"
                style={{ direction: "ltr" }}
              >
                613
              </text>
            </svg>
          </Link>
        </div>

        {/* Navigation Links — the same for guests and logged-in users */}
        <div className="top-nav-links">
          {!isHomePage && PRIMARY_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? "top-nav-link active" : "top-nav-link")}
            >
              {t(link.labelKey)}
            </NavLink>
          ))}

          {!isAuthenticated ? (
            <>
              <Link to={ROUTES.login} className="top-nav-btn top-nav-btn-secondary">
                {t("nav.login")}
              </Link>
              <Link to={ROUTES.register} className="top-nav-btn top-nav-btn-primary">
                {t("nav.register")}
              </Link>
            </>
          ) : (
            <>
              {/* User Menu */}
              <div className="user-menu-container" ref={menuRef}>
                <button
                  className="user-menu-trigger"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <div className="user-avatar">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <span className="user-name">{user?.name ||t("nav.defaultUserName")}</span>
                  <svg
                    className={`dropdown-arrow ${showUserMenu ? "open" : ""}`}
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                  >
                    <path
                      d="M2.5 4.5L6 8L9.5 4.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {showUserMenu && (
                  <div className="user-menu-dropdown">
                    <div className="user-menu-header">
                      <div className="user-menu-name">{user?.name}</div>
                      <div className="user-menu-email">{user?.email}</div>
                    </div>
                    <div className="user-menu-divider"></div>
                    <Link
                      to={ROUTES.platform.account}
                      className="user-menu-item"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M2 8h12M8 2v12"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      {t("nav.personalArea")}
                    </Link>
                    <Link
                      to={`${ROUTES.platform.account}/api-keys`}
                      className="user-menu-item"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M8 2v12M2 8h12"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      {t("nav.apiKeys")}
                    </Link>
                    <div className="user-menu-divider"></div>
                    <button className="user-menu-item" onClick={handleLogout}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M14 8H6"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {t("nav.logout")}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
          <ThemeToggle />
        </div>
        <LanguageSwitcher />
      </div>
    </nav>
  );
}