import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import "../styles/showcase.css";
import { SEO } from "../components/SEO";
import { useAuth } from "../context/authStore";
import { BoxIcon, ClipboardIcon, DocIcon, KeyIcon, LockIcon, ShieldIcon, UserIcon } from "../features/landing/icons";
import ShowcaseHeader from "../features/showcase/ShowcaseHeader";
import StatsBand, { type StatItem } from "../features/showcase/StatsBand";
import TypingTerminal, { type TerminalLine } from "../features/showcase/TypingTerminal";
import { usePublicStats } from "../features/showcase/usePublicStats";
import { useRevealOnScroll } from "../features/showcase/useRevealOnScroll";
import { revealDelay } from "../features/showcase/motion";
import { ROUTES, loginPath } from "../router/paths";

const TERMINAL_LINES: readonly TerminalLine[] = [
  { kind: "command", text: "$ export SAFEAI_KEY=sk-foo-bar" },
  { kind: "command", text: "$ curl $SAFEAI_URL/v1/chat/completions -d @foo.json" },
  { kind: "output", text: "→ profile ............. baz" },
  { kind: "output", text: "→ input filter ........ passed" },
  { kind: "output", text: "→ model ............... ok" },
  { kind: "output", text: "→ output filter ....... passed" },
  { kind: "success", text: '✔ 200 · "Lorem ipsum dolor sit amet"' },
];

const STEPS = [
  { title: "נרשמים", text: "פותחים חשבון אישי או ארגוני בכמה דקות." },
  { title: "יוצרים מפתח API", text: "מפתח אישי שמזהה אתכם ואת פרופיל הסינון שלכם." },
  { title: "מחליפים כתובת", text: "מכוונים את הקוד או הכלי הקיים לכתובת של SafeAI." },
  { title: "עובדים בשקט", text: "כל בקשה וכל תשובה עוברות סינון — אוטומטית." },
];

interface Feature {
  icon: ReactNode;
  title: string;
  text: string;
  wide?: boolean;
}

const FEATURES: Feature[] = [
  {
    icon: <ShieldIcon size={22} />,
    title: "פרופילי סינון",
    text: "סינון ליבה שחוסם תוכן אסור, וסינון תחום שמשאיר את המערכת ממוקדת במטרה שלה. כל ארגון בוחר את הפרופילים שמתאימים לו.",
    wide: true,
  },
  {
    icon: <KeyIcon size={22} />,
    title: "ניהול מפתחות",
    text: "יצירה, ביטול ומעקב — במקום אחד.",
  },
  {
    icon: <ClipboardIcon size={22} />,
    title: "מעקב שימוש",
    text: "בקשות וטוקנים לפי יום, עם גרפים ברורים.",
  },
  {
    icon: <UserIcon size={22} />,
    title: "ארגונים",
    text: "משתמשים, תקציב וחשבוניות לכל ארגון.",
  },
  {
    icon: <LockIcon size={22} />,
    title: "BYOK או מנוהל",
    text: "מביאים מפתח ספק משלכם, או משתמשים במפתחות המערכת.",
  },
  {
    icon: <BoxIcon size={22} />,
    title: "תאימות לכלי פיתוח",
    text: "ממשק תואם לפורמטים המקובלים, כך שכלים קיימים מתחברים בלי שינויי קוד.",
    wide: true,
  },
  {
    icon: <DocIcon size={22} />,
    title: "קוד פתוח",
    text: "כל הקוד פתוח ושקוף — אפשר לבדוק, ללמוד ולתרום.",
  },
];

/**
 * Intro page for SafeAI Platform — reached from the gateway, and the page
 * guests land on at /platform. Leads into the dashboard (via login for guests).
 */
