import { Trans, useTranslation } from "react-i18next";
import "../styles/privacy-page.css";

interface ProviderRow {
  provider: string;
  purpose: string;
  data: string;
}

// Inline markup allowed inside translated paragraphs (e.g. "<strong>...</strong>").
const RICH_TEXT_COMPONENTS = { strong: <strong /> };

export default function PrivacyPolicyPage() {
  const { t } = useTranslation();

  // Bullet lists are stored as arrays in the locale files.
  const list = (key: string) => t(key, { returnObjects: true }) as string[];
  const renderList = (key: string) => (
    <ul>
      {list(key).map((item, idx) => (
        <li key={idx}>{item}</li>
      ))}
    </ul>
  );

  const providerRows = t("privacyPage.s4.rows", { returnObjects: true }) as ProviderRow[];

  return (
    <div className="privacy-page">
      <div className="privacy-container">
        <h1>{t("privacyPage.title")}</h1>
        <p className="privacy-updated">{t("privacyPage.lastUpdated")}</p>

        <section className="privacy-section">
          <h2>{t("privacyPage.s1.heading")}</h2>
          <p>{t("privacyPage.s1.p1")}</p>
          <p>{t("privacyPage.s1.p2")}</p>
          <p>{t("privacyPage.s1.p3")}</p>
        </section>

        <section className="privacy-section">
          <h2>{t("privacyPage.s2.heading")}</h2>
          <p>{t("privacyPage.s2.intro")}</p>
          <h3>{t("privacyPage.s2.registrationHeading")}</h3>
          {renderList("privacyPage.s2.registrationList")}

          <h3>{t("privacyPage.s2.contentHeading")}</h3>
          {renderList("privacyPage.s2.contentList")}

          <h3>{t("privacyPage.s2.technicalHeading")}</h3>
          {renderList("privacyPage.s2.technicalList")}
          <p>
            <Trans i18nKey="privacyPage.s2.noAnalytics" components={RICH_TEXT_COMPONENTS} />
          </p>
        </section>

        <section className="privacy-section">
          <h2>{t("privacyPage.s3.heading")}</h2>
          <p>{t("privacyPage.s3.intro")}</p>
          {renderList("privacyPage.s3.list")}
          <p>{t("privacyPage.s3.p")}</p>
        </section>

        <section className="privacy-section">
          <h2>{t("privacyPage.s4.heading")}</h2>
          <p>{t("privacyPage.s4.intro")}</p>
          <table>
            <thead>
              <tr>
                <th>{t("privacyPage.s4.colProvider")}</th>
                <th>{t("privacyPage.s4.colPurpose")}</th>
                <th>{t("privacyPage.s4.colData")}</th>
              </tr>
            </thead>
            <tbody>
              {providerRows.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.provider}</td>
                  <td>{row.purpose}</td>
                  <td>{row.data}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>{t("privacyPage.s4.p")}</p>
        </section>

        <section className="privacy-section">
          <h2>{t("privacyPage.s5.heading")}</h2>
          <p>
            <Trans i18nKey="privacyPage.s5.p1" components={RICH_TEXT_COMPONENTS} />
          </p>
          <p>{t("privacyPage.s5.p2")}</p>
        </section>

        <section className="privacy-section">
          <h2>{t("privacyPage.s6.heading")}</h2>
          <p>{t("privacyPage.s6.intro")}</p>
          {renderList("privacyPage.s6.list")}
          <p>{t("privacyPage.s6.p")}</p>
        </section>

        <section className="privacy-section">
          <h2>{t("privacyPage.s7.heading")}</h2>
          <p>{t("privacyPage.s7.intro")}</p>
          {renderList("privacyPage.s7.list")}
        </section>

        <section className="privacy-section">
          <h2>{t("privacyPage.s8.heading")}</h2>
          <p>{t("privacyPage.s8.intro")}</p>
          {renderList("privacyPage.s8.list")}
          <p>{t("privacyPage.s8.p1")}</p>
          <p>{t("privacyPage.s8.p2")}</p>
        </section>

        <section className="privacy-section">
          <h2>{t("privacyPage.s9.heading")}</h2>
          <p>{t("privacyPage.s9.p1")}</p>
          <p>{t("privacyPage.s9.p2")}</p>
        </section>

        <section className="privacy-section">
          <h2>{t("privacyPage.s10.heading")}</h2>
          <p>{t("privacyPage.s10.p")}</p>
        </section>

        <section className="privacy-section">
          <h2>{t("privacyPage.s11.heading")}</h2>
          <div className="privacy-contact-box">
            <p>{t("privacyPage.s11.p")}</p>
            <p>
              <a href="mailto:support@safeai613.com">support@safeai613.com</a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
