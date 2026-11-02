import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
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
import { useLocale } from "../i18n/useLocale";

/** `key` → hubIntro.areas.<key>.{title,description} */
interface HubArea {
  icon: ReactNode;
  key: string;
  path: string;
}

const HUB_AREAS: HubArea[] = [
  { icon: <NewsIcon size={22} />, key: "news", path: ROUTES.hub.news },
  { icon: <ChatIcon size={22} />, key: "forum", path: ROUTES.hub.forum },
  { icon: <DocIcon size={22} />, key: "articles", path: ROUTES.hub.articles },
  { icon: <BookIcon size={22} />, key: "courses", path: ROUTES.hub.courses },
  { icon: <CompassIcon size={22} />, key: "guides", path: ROUTES.hub.guides },
  { icon: <ClipboardIcon size={22} />, key: "projects", path: ROUTES.hub.projects },
  { icon: <BoxIcon size={22} />, key: "agents", path: ROUTES.hub.agents },
];

/** Keys under hubIntro.principles.* */
const PRINCIPLES = ["tool", "boundaries", "community"] as const;

/** `key` → hubIntro.floating.<key>.{title,subtitle} */
const FLOATING_CARDS: { icon: ReactNode; key: string }[] = [
  { icon: <NewsIcon size={20} />, key: "news" },
  { icon: <ChatIcon size={20} />, key: "forum" },
  { icon: <BookIcon size={20} />, key: "courses" },
  { icon: <ShieldIcon size={20} />, key: "safe" },
];

/** Intro page for SafeAI Hub — reached from the gateway, leads into /hub. */
export default function HubIntroPage() {
  const { t } = useTranslation();
  const { dir } = useLocale();
  const pageRef = useRevealOnScroll<HTMLDivElement>();
  const publicStats = usePublicStats();

  const stats = useMemo<StatItem[]>(() => {
    const items: StatItem[] = [
      { id: "areas", value: HUB_AREAS.length, label: t("hubIntro.stats.areas") },
      { id: "free", value: 100, suffix: "%", label: t("hubIntro.stats.free") },
    ];
    if (publicStats && publicStats.userCount > 0) {
      items.push({ id: "members", value: publicStats.userCount, label: t("hubIntro.stats.members") });
    }
    if (publicStats && publicStats.tenderCount > 0) {
      items.push({ id: "projects", value: publicStats.tenderCount, label: t("hubIntro.stats.projects") });
    }
    return items;
  }, [publicStats, t]);

  const scrollToAreas = () =>
    document.getElementById("areas")?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });

  return (
    <div className="sx sx-hub" ref={pageRef} dir={dir}>
      <SEO
        title="SafeAI Hub"
        description={t("hubIntro.seoDescription")}
      />

      <ShowcaseHeader
        brand="SafeAI Hub"
        action={
          <Link to={ROUTES.hub.root} className="sx-btn sx-btn-primary sx-btn-sm">
            {t("hubIntro.enter")}
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
              {t("hubIntro.hero.line1")}
              <br />
              <span className="sx-gradient-text">{t("hubIntro.hero.line2")}</span>
            </h1>
            <p className="sx-lead" data-reveal style={revealDelay(2)}>
              <Trans i18nKey="hubIntro.hero.lead" components={{ strong: <strong /> }} />
            </p>
            <div className="sx-actions" data-reveal style={revealDelay(3)}>
              <Link to={ROUTES.hub.root} className="sx-btn sx-btn-primary">
                {t("hubIntro.enter")} <span className="sx-btn-arrow" aria-hidden="true">←</span>
              </Link>
              <button type="button" className="sx-btn sx-btn-ghost" onClick={scrollToAreas}>
                {t("hubIntro.hero.whatsInside")}
              </button>
            </div>
          </div>

          <div className="sx-float-stack" aria-hidden="true">
            {FLOATING_CARDS.map((card) => (
              <div key={card.key} className="sx-float-card">
                <span className="sx-card-icon">{card.icon}</span>
                <span>
                  <strong>{t(`hubIntro.floating.${card.key}.title`)}</strong>
                  <small>{t(`hubIntro.floating.${card.key}.subtitle`)}</small>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sx-section" aria-label={t("hubIntro.stats.label")}>
        <div className="sx-wrap">
          <StatsBand items={stats} label={t("hubIntro.stats.label")} />
        </div>
      </section>

      <section id="areas" className="sx-section sx-section-soft" aria-labelledby="areas-title">
        <div className="sx-wrap">
          <div className="sx-section-head">
            <span className="sx-eyebrow" data-reveal>
              <b>{String(HUB_AREAS.length).padStart(2, "0")}</b> {t("hubIntro.areasSection.eyebrow")}
            </span>
            <h2 id="areas-title" className="sx-h2" data-reveal style={revealDelay(1)}>
              {t("hubIntro.areasSection.titleStart")}{" "}
              <span className="sx-gradient-text">{t("hubIntro.areasSection.titleAccent")}</span>
            </h2>
            <p className="sx-lead" data-reveal style={revealDelay(2)}>
              {t("hubIntro.areasSection.lead")}
            </p>
          </div>

          <div className="sx-cards">
            {HUB_AREAS.map((area, index) => (
              <Link
                key={area.key}
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
                <h3 className="sx-h3">{t(`hubIntro.areas.${area.key}.title`)}</h3>
                <p>{t(`hubIntro.areas.${area.key}.description`)}</p>
                <span className="sx-card-more" aria-hidden="true">
                  {t("hubIntro.areasSection.enter")} <span className="sx-btn-arrow">←</span>
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
              <b>03</b> {t("hubIntro.principlesSection.eyebrow")}
            </span>
            <h2 id="principles-title" className="sx-h2" data-reveal style={revealDelay(1)}>
              {t("hubIntro.principlesSection.titleStart")}{" "}
              <span className="sx-gradient-text">{t("hubIntro.principlesSection.titleAccent")}</span>
            </h2>
          </div>

          <ol className="sx-steps sx-steps-3">
            {PRINCIPLES.map((principle, index) => (
              <li key={principle} className="sx-step" data-reveal style={revealDelay(index)}>
                <span className="sx-step-num">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="sx-h3">{t(`hubIntro.principles.${principle}.title`)}</h3>
                <p>{t(`hubIntro.principles.${principle}.text`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="sx-section" aria-labelledby="hub-cta-title">
        <div className="sx-wrap">
          <div className="sx-cta-band sx-cta-center" data-reveal>
            <h2 id="hub-cta-title" className="sx-h2">
              {t("hubIntro.cta.titleStart")} <span className="sx-gradient-text">{t("hubIntro.cta.titleAccent")}</span>
            </h2>
            <p className="sx-lead">{t("hubIntro.cta.lead")}</p>
            <div className="sx-actions">
              <Link to={ROUTES.hub.root} className="sx-btn sx-btn-primary">
                {t("hubIntro.enter")} <span className="sx-btn-arrow" aria-hidden="true">←</span>
              </Link>
              <Link to={ROUTES.welcome.platform} className="sx-btn sx-btn-ghost">
                {t("hubIntro.cta.platform")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
