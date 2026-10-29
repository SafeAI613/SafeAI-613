import { Link, useNavigate } from "react-router-dom";
import "../styles/landing-page-v2.css";
import { KeyIcon, ClipboardIcon, DocIcon } from "../features/landing/icons";
import { ROUTES, loginPath } from "../router/paths";

const FEATURES = [
  {
    icon: <KeyIcon size={18} />,
    title: "מפתחות API מנוהלים",
    description: "יצירה, ביטול ומעקב במקום אחד",
  },
  {
    icon: <ClipboardIcon size={18} />,
    title: "מעקב שימוש בזמן אמת",
    description: "בקשות וטוקנים לפי יום",
  },
  {
    icon: <DocIcon size={18} />,
    title: "תיעוד טכני מלא",
    description: "מדריכי אינטגרציה לכל endpoint",
  },
];

// Public "before login" marketing page for SafeAI Platform (SCRUM-229) —
// reached from the gateway's Platform card, colored to its destination.
// Guests only: the route sends a logged-in user straight to the dashboard.
export default function PlatformTeaserPage() {
  const navigate = useNavigate();

  const continueToPlatform = () => {
    navigate(loginPath(ROUTES.platform.dashboard));
  };

  return (
    <div className="landing-v2 theme-platform" dir="rtl">
      <header className="lv2-teaser-header">
        <Link to={ROUTES.home} className="lv2-teaser-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
          <span>חזרה לדף הבית</span>
        </Link>
        <span className="lv2-teaser-brand">SafeAI Platform</span>
        <span className="lv2-teaser-spacer" />
      </header>

      <div className="lv2-teaser-body">
        <span className="lv2-teaser-eyebrow">לפני שנכנסים</span>
        <h1 className="lv2-teaser-heading">ניהול מפתחות API, שימוש וחשבון — הכל במקום אחד</h1>

        <div className="lv2-teaser-preview">
          {FEATURES.map((feature) => (
            <div className="lv2-teaser-feature" key={feature.title}>
              <span className="lv2-teaser-feature-icon">{feature.icon}</span>
              <div>
                <div className="lv2-teaser-feature-title">{feature.title}</div>
                <div className="lv2-teaser-feature-desc">{feature.description}</div>
              </div>
            </div>
          ))}
        </div>

        <button className="lv2-teaser-cta" onClick={continueToPlatform}>
          התחבר והמשך ל-Platform
        </button>
      </div>
    </div>
  );
}
