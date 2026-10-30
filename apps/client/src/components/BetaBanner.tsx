import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../styles/beta-banner.css";
import { ROUTES } from "../router/paths";

export default function BetaBanner() {
  const { t } = useTranslation();
  return (
    <div className="beta-banner">
      <div className="beta-banner-container">
        <div className="beta-badge">BETA</div>
        <p className="beta-text">
          {t("betaBanner.text")}
          {" "}
          <Link to={ROUTES.contact} className="beta-link">
            {t("betaBanner.feedbackLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
