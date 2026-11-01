import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import "../styles/showcase.css";
import { SEO } from "../components/SEO";
import {
  BookIcon,
  BoxIcon,
  ChatIcon,
  ClipboardIcon,
  CompassIcon,
  DocIcon,
  NewsIcon,
  ShieldIcon,
} from "../features/landing/icons";
import ShowcaseHeader from "../features/showcase/ShowcaseHeader";
import StatsBand, { type StatItem } from "../features/showcase/StatsBand";
import { usePublicStats } from "../features/showcase/usePublicStats";
import { useRevealOnScroll } from "../features/showcase/useRevealOnScroll";
import { prefersReducedMotion, revealDelay } from "../features/showcase/motion";
import { ROUTES } from "../router/paths";

interface HubArea {
  icon: ReactNode;
  title: string;
  description: string;
  path: string;
}

const HUB_AREAS: HubArea[] = [
  {
    icon: <NewsIcon size={22} />,
    title: "חדשות AI",
    description: "מה חדש בעולם הכלים — בתמצית, בשפה נקייה ובלי רעש.",
    path: ROUTES.hub.news,
  },
  {
    icon: <ChatIcon size={22} />,
    title: "פורום",
    description: "שואלים, עונים ומשתפים ניסיון מעשי עם קהילה שחולקת את אותם ערכים.",
    path: ROUTES.hub.forum,
  },
  {
    icon: <DocIcon size={22} />,
    title: "מאמרים",
    description: "הסברים מעמיקים: איך כלי AI עובדים, ואיך משתמשים בהם נכון ובבטחה.",
    path: ROUTES.hub.articles,
  },
  {
    icon: <BookIcon size={22} />,
    title: "קורסים",
    description: "לימוד מסודר, צעד אחר צעד — מהיסודות ועד שילוב AI בעבודה מקצועית.",
    path: ROUTES.hub.courses,
  },
  {
    icon: <CompassIcon size={22} />,
    title: "מדריכים מומלצים",
    description: "מדריכים שנבחרו בקפידה כדי לחסוך חיפוש במקומות לא מתאימים.",
    path: ROUTES.hub.guides,
  },
  {
    icon: <ClipboardIcon size={22} />,
    title: "לוח פרויקטים",
    description: "פרויקטים פתוחים לקהילה — מקום לתרום, ללמוד ולהתנסות על מוצר אמיתי.",
    path: ROUTES.hub.projects,
  },
  {
    icon: <BoxIcon size={22} />,
    title: "סוכנים",
    description: "סוכני AI שנבנו בקהילה למשימות ממוקדות, מוכנים לשימוש.",
    path: ROUTES.hub.agents,
  },
];

const PRINCIPLES = [
  {
    title: "AI ככלי עבודה",
    text: "לומדים להפעיל את הכלי למשימה מוגדרת — לא לנהל איתו שיחה פתוחה על כל נושא.",
  },
  {
    title: "ידע עם גבולות",
    text: "התוכן נכתב ונבחר מתוך השקפת עולם של שומרי תורה ומצוות: מה מתאים, מה לא, ואיך נזהרים.",
  },
  {
    title: "קהילה שומרת ערכים",
    text: "מקום להתייעץ ולשתף ניסיון עם אנשים שמחפשים את אותו איזון — מקצועיות בלי פשרות.",
  },
];

const FLOATING_CARDS = [
  { icon: <NewsIcon size={20} />, title: "חדשות AI", subtitle: "עדכונים בתמצית" },
  { icon: <ChatIcon size={20} />, title: "פורום הקהילה", subtitle: "שאלות ותשובות" },
  { icon: <BookIcon size={20} />, title: "קורסים", subtitle: "לימוד צעד אחר צעד" },
  { icon: <ShieldIcon size={20} />, title: "שימוש בטוח", subtitle: "בגבולות הנכונים" },
];

