import { useState } from "react";
import { useTranslation } from "react-i18next";
import "../styles/agent-downloads-page.css";

// Design and copy by Tamar Ben Chaim (branch featur/agents-downloads), ported
// to the current app structure.

/**
 * Installer URL per operating system. `null` = no build published yet, and
 * the button shows "coming soon" instead of linking nowhere. Once a build is
 * published (e.g. a GitHub Release asset), put its URL here.
 */
const DESKTOP_DOWNLOADS: Record<"windows" | "linux", string | null> = {
  windows: null,
  linux: null,
};

type Section = "home" | "downloads" | "guide" | "pricing";

function WindowsIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M0 3.449L9.75 2.1v9.45H0V3.449zM0 12.45h9.75v9.45L0 20.551v-8.1zM10.8 1.95L24 0v11.55H10.8V1.95zM10.8 12.45H24v11.55l-13.2-1.95v-9.6z" />
    </svg>
  );
}

function LinuxIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 9l3 3-3 3M12 15h5" />
    </svg>
  );
}

function DownloadButton({ url, label }: { url: string | null; label: string }) {
  const { t } = useTranslation();
  if (!url) {
    return (
      <span className="card-btn card-btn--disabled" aria-disabled="true">
        {t("agentDownloads.comingSoon")}
      </span>
    );
  }
  return (
    <a className="card-btn" href={url} download>
      {label}
    </a>
  );
}

export default function AgentDownloadsPage() {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<Section>("home");

  const navItems: { id: Section; label: string }[] = [
    { id: "home", label: t("nav.homePage") },
    { id: "downloads", label: t("agentDownloads.navDownloads") },
    { id: "guide", label: t("agentDownloads.navGuide") },
    { id: "pricing", label: t("agentDownloads.navPricing") },
  ];

  return (
    <>
      <nav className="dashboard-sub-nav">
        <div className="sub-nav-container">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={activeSection === item.id ? "sub-nav-btn active" : "sub-nav-btn"}
              onClick={() => setActiveSection(item.id)}
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      {/* ===== HOME ===== */}
      <div id="home" className="page-section hero-section">
        <div className="hero-copy">
          <span className="eyebrow">SafeAI Desktop</span>
          <h1>{t("agentDownloads.heroTitle")}</h1>
          <p>{t("agentDownloads.heroSubtitle")}</p>
          <div className="hero-actions">
            <a href="#downloads" className="primary-btn">{t("agentDownloads.downloadNowBtn")}</a>
            <a href="#guide" className="secondary-btn">{t("agentDownloads.learnMoreBtn")}</a>
          </div>
        </div>
        <div className="hero-preview">
          <div className="preview-card">
            <p className="preview-label">{t("agentDownloads.profilesLabel")}</p>
            <ul className="preview-list">
              <li>{t("agentDownloads.profileProgram")}</li>
              <li>{t("agentDownloads.profileArchitect")}</li>
              <li>{t("agentDownloads.profileAnalyst")}</li>
              <li>{t("agentDownloads.profileWriter")}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ===== DOWNLOADS — one card per operating system ===== */}
      <div id="downloads" className="page-section download-section">
        <div className="section-header">
          <span className="section-label">{t("agentDownloads.navDownloads")}</span>
          <h2>{t("agentDownloads.downloadsSectionTitle")}</h2>
          <p>{t("agentDownloads.downloadsSectionDesc")}</p>
        </div>
        <div className="download-os-cards">
          <article className="download-card">
            <div className="os-icon"><WindowsIcon /></div>
            <h3>{t("agentDownloads.windowsTitle")}</h3>
            <p>{t("agentDownloads.windowsDesc")}</p>
            <DownloadButton url={DESKTOP_DOWNLOADS.windows} label={t("agentDownloads.downloadWindowsBtn")} />
          </article>
          <article className="download-card">
            <div className="os-icon"><LinuxIcon /></div>
            <h3>{t("agentDownloads.linuxTitle")}</h3>
            <p>{t("agentDownloads.linuxDesc")}</p>
            <DownloadButton url={DESKTOP_DOWNLOADS.linux} label={t("agentDownloads.downloadLinuxBtn")} />
          </article>
        </div>
      </div>

      {/* ===== GUIDE ===== */}
      <div id="guide" className="page-section guide-section">
        <div className="section-header">
          <span className="section-label">{t("agentDownloads.navGuide")}</span>
          <h2>{t("agentDownloads.guideSectionTitle")}</h2>
          <p>{t("agentDownloads.guideSectionDesc")}</p>
        </div>
        <div className="guide-grid">
          {[1, 2, 3, 4].map((step) => (
            <div className="guide-card" key={step}>
              <h3>{t(`agentDownloads.guideStep${step}Title`)}</h3>
              <p>{t(`agentDownloads.guideStep${step}Desc`)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ===== PRICING ===== */}
      <div id="pricing" className="page-section pricing-section">
        <div className="section-header">
          <span className="section-label">{t("agentDownloads.navPricing")}</span>
          <h2>{t("agentDownloads.pricingSectionTitle")}</h2>
          <p>{t("agentDownloads.pricingSectionDesc")}</p>
        </div>
        <div className="pricing-grid">
          {(["free", "pro", "team"] as const).map((plan) => (
            <article key={plan} className={plan === "pro" ? "pricing-card featured-card" : "pricing-card"}>
              <h3>{plan === "free" ? "Free" : plan === "pro" ? "Pro" : "Team"}</h3>
              <p>{t(`agentDownloads.${plan}CardDesc`)}</p>
              <ul>
                {[1, 2, 3].map((n) => (
                  <li key={n}>{t(`agentDownloads.${plan}Feature${n}`)}</li>
                ))}
              </ul>
              <a className="card-btn" href="#downloads">
                {t(`agentDownloads.choose${plan[0].toUpperCase()}${plan.slice(1)}Btn`)}
              </a>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
