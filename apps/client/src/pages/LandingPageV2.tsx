import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
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
import { useLocale } from "../i18n/useLocale";

// Gateway — five full-width sections instead of a top menu: what SafeAI is,
// the Hub, the Platform, why, and contact. The Hub / Platform sections lead
// to each platform's intro page, and only from there into the platform.
// Labels are translation keys (gateway.sections.<id>), resolved at render time.
const SECTIONS = [{ id: "about" }, { id: "hub" }, { id: "platform" }, { id: "why" }, { id: "contact" }] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/** Keys under gateway.marquee.* */
const MARQUEE_WORDS = [
  "inputFilter",
  "outputFilter",
  "filterProfiles",
  "openSource",
  "aiNews",
  "forum",
  "articles",
  "courses",
  "guides",
  "projectBoard",
  "agents",
  "apiKeys",
] as const;

/** `key` → gateway.hubAreas.<key> */
const HUB_AREAS: { icon: ReactNode; key: string }[] = [
  { icon: <NewsIcon size={18} />, key: "news" },
  { icon: <ChatIcon size={18} />, key: "forum" },
  { icon: <DocIcon size={18} />, key: "articles" },
  { icon: <BookIcon size={18} />, key: "courses" },
  { icon: <CompassIcon size={18} />, key: "guides" },
  { icon: <ClipboardIcon size={18} />, key: "projects" },
  { icon: <BoxIcon size={18} />, key: "agents" },
];

/** Keys under gateway.platform.points.* */
const PLATFORM_POINTS = ["compatible", "filtered", "profiles", "keys"] as const;

const PLATFORM_TERMINAL: readonly TerminalLine[] = [
  { kind: "command", text: "$ export SAFEAI_KEY=sk-foo-bar" },
  { kind: "command", text: "$ curl $SAFEAI_URL/v1/chat/completions -d @foo.json" },
  { kind: "output", text: "→ input filter ........ passed" },
  { kind: "output", text: "→ model ............... ok" },
  { kind: "output", text: "→ output filter ....... passed" },
  { kind: "success", text: '✔ 200 · "Lorem ipsum dolor sit amet"' },
];

/** Keys under gateway.why.principles.* */
const WHY_PRINCIPLES = ["professional", "core", "domain"] as const;

