import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";
import { apiCall, API_ENDPOINTS } from "../config/api";
import { SEO } from "../components/SEO";
import "./article-page.css";
import { ROUTES } from "../router/paths";
import { useLocale } from "../i18n/useLocale";

interface Article {
  _id: string;
  title: string;
  slug: string;
  content: string;
  description: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export default function ArticlePage() {
  const { t } = useTranslation();
  const { dir, locale } = useLocale();
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!slug) return;
      try {
        setLoading(true);
        const data = await apiCall<{ success: boolean; article: Article }>(
          API_ENDPOINTS.articles.bySlug(slug),
          { signal }
        );
        setArticle(data.article);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(t("articlePage.notFound"));
        }
      } finally {
        setLoading(false);
      }
    },
    [slug, t]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (loading) return <div className="article-page-loading" dir={dir}>{t("articlePage.loading")}</div>;
  if (error || !article)
    return (
      <div className="article-page-error" dir={dir}>
        <p>{error || t("articlePage.notFound")}</p>
        <Link to={ROUTES.hub.articles} className="article-back-link">{t("articlePage.backToDocs")}</Link>
      </div>
    );

  return (
    <div className="article-page" dir={dir}>
      <SEO
        title={article.title}
        description={article.description || article.title}
        keywords={article.category}
        canonicalUrl={`https://safeai613.com/docs/${article.slug}`}
      />
      <div className="article-container">
        <Link to={ROUTES.hub.articles} className="article-back-link">{t("articlePage.backToDocs")}</Link>

        <div className="article-header">
          <span className="article-category">{article.category}</span>
          <h1 className="article-title">{article.title}</h1>
          {article.description && (
            <p className="article-description">{article.description}</p>
          )}
          <div className="article-meta">
            <span>{new Date(article.createdAt).toLocaleDateString(locale)}</span>
          </div>
        </div>

        <div className="article-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {article.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}