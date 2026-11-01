import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SEO } from "../components/SEO";
import { ROUTES } from "../router/paths";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <section className="not-found">
      <SEO title={t("notFound.seoTitle")} description={t("notFound.message")} noIndex />
      <span className="not-found-code" aria-hidden="true">
        404
      </span>
      <h1 className="not-found-title">{t("notFound.message")}</h1>
      <Link to={ROUTES.home} className="btn btn-primary">
        {t("notFound.backHome")}
      </Link>
    </section>
  );
}
