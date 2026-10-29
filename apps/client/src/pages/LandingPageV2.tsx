import { Link, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import "../styles/landing-page-v2.css";
import { useAuth } from "../context/authStore";
import { BookIcon, ShieldIcon } from "../features/landing/icons";

interface WorldCard {
  key: "hub" | "platform";
  icon: ReactNode;
  title: string;
  description: string;
  ctaLabel: string;
  teaserPath: string;
  homePath: string;
}

// Gateway (SCRUM-227): a neutral marketing entry point with no association to
// either world — it only introduces SafeAI Hub and SafeAI Platform and lets
// the visitor choose. Intentionally no separate banner for forum/docs/courses
// here: those are internal content of Hub/Platform, not an independent
// "third product", and are reached through each world's own sidebar.
const WORLDS: WorldCard[] = [
  {
    key: "hub",
    icon: <BookIcon size={26} />,
    title: "SafeAI Hub",
    description: "כל הידע במקום אחד — פורום, קורסים, מדריכים, לוח פרויקטים וחדשות.",
    ctaLabel: "כניסה ל-Hub",
    teaserPath: "/hub",
    homePath: "/safeai-hub",
  },
  {
    key: "platform",
    icon: <ShieldIcon size={26} />,
    title: "SafeAI Platform",
    description: "כל מה שצריך לניהול השימוש שלך ב-API ובחשבון — במקום אחד.",
    ctaLabel: "כניסה ל-Platform",
    teaserPath: "/platform",
    homePath: "/safeai-platform",
  },
];

export default function LandingPageV2() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Already-authenticated visitors skip straight to the world's home; a
  // logged-out visitor sees the marketing "teaser" for that world first,
  // with its own login CTA (SCRUM-228/229).
  const enterWorld = (world: WorldCard) => {
    navigate(isAuthenticated ? world.homePath : world.teaserPath);
  };

  return (
    <div className="landing-v2 lv2-gateway">
      <header className="lv2-header">
        <Link to="/" className="lv2-logo">
          SafeAI<span>613</span>
        </Link>

        <nav className="lv2-header-nav">
          <Link to="/about" className="lv2-header-link">אודות</Link>
          <Link to="/contact" className="lv2-header-link">צור קשר</Link>
        </nav>

        <div className="lv2-header-actions">
          <button className="lv2-btn lv2-btn-ghost lv2-btn-sm" onClick={() => navigate("/login")}>
            התחברות
          </button>
          <button className="lv2-btn lv2-btn-primary lv2-btn-sm" onClick={() => navigate("/register")}>
            הרשמה
          </button>
        </div>
      </header>

      <section className="lv2-gateway-hero">
        <span className="lv2-badge">SafeAI613</span>
        <h1 className="lv2-title">שימוש בטוח ואחראי בבינה מלאכותית</h1>
        <p className="lv2-gateway-subtitle">
          שער כניסה אחד, שתי פלטפורמות נפרדות — כל אחת עם זהות, ניווט ותוכן משלה.
        </p>
      </section>

      <section className="lv2-gateway-cards">
        {WORLDS.map((world) => (
          <button
            key={world.key}
            className={`lv2-gateway-card lv2-gateway-card-${world.key}`}
            onClick={() => enterWorld(world)}
          >
            <div className="lv2-gateway-card-icon">{world.icon}</div>
            <h3 className="lv2-gateway-card-title">{world.title}</h3>
            <p className="lv2-gateway-card-desc">{world.description}</p>
            <span className="lv2-gateway-card-cta">{world.ctaLabel}</span>
          </button>
        ))}
      </section>
    </div>
  );
}