/** `key` → gateway.contact.options.<key>.{title,description} */
const CONTACT_OPTIONS: { icon: ReactNode; key: string; path: string }[] = [
  { icon: <MailIcon size={20} />, key: "support", path: ROUTES.contact },
  { icon: <UserIcon size={20} />, key: "devTeam", path: ROUTES.contact },
  { icon: <LockIcon size={20} />, key: "organizations", path: ROUTES.becomeOrgOwner },
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
  const { t } = useTranslation();
  const { dir } = useLocale();
  const pageRef = useRevealOnScroll<HTMLDivElement>();
  const activeSection = useActiveSection();
  const publicStats = usePublicStats();

  const stats = useMemo<StatItem[]>(() => {
    const items: StatItem[] = [
      { id: "platforms", value: 2, label: t("gateway.stats.platforms") },
      { id: "layers", value: 2, label: t("gateway.stats.layers") },
      { id: "open-source", value: 100, suffix: "%", label: t("gateway.stats.openSource") },
    ];
    items.push(
      publicStats && publicStats.userCount > 0
        ? { id: "community", value: publicStats.userCount, label: t("gateway.stats.users") }
        : { id: "community", value: HUB_AREAS.length, label: t("gateway.stats.hubAreas") },
    );
    return items;
  }, [publicStats, t]);

  const strong = { strong: <strong /> };

  return (
    <div className="sx" ref={pageRef} dir={dir}>
      <SEO title={t("gateway.seoTitle")} description={t("gateway.seoDescription")} />

      <nav aria-label={t("gateway.sectionsNav")}>
        <ul className="sx-dots">
          {SECTIONS.map((section, index) => {
            const label = t(`gateway.sections.${section.id}`);
            return (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  aria-current={activeSection === section.id}
                  aria-label={label}
                >
                  <span>
                    <bdi className="sx-dots-num">{`0${index + 1}`}</bdi> {label}
                  </span>
                </button>
              </li>
            );
          })}
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
            {t("gateway.hero.chip")}
          </span>
          <h1 id="about-title" className="sx-h1" data-reveal style={revealDelay(1)}>
            {t("gateway.hero.line1")}
            <br />
            <span className="sx-gradient-text">{t("gateway.hero.line2")}</span>
            <br />
            <span className="sx-outline-text">{t("gateway.hero.line3")}</span>
          </h1>
          <p className="sx-lead" data-reveal style={revealDelay(2)}>
            <Trans i18nKey="gateway.hero.lead" components={strong} />
          </p>
          <div className="sx-actions" data-reveal style={revealDelay(3)}>
            <button type="button" className="sx-btn sx-btn-primary" onClick={() => scrollToSection("hub")}>
              {t("gateway.hero.exploreHub")} <span className="sx-btn-arrow" aria-hidden="true">←</span>
            </button>
            <button type="button" className="sx-btn sx-btn-ghost" onClick={() => scrollToSection("platform")}>
              {t("gateway.hero.explorePlatform")}
            </button>
          </div>
        </div>

        <button
          type="button"
          className="sx-scroll-hint"
          onClick={() => scrollToSection("hub")}
          aria-label={t("gateway.hero.scrollNext")}
        />
      </section>

      <div className="sx-marquee" aria-hidden="true">
        <div className="sx-marquee-track">
          {[...MARQUEE_WORDS, ...MARQUEE_WORDS].map((word, index) => (
            <span key={index}>{t(`gateway.marquee.${word}`)}</span>
          ))}
        </div>
      </div>

      <section className="sx-section" aria-label={t("gateway.stats.label")}>
        <div className="sx-wrap">
          <p className="sx-statement" data-reveal>
            {t("gateway.statement.start")} <span className="sx-dim">{t("gateway.statement.dim")}</span>{" "}
            <span className="sx-gradient-text">{t("gateway.statement.accent")}</span>
          </p>
          <div className="sx-space-top">
            <StatsBand items={stats} label={t("gateway.stats.label")} />
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
              {t("gateway.hub.line1")}
              <br />
              <span className="sx-gradient-text">{t("gateway.hub.line2")}</span>
            </h2>
            <p className="sx-lead" data-reveal style={revealDelay(2)}>
              <Trans i18nKey="gateway.hub.lead" components={strong} />
            </p>
            <div data-reveal style={revealDelay(3)}>
              <Link to={ROUTES.welcome.hub} className="sx-btn sx-btn-primary">
                {t("gateway.hub.cta")} <span className="sx-btn-arrow" aria-hidden="true">←</span>
              </Link>
            </div>
          </div>

          <ul className="sx-mini-grid">
            {HUB_AREAS.map((area, index) => (
              <li
                key={area.key}
                className={`sx-mini${index === HUB_AREAS.length - 1 ? " sx-mini-wide" : ""}`}
                data-reveal
                style={revealDelay(index)}
              >
                <span className="sx-mini-icon" aria-hidden="true">
                  {area.icon}
                </span>
                <span className="sx-mini-title">{t(`gateway.hubAreas.${area.key}`)}</span>
                <span className="sx-mini-num">{String(index + 1).padStart(2, "0")}</span>
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
              {t("gateway.platform.line1")}
              <br />
              <span className="sx-gradient-text">{t("gateway.platform.line2")}</span>
            </h2>
            <p className="sx-lead" data-reveal style={revealDelay(2)}>
              {t("gateway.platform.lead")}
            </p>
            <ul className="sx-checklist">
              {PLATFORM_POINTS.map((point, index) => (
                <li key={point} data-reveal style={revealDelay(index + 2)}>
                  <span className="sx-checklist-icon" aria-hidden="true">
                    <CheckIcon size={14} />
                  </span>
                  {t(`gateway.platform.points.${point}`)}
                </li>
              ))}
            </ul>
            <div data-reveal style={revealDelay(6)}>
              <Link to={ROUTES.welcome.platform} className="sx-btn sx-btn-primary">
                {t("gateway.platform.cta")} <span className="sx-btn-arrow" aria-hidden="true">←</span>
              </Link>
            </div>
          </div>

          <div data-reveal style={revealDelay(2)}>
            <TypingTerminal lines={PLATFORM_TERMINAL} caption={t("gateway.platform.terminalCaption")} />
          </div>
        </div>
      </section>

      {/* 04 — Why */}
      <section id="why" className="sx-section sx-section-soft" aria-labelledby="why-title">
        <div className="sx-wrap">
          <div className="sx-section-head sx-section-head-center">
            <span className="sx-eyebrow" data-reveal>
              <b>04</b> {t("gateway.sections.why")}
            </span>
            <h2 id="why-title" className="sx-h2" data-reveal style={revealDelay(1)}>
              {t("gateway.why.line1")}
              <br />
              <span className="sx-gradient-text">{t("gateway.why.line2")}</span>
            </h2>
            <p className="sx-lead" data-reveal style={revealDelay(2)}>
              <Trans i18nKey="gateway.why.lead" components={strong} />
            </p>
          </div>

          <div className="sx-cards sx-cards-3">
            {WHY_PRINCIPLES.map((principle, index) => (
              <article key={principle} className="sx-card" data-reveal style={revealDelay(index)}>
                <span className="sx-card-num" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="sx-card-icon" aria-hidden="true">
                  <ShieldIcon size={22} />
                </span>
                <h3 className="sx-h3">{t(`gateway.why.principles.${principle}.title`)}</h3>
                <p>{t(`gateway.why.principles.${principle}.text`)}</p>
              </article>
            ))}
          </div>

          <div className="sx-actions sx-actions-center" data-reveal>
            <Link to={ROUTES.about} className="sx-btn sx-btn-ghost">
              {t("gateway.why.cta")} <span className="sx-btn-arrow" aria-hidden="true">←</span>
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
                  <b>05</b> {t("gateway.sections.contact")}
                </span>
                <h2 id="contact-title" className="sx-h2">
                  {t("gateway.contact.line1")}
                  <br />
                  <span className="sx-gradient-text">{t("gateway.contact.line2")}</span>
                </h2>
                <p className="sx-lead">{t("gateway.contact.lead")}</p>
                <Link to={ROUTES.contact} className="sx-btn sx-btn-primary">
                  {t("gateway.contact.cta")} <span className="sx-btn-arrow" aria-hidden="true">←</span>
                </Link>
                <div>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="sx-mail">
                    {SUPPORT_EMAIL}
                  </a>
                </div>
              </div>

              <div className="sx-contact-options">
                {CONTACT_OPTIONS.map((option) => (
                  <Link key={option.key} to={option.path} className="sx-contact-option">
                    <span className="sx-card-icon" aria-hidden="true">
                      {option.icon}
                    </span>
                    <span>
                      <strong>{t(`gateway.contact.options.${option.key}.title`)}</strong>
                      <small>{t(`gateway.contact.options.${option.key}.description`)}</small>
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
