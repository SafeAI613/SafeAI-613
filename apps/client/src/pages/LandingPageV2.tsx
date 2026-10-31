import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import "../styles/showcase.css";
import { SEO } from "../components/SEO";
import {
  BookIcon,
  BoxIcon,
  ChatIcon,
  CheckIcon,
  ClipboardIcon,
  CompassIcon,
  DocIcon,
  LockIcon,
  MailIcon,
  NewsIcon,
  ShieldIcon,
  UserIcon,
} from "../features/landing/icons";
import StatsBand, { type StatItem } from "../features/showcase/StatsBand";
import TypingTerminal, { type TerminalLine } from "../features/showcase/TypingTerminal";
import { usePublicStats } from "../features/showcase/usePublicStats";
import { useRevealOnScroll } from "../features/showcase/useRevealOnScroll";
import { prefersReducedMotion, revealDelay } from "../features/showcase/motion";
import { ROUTES } from "../router/paths";

// Gateway — five full-width sections instead of a top menu: what SafeAI is,
// the Hub, the Platform, why, and contact. The Hub / Platform sections lead
// to each platform's intro page, and only from there into the platform.
const SECTIONS = [
  { id: "about", label: "SafeAI" },
  { id: "hub", label: "Hub" },
  { id: "platform", label: "Platform" },
  { id: "why", label: "למה?" },
  { id: "contact", label: "צור קשר" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const MARQUEE_WORDS = [
  "סינון קלט",
  "סינון פלט",
  "פרופילי סינון",
  "קוד פתוח",
  "חדשות AI",
  "פורום",
  "מאמרים",
  "קורסים",
  "מדריכים",
  "לוח פרויקטים",
  "סוכנים",
  "מפתחות API",
];

const HUB_AREAS: { icon: ReactNode; title: string }[] = [
  { icon: <NewsIcon size={18} />, title: "חדשות AI" },
  { icon: <ChatIcon size={18} />, title: "פורום" },
  { icon: <DocIcon size={18} />, title: "מאמרים" },
  { icon: <BookIcon size={18} />, title: "קורסים" },
  { icon: <CompassIcon size={18} />, title: "מדריכים מומלצים" },
  { icon: <ClipboardIcon size={18} />, title: "לוח פרויקטים" },
  { icon: <BoxIcon size={18} />, title: "סוכנים" },
];

const PLATFORM_POINTS = [
  "ממשק API תואם לפורמטים המקובלים — מחליפים כתובת וממשיכים לעבוד",
  "כל בקשה וכל תשובה עוברות סינון בדרך",
  "פרופילי סינון לפי ארגון ולפי תחום עיסוק",
  "מפתח משלכם (BYOK) או מפתחות מנוהלים, עם מעקב שימוש ותקציב",
];

const PLATFORM_TERMINAL: readonly TerminalLine[] = [
  { kind: "command", text: "$ export SAFEAI_KEY=sk-foo-bar" },
  { kind: "command", text: "$ curl $SAFEAI_URL/v1/chat/completions -d @foo.json" },
  { kind: "output", text: "→ input filter ........ passed" },
  { kind: "output", text: "→ model ............... ok" },
  { kind: "output", text: "→ output filter ....... passed" },
  { kind: "success", text: '✔ 200 · "Lorem ipsum dolor sit amet"' },
];

const WHY_PRINCIPLES = [
  {
    title: "שימוש מקצועי בלבד",
    text: "AI לפתרון משימות ממוקדות — לא כ״אדם״ שמפטפטים איתו על כל נושא.",
  },
  {
    title: "סינון ליבה",
    text: "חסימת תוכן אסור לחלוטין, גם בשאלה וגם בתשובה, לפני שהוא מגיע למשתמש.",
  },
  {
    title: "סינון תחום",
    text: "הגדרת תחום עיסוק לכל מערכת, כך שהשיחה נשארת ממוקדת במטרה שלשמה נבנתה.",
  },
];

const CONTACT_OPTIONS: { icon: ReactNode; title: string; description: string; path: string }[] = [
  {
    icon: <MailIcon size={20} />,
    title: "שאלה או תמיכה טכנית",
    description: "כתבו לנו ונחזור אליכם בהקדם",
    path: ROUTES.contact,
  },
  {
    icon: <UserIcon size={20} />,
    title: "הצטרפות לצוות הפיתוח",
    description: "קהילת קוד פתוח שמחפשת ידיים טובות",
    path: ROUTES.contact,
  },
  {
    icon: <LockIcon size={20} />,
    title: "ארגונים ומוסדות",
    description: "פתיחת חשבון ארגוני עם סינון מותאם",
    path: ROUTES.becomeOrgOwner,
  },
];

const SUPPORT_EMAIL = "support@safeai613.com";

function scrollToSection(id: SectionId) {
  document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

/** Tracks which of the gateway sections is currently in the middle of the viewport. */
function useActiveSection(): SectionId {
  const [active, setActive] = useState<SectionId>("about");

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id as SectionId);
        });
      },
      // A thin band across the middle of the screen: whichever section
      // crosses it is the one being read.
      { rootMargin: "-45% 0px -50% 0px" },
    );
    SECTIONS.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  return active;
}

