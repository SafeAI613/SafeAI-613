import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
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
import { useLocale } from "../i18n/useLocale";

const TERMINAL_LINES: readonly TerminalLine[] = [
  { kind: "command", text: "$ export SAFEAI_KEY=sk-foo-bar" },
  { kind: "command", text: "$ curl $SAFEAI_URL/v1/chat/completions -d @foo.json" },
  { kind: "output", text: "→ profile ............. baz" },
  { kind: "output", text: "→ input filter ........ passed" },
  { kind: "output", text: "→ model ............... ok" },
  { kind: "output", text: "→ output filter ....... passed" },
  { kind: "success", text: '✔ 200 · "Lorem ipsum dolor sit amet"' },
];

/** Keys under platformIntro.steps.* */
const STEPS = ["register", "createKey", "switchUrl", "work"] as const;

/** `key` → platformIntro.features.<key>.{title,text} */
interface Feature {
  icon: ReactNode;
  key: string;
  wide?: boolean;
}

const FEATURES: Feature[] = [
  { icon: <ShieldIcon size={22} />, key: "profiles", wide: true },
  { icon: <KeyIcon size={22} />, key: "keys" },
  { icon: <ClipboardIcon size={22} />, key: "usage" },
  { icon: <UserIcon size={22} />, key: "organizations" },
  { icon: <LockIcon size={22} />, key: "byok" },
  { icon: <BoxIcon size={22} />, key: "compat", wide: true },
  { icon: <DocIcon size={22} />, key: "openSource" },
];

/**
 * Intro page for SafeAI Platform — reached from the gateway, and the page
 * guests land on at /platform. Leads into the dashboard (via login for guests).
 */
export default function PlatformIntroPage() {
  const { t } = useTranslation();
  const { dir } = useLocale();
  const pageRef = useRevealOnScroll<HTMLDivElement>();
  const publicStats = usePublicStats();
  const { isAuthenticated } = useAuth();

  const enterPath = isAuthenticated ? ROUTES.platform.dashboard : loginPath(ROUTES.platform.dashboard);
  const enterLabel = isAuthenticated ? t("platformIntro.enter") : t("platformIntro.loginAndContinue");

  const stats = useMemo<StatItem[]>(() => {
    const items: StatItem[] = [
      { id: "layers", value: 2, label: t("platformIntro.stats.layers") },
      { id: "formats", value: 2, label: t("platformIntro.stats.formats") },
      { id: "key-modes", value: 2, label: t("platformIntro.stats.keyModes") },
    ];
    if (publicStats && publicStats.organizationCount > 0) {
      items.push({ id: "organizations", value: publicStats.organizationCount, label: t("platformIntro.stats.organizations") });
    }
    return items;
  }, [publicStats, t]);

  return (
    <div className="sx sx-platform" ref={pageRef} dir={dir}>
      <SEO
        title="SafeAI Platform"
        description={t("platformIntro.seoDescription")}
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
              {t("platformIntro.hero.line1")}
              <br />
              <span className="sx-gradient-text">{t("platformIntro.hero.line2")}</span>
            </h1>
            <p className="sx-lead" data-reveal style={revealDelay(2)}>
              <Trans i18nKey="platformIntro.hero.lead" components={{ strong: <strong /> }} />
            </p>
            <div className="sx-actions" data-reveal style={revealDelay(3)}>
              <Link to={enterPath} className="sx-btn sx-btn-primary">
                {enterLabel} <span className="sx-btn-arrow" aria-hidden="true">←</span>
              </Link>
              {!isAuthenticated && (
                <Link to={ROUTES.register} className="sx-btn sx-btn-ghost">
                  {t("platformIntro.register")}
                </Link>
              )}
            </div>
          </div>

          <div data-reveal style={revealDelay(2)}>
            <TypingTerminal lines={TERMINAL_LINES} caption={t("platformIntro.hero.terminalCaption")} />
          </div>
        </div>
      </section>

      <section className="sx-section" aria-label={t("platformIntro.stats.label")}>
        <div className="sx-wrap">
          <StatsBand items={stats} label={t("platformIntro.stats.label")} />
        </div>
      </section>

      <section className="sx-section sx-section-soft" aria-labelledby="steps-title">
        <div className="sx-wrap">
          <div className="sx-section-head">
            <span className="sx-eyebrow" data-reveal>
              <b>04</b> {t("platformIntro.stepsSection.eyebrow")}
            </span>
            <h2 id="steps-title" className="sx-h2" data-reveal style={revealDelay(1)}>
              {t("platformIntro.stepsSection.titleStart")}{" "}
              <span className="sx-gradient-text">{t("platformIntro.stepsSection.titleAccent")}</span>
            </h2>
          </div>

          <ol className="sx-steps">
            {STEPS.map((step, index) => (
              <li key={step} className="sx-step" data-reveal style={revealDelay(index)}>
                <span className="sx-step-num">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="sx-h3">{t(`platformIntro.steps.${step}.title`)}</h3>
                <p>{t(`platformIntro.steps.${step}.text`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="sx-section" aria-labelledby="features-title">
        <div className="sx-wrap">
          <div className="sx-section-head">
            <span className="sx-eyebrow" data-reveal>
              <b>{String(FEATURES.length).padStart(2, "0")}</b> {t("platformIntro.featuresSection.eyebrow")}
            </span>
            <h2 id="features-title" className="sx-h2" data-reveal style={revealDelay(1)}>
              {t("platformIntro.featuresSection.titleStart")}{" "}
              <span className="sx-gradient-text">{t("platformIntro.featuresSection.titleAccent")}</span>
            </h2>
          </div>

          <div className="sx-bento">
            {FEATURES.map((feature, index) => (
              <article
                key={feature.key}
                className={`sx-card${feature.wide ? " sx-card-wide" : ""}`}
                data-reveal
                style={revealDelay(index % 3)}
              >
                <span className="sx-card-icon" aria-hidden="true">
                  {feature.icon}
                </span>
                <h3 className="sx-h3">{t(`platformIntro.features.${feature.key}.title`)}</h3>
                <p>{t(`platformIntro.features.${feature.key}.text`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="sx-section" aria-labelledby="platform-cta-title">
        <div className="sx-wrap">
          <div className="sx-cta-band sx-cta-center" data-reveal>
            <h2 id="platform-cta-title" className="sx-h2">
              {t("platformIntro.cta.titleStart")}{" "}
              <span className="sx-gradient-text">{t("platformIntro.cta.titleAccent")}</span>
            </h2>
            <p className="sx-lead">
              {isAuthenticated
                ? t("platformIntro.cta.leadAuthenticated")
                : t("platformIntro.cta.leadGuest")}
            </p>
            <div className="sx-actions">
              <Link to={enterPath} className="sx-btn sx-btn-primary">
                {enterLabel} <span className="sx-btn-arrow" aria-hidden="true">←</span>
              </Link>
              <Link to={ROUTES.welcome.hub} className="sx-btn sx-btn-ghost">
                {t("platformIntro.cta.hub")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
