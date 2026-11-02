import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../styles/footer.css";
import { ROUTES } from "../router/paths";

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="site-footer">
      <div className="site-footer-container">
        <span className="site-footer-copyright">
          © {new Date().getFullYear()} SafeAI613
        </span>
        <Link to={ROUTES.privacy} className="site-footer-link">
          {t("shell.footer.privacy")}
        </Link>
      </div>
    </footer>
  );
}