export default function LandingPageV2() {
  const pageRef = useRevealOnScroll<HTMLDivElement>();
  const activeSection = useActiveSection();
  const publicStats = usePublicStats();

  const stats = useMemo<StatItem[]>(() => {
    const items: StatItem[] = [
      { id: "platforms", value: 2, label: "פלטפורמות משלימות" },
      { id: "layers", value: 2, label: "שכבות סינון — קלט ופלט" },
      { id: "open-source", value: 100, suffix: "%", label: "קוד פתוח" },
    ];
    items.push(
      publicStats && publicStats.userCount > 0
        ? { id: "community", value: publicStats.userCount, label: "משתמשים רשומים" }
        : { id: "community", value: HUB_AREAS.length, label: "אזורי ידע ב-Hub" },
    );
    return items;
  }, [publicStats]);

  return (
    <div className="sx" ref={pageRef}>
      <SEO
        title="שימוש בטוח ואחראי בבינה מלאכותית"
        description="SafeAI613 — קהילת קוד פתוח לשימוש בטוח ב-AI: ידע וקהילה ב-SafeAI Hub, ושירות API מסונן ב-SafeAI Platform."
      />

      <nav aria-label="מקטעי הדף">
        <ul className="sx-dots">
          {SECTIONS.map((section, index) => (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => scrollToSection(section.id)}
                aria-current={activeSection === section.id}
                aria-label={section.label}
              >
                <span>{`0${index + 1} ${section.label}`}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* 01 — SafeAI */}
      <section id="about" className="sx-hero sx-hero-center" aria-labelledby="about-title">
        <div className="sx-grid-bg" aria-hidden="true" />
        <div className="sx-orb sx-orb-1" aria-hidden="true" />
        <div className="sx-orb sx-orb-2" aria-hidden="true" />
        <div className="sx-orb sx-orb-3" aria-hidden="true" />

        <div className="sx-wrap">
          <span className="sx-chip" data-reveal>
            קהילת קוד פתוח · BETA
          </span>
          <h1 id="about-title" className="sx-h1" data-reveal style={revealDelay(1)}>
            בינה מלאכותית.
            <br />
            <span className="sx-gradient-text">בטוחה וממוקדת.</span>
            <br />
            <span className="sx-outline-text">בדרך שלנו.</span>
          </h1>
          <p className="sx-lead" data-reveal style={revealDelay(2)}>
            SafeAI613 בונה תשתית קוד פתוח לשימוש בטוח ואחראי ב-AI — <strong>ידע וקהילה</strong> ב-Hub,{" "}
            <strong>שירות API מסונן</strong> ב-Platform. הכל מותאם לערכים של ציבור שומר תורה ומצוות.
          </p>
          <div className="sx-actions" data-reveal style={revealDelay(3)}>
            <button type="button" className="sx-btn sx-btn-primary" onClick={() => scrollToSection("hub")}>
              גלו את ה-Hub <span className="sx-btn-arrow">←</span>
            </button>
            <button type="button" className="sx-btn sx-btn-ghost" onClick={() => scrollToSection("platform")}>
              גלו את ה-Platform
            </button>
          </div>
        </div>

        <button type="button" className="sx-scroll-hint" onClick={() => scrollToSection("hub")} aria-label="גלילה למקטע הבא" />
      </section>

      <div className="sx-marquee" aria-hidden="true">
        <div className="sx-marquee-track">
          {[...MARQUEE_WORDS, ...MARQUEE_WORDS].map((word, index) => (
            <span key={index}>{word}</span>
          ))}
        </div>
      </div>

      <section className="sx-section" aria-label="SafeAI במספרים">
        <div className="sx-wrap">
          <p className="sx-statement" data-reveal>
            AI הוא כוח עצום. <span className="sx-dim">השאלה היא</span>{" "}
            <span className="sx-gradient-text">מי מחזיק בהגה.</span>
          </p>
          <div className="sx-space-top">
            <StatsBand items={stats} label="SafeAI במספרים" />
          </div>
        </div>
      </section>

      {/* 02 — Hub */}
      <section id="hub" className="sx-section sx-section-soft sx-hub" aria-labelledby="hub-title">
        <div className="sx-wrap sx-split">
          <div>
            <span className="sx-eyebrow" data-reveal>
              <b>02</b> SafeAI Hub
            </span>
            <h2 id="hub-title" className="sx-h2" data-reveal style={revealDelay(1)}>
              כל הידע על AI.
              <br />
              <span className="sx-gradient-text">בגבולות הנכונים.</span>
            </h2>
            <p className="sx-lead" data-reveal style={revealDelay(2)}>
              מרכז ידע וקהילה: איך עובדים עם בינה מלאכותית נכון, מה כדאי ומה לא, ואיך משלבים אותה בעבודה מקצועית{" "}
              <strong>מבלי לוותר על הערכים</strong> — כולל התייחסות להשקפה החרדית בשימוש בכלים.
            </p>
            <div data-reveal style={revealDelay(3)}>
              <Link to={ROUTES.welcome.hub} className="sx-btn sx-btn-primary">
                לדף ה-Hub <span className="sx-btn-arrow">←</span>
              </Link>
            </div>
          </div>

          <ul className="sx-mini-grid">
            {HUB_AREAS.map((area, index) => (
              <li
                key={area.title}
                className={`sx-mini${index === HUB_AREAS.length - 1 ? " sx-mini-wide" : ""}`}
                data-reveal
                style={revealDelay(index)}
              >
                <span className="sx-mini-icon" aria-hidden="true">
                  {area.icon}
                </span>
                <span className="sx-mini-title">{area.title}</span>
                <span className="sx-mini-num">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 03 — Platform */}
      <section id="platform" className="sx-section sx-platform" aria-labelledby="platform-title">
        <div className="sx-wrap sx-split">
          <div>
            <span className="sx-eyebrow" data-reveal>
              <b>03</b> SafeAI Platform
            </span>
            <h2 id="platform-title" className="sx-h2" data-reveal style={revealDelay(1)}>
              מודלי שפה מובילים.
              <br />
              <span className="sx-gradient-text">עם סינון מובנה.</span>
            </h2>
            <p className="sx-lead" data-reveal style={revealDelay(2)}>
              שער API שמתחבר לכלים ולאפליקציות שכבר יש לכם — מקבלים מפתח, מחליפים כתובת, וכל השאר קורה בדרך.
            </p>
            <ul className="sx-checklist">
              {PLATFORM_POINTS.map((point, index) => (
                <li key={point} data-reveal style={revealDelay(index + 2)}>
                  <span className="sx-checklist-icon" aria-hidden="true">
                    <CheckIcon size={14} />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
            <div data-reveal style={revealDelay(6)}>
              <Link to={ROUTES.welcome.platform} className="sx-btn sx-btn-primary">
                לדף ה-Platform <span className="sx-btn-arrow">←</span>
              </Link>
            </div>
          </div>

          <div data-reveal style={revealDelay(2)}>
            <TypingTerminal lines={PLATFORM_TERMINAL} caption="הדגמה: קריאת API שעוברת סינון קלט ופלט" />
          </div>
        </div>
      </section>

      {/* 04 — Why */}
      <section id="why" className="sx-section sx-section-soft" aria-labelledby="why-title">
        <div className="sx-wrap">
          <div className="sx-section-head sx-section-head-center">
            <span className="sx-eyebrow" data-reveal>
              <b>04</b> למה?
            </span>
            <h2 id="why-title" className="sx-h2" data-reveal style={revealDelay(1)}>
              כי AI הוא כלי.
              <br />
              <span className="sx-gradient-text">לא בן שיח.</span>
            </h2>
            <p className="sx-lead" data-reveal style={revealDelay(2)}>
              כלי ה-AI נכנסו לכל תחום מקצועי, והשימוש בהם כבר בלתי נמנע. אבל מודל שפה יודע גם לנהל שיחה, להחמיא, לייעץ
              ולהמשיך עוד ועוד. אנחנו לא מקבלים את השינוי הזה בשוויון נפש — <strong>אנחנו מתכוננים אליו.</strong>
            </p>
          </div>

          <div className="sx-cards sx-cards-3">
            {WHY_PRINCIPLES.map((principle, index) => (
              <article key={principle.title} className="sx-card" data-reveal style={revealDelay(index)}>
                <span className="sx-card-num" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="sx-card-icon" aria-hidden="true">
                  <ShieldIcon size={22} />
                </span>
                <h3 className="sx-h3">{principle.title}</h3>
                <p>{principle.text}</p>
              </article>
            ))}
          </div>

          <div className="sx-actions sx-actions-center" data-reveal>
            <Link to={ROUTES.about} className="sx-btn sx-btn-ghost">
              לקריאת הרקע המלא <span className="sx-btn-arrow">←</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 05 — Contact */}
      <section id="contact" className="sx-section" aria-labelledby="contact-title">
        <div className="sx-wrap">
          <div className="sx-cta-band" data-reveal>
            <div className="sx-cta-grid">
              <div>
                <span className="sx-eyebrow">
                  <b>05</b> צור קשר
                </span>
                <h2 id="contact-title" className="sx-h2">
                  יש שאלה?
                  <br />
                  <span className="sx-gradient-text">רוצים להצטרף?</span>
                </h2>
                <p className="sx-lead">
                  מתאים למשתמשים, למפתחים, למוסדות ולארגונים. ספרו לנו מה אתם צריכים — ונמצא יחד את הדרך הנכונה.
                </p>
                <Link to={ROUTES.contact} className="sx-btn sx-btn-primary">
                  לטופס יצירת קשר <span className="sx-btn-arrow">←</span>
                </Link>
                <div>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="sx-mail">
                    {SUPPORT_EMAIL}
                  </a>
                </div>
              </div>

              <div className="sx-contact-options">
                {CONTACT_OPTIONS.map((option) => (
                  <Link key={option.title} to={option.path} className="sx-contact-option">
                    <span className="sx-card-icon" aria-hidden="true">
                      {option.icon}
                    </span>
                    <span>
                      <strong>{option.title}</strong>
                      <small>{option.description}</small>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