/** Intro page for SafeAI Hub — reached from the gateway, leads into /hub. */
export default function HubIntroPage() {
  const pageRef = useRevealOnScroll<HTMLDivElement>();
  const publicStats = usePublicStats();

  const stats = useMemo<StatItem[]>(() => {
    const items: StatItem[] = [
      { id: "areas", value: HUB_AREAS.length, label: "אזורי תוכן" },
      { id: "free", value: 100, suffix: "%", label: "חינם לקריאה, ללא הרשמה" },
    ];
    if (publicStats && publicStats.userCount > 0) {
      items.push({ id: "members", value: publicStats.userCount, label: "חברי קהילה" });
    }
    if (publicStats && publicStats.tenderCount > 0) {
      items.push({ id: "projects", value: publicStats.tenderCount, label: "פרויקטים פתוחים" });
    }
    return items;
  }, [publicStats]);

  const scrollToAreas = () =>
    document.getElementById("areas")?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });

  return (
    <div className="sx sx-hub" ref={pageRef} dir="rtl">
      <SEO
        title="SafeAI Hub"
        description="מרכז ידע וקהילה לשימוש בטוח ומושכל בבינה מלאכותית: חדשות, פורום, מאמרים, קורסים ומדריכים — בגבולות הנכונים."
      />

      <ShowcaseHeader
        brand="SafeAI Hub"
        action={
          <Link to={ROUTES.hub.root} className="sx-btn sx-btn-primary sx-btn-sm">
            כניסה ל-Hub
          </Link>
        }
      />

      <section className="sx-hero" aria-labelledby="hub-hero-title">
        <div className="sx-grid-bg" aria-hidden="true" />
        <div className="sx-orb sx-orb-1" aria-hidden="true" />
        <div className="sx-orb sx-orb-2" aria-hidden="true" />

        <div className="sx-wrap sx-split">
          <div>
            <span className="sx-chip" data-reveal>
              SafeAI Hub
            </span>
            <h1 id="hub-hero-title" className="sx-h1" data-reveal style={revealDelay(1)}>
              ידע על AI.
              <br />
              <span className="sx-gradient-text">בעיניים שלנו.</span>
            </h1>
            <p className="sx-lead" data-reveal style={revealDelay(2)}>
              מרכז ידע וקהילה לשימוש בטוח ומושכל בבינה מלאכותית. חדשות, מאמרים, קורסים ומדריכים —{" "}
              <strong>עם דגש על שימוש מקצועי וממוקד</strong>, ומותאם להשקפת עולם של שומרי תורה ומצוות.
            </p>
            <div className="sx-actions" data-reveal style={revealDelay(3)}>
              <Link to={ROUTES.hub.root} className="sx-btn sx-btn-primary">
                כניסה ל-Hub <span className="sx-btn-arrow">←</span>
              </Link>
              <button type="button" className="sx-btn sx-btn-ghost" onClick={scrollToAreas}>
                מה יש בפנים?
              </button>
            </div>
          </div>

          <div className="sx-float-stack" aria-hidden="true">
            {FLOATING_CARDS.map((card) => (
              <div key={card.title} className="sx-float-card">
                <span className="sx-card-icon">{card.icon}</span>
                <span>
                  <strong>{card.title}</strong>
                  <small>{card.subtitle}</small>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sx-section" aria-label="SafeAI Hub במספרים">
        <div className="sx-wrap">
          <StatsBand items={stats} label="SafeAI Hub במספרים" />
        </div>
      </section>

      <section id="areas" className="sx-section sx-section-soft" aria-labelledby="areas-title">
        <div className="sx-wrap">
          <div className="sx-section-head">
            <span className="sx-eyebrow" data-reveal>
              <b>{String(HUB_AREAS.length).padStart(2, "0")}</b> אזורים
            </span>
            <h2 id="areas-title" className="sx-h2" data-reveal style={revealDelay(1)}>
              מה מחכה <span className="sx-gradient-text">בפנים</span>
            </h2>
            <p className="sx-lead" data-reveal style={revealDelay(2)}>
              כל אזור הוא דלת לתחום אחר. הקריאה פתוחה לכולם; כדי לפרסם, להגיב או להגיש — מתחברים.
            </p>
          </div>

          <div className="sx-cards">
            {HUB_AREAS.map((area, index) => (
              <Link
                key={area.title}
                to={area.path}
                className="sx-card sx-card-link"
                data-reveal
                style={revealDelay(index % 4)}
              >
                <span className="sx-card-num" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="sx-card-icon" aria-hidden="true">
                  {area.icon}
                </span>
                <h3 className="sx-h3">{area.title}</h3>
                <p>{area.description}</p>
                <span className="sx-card-more" aria-hidden="true">
                  כניסה ←
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="sx-section" aria-labelledby="principles-title">
        <div className="sx-wrap">
          <div className="sx-section-head sx-section-head-center">
            <span className="sx-eyebrow" data-reveal>
              <b>03</b> עקרונות
            </span>
            <h2 id="principles-title" className="sx-h2" data-reveal style={revealDelay(1)}>
              איך אנחנו <span className="sx-gradient-text">מסתכלים על AI</span>
            </h2>
          </div>

          <ol className="sx-steps sx-steps-3">
            {PRINCIPLES.map((principle, index) => (
              <li key={principle.title} className="sx-step" data-reveal style={revealDelay(index)}>
                <span className="sx-step-num">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="sx-h3">{principle.title}</h3>
                <p>{principle.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="sx-section" aria-labelledby="hub-cta-title">
        <div className="sx-wrap">
          <div className="sx-cta-band sx-cta-center" data-reveal>
            <h2 id="hub-cta-title" className="sx-h2">
              מוכנים <span className="sx-gradient-text">להתחיל?</span>
            </h2>
            <p className="sx-lead">הקריאה פתוחה לכולם — נכנסים, בוחרים אזור, ומתחילים ללמוד.</p>
            <div className="sx-actions">
              <Link to={ROUTES.hub.root} className="sx-btn sx-btn-primary">
                כניסה ל-Hub <span className="sx-btn-arrow">←</span>
              </Link>
              <Link to={ROUTES.welcome.platform} className="sx-btn sx-btn-ghost">
                הכירו גם את ה-Platform
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