export default function PlatformIntroPage() {
  const pageRef = useRevealOnScroll<HTMLDivElement>();
  const publicStats = usePublicStats();
  const { isAuthenticated } = useAuth();

  const enterPath = isAuthenticated ? ROUTES.platform.dashboard : loginPath(ROUTES.platform.dashboard);
  const enterLabel = isAuthenticated ? "כניסה ל-Platform" : "התחברות והמשך";

  const stats = useMemo<StatItem[]>(() => {
    const items: StatItem[] = [
      { id: "layers", value: 2, label: "שכבות סינון — קלט ופלט" },
      { id: "formats", value: 2, label: "פורמטי API נתמכים" },
      { id: "key-modes", value: 2, label: "מצבי מפתחות — BYOK ומנוהל" },
    ];
    if (publicStats && publicStats.organizationCount > 0) {
      items.push({ id: "organizations", value: publicStats.organizationCount, label: "ארגונים פעילים" });
    }
    return items;
  }, [publicStats]);

  return (
    <div className="sx sx-platform" ref={pageRef} dir="rtl">
      <SEO
        title="SafeAI Platform"
        description="שער API למודלי שפה עם סינון מובנה בקלט ובפלט, ניהול מפתחות, מעקב שימוש וחשבונות ארגוניים."
      />

      <ShowcaseHeader
        brand="SafeAI Platform"
        action={
          <Link to={enterPath} className="sx-btn sx-btn-primary sx-btn-sm">
            {enterLabel}
          </Link>
        }
      />

      <section className="sx-hero" aria-labelledby="platform-hero-title">
        <div className="sx-grid-bg" aria-hidden="true" />
        <div className="sx-orb sx-orb-1" aria-hidden="true" />
        <div className="sx-orb sx-orb-2" aria-hidden="true" />

        <div className="sx-wrap sx-split">
          <div>
            <span className="sx-chip" data-reveal>
              SafeAI Platform
            </span>
            <h1 id="platform-hero-title" className="sx-h1" data-reveal style={revealDelay(1)}>
              AI מסונן.
              <br />
              <span className="sx-gradient-text">בקריאת API אחת.</span>
            </h1>
            <p className="sx-lead" data-reveal style={revealDelay(2)}>
              שער API למודלי שפה, עם <strong>שכבת סינון מובנית בקלט ובפלט</strong>. מחברים את הכלים והאפליקציות
              שלכם, ומקבלים תשובות מקצועיות ובטוחות.
            </p>
            <div className="sx-actions" data-reveal style={revealDelay(3)}>
              <Link to={enterPath} className="sx-btn sx-btn-primary">
                {enterLabel} <span className="sx-btn-arrow">←</span>
              </Link>
              {!isAuthenticated && (
                <Link to={ROUTES.register} className="sx-btn sx-btn-ghost">
                  הרשמה
                </Link>
              )}
            </div>
          </div>

          <div data-reveal style={revealDelay(2)}>
            <TypingTerminal lines={TERMINAL_LINES} caption="הדגמה: קריאת API שעוברת פרופיל סינון, סינון קלט וסינון פלט" />
          </div>
        </div>
      </section>

      <section className="sx-section" aria-label="SafeAI Platform במספרים">
        <div className="sx-wrap">
          <StatsBand items={stats} label="SafeAI Platform במספרים" />
        </div>
      </section>

      <section className="sx-section sx-section-soft" aria-labelledby="steps-title">
        <div className="sx-wrap">
          <div className="sx-section-head">
            <span className="sx-eyebrow" data-reveal>
              <b>04</b> צעדים
            </span>
            <h2 id="steps-title" className="sx-h2" data-reveal style={revealDelay(1)}>
              מתחילים <span className="sx-gradient-text">בארבעה צעדים</span>
            </h2>
          </div>

          <ol className="sx-steps">
            {STEPS.map((step, index) => (
              <li key={step.title} className="sx-step" data-reveal style={revealDelay(index)}>
                <span className="sx-step-num">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="sx-h3">{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="sx-section" aria-labelledby="features-title">
        <div className="sx-wrap">
          <div className="sx-section-head">
            <span className="sx-eyebrow" data-reveal>
              <b>{String(FEATURES.length).padStart(2, "0")}</b> יכולות
            </span>
            <h2 id="features-title" className="sx-h2" data-reveal style={revealDelay(1)}>
              כל מה שצריך. <span className="sx-gradient-text">במקום אחד.</span>
            </h2>
          </div>

          <div className="sx-bento">
            {FEATURES.map((feature, index) => (
              <article
                key={feature.title}
                className={`sx-card${feature.wide ? " sx-card-wide" : ""}`}
                data-reveal
                style={revealDelay(index % 3)}
              >
                <span className="sx-card-icon" aria-hidden="true">
                  {feature.icon}
                </span>
                <h3 className="sx-h3">{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="sx-section" aria-labelledby="platform-cta-title">
        <div className="sx-wrap">
          <div className="sx-cta-band sx-cta-center" data-reveal>
            <h2 id="platform-cta-title" className="sx-h2">
              מוכנים <span className="sx-gradient-text">לחבר?</span>
            </h2>
            <p className="sx-lead">
              {isAuthenticated
                ? "הכל מחכה לכם ב-Dashboard: מפתחות, שימוש וחשבון."
                : "מתחברים, יוצרים מפתח — והבקשה הראשונה יוצאת תוך דקות."}
            </p>
            <div className="sx-actions">
              <Link to={enterPath} className="sx-btn sx-btn-primary">
                {enterLabel} <span className="sx-btn-arrow">←</span>
              </Link>
              <Link to={ROUTES.welcome.hub} className="sx-btn sx-btn-ghost">
                הכירו גם את ה-Hub
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
