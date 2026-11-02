import { useEffect, useState, useCallback } from "react";
import { Link, generatePath } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiCall, API_ENDPOINTS } from "../config/api";
import "./admin-articles-page.css";
import { ROUTES } from "../router/paths";
import { useLocale } from "../i18n/useLocale";

interface Article {
  _id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  published: boolean;
  content: string;
  createdAt: string;
}

interface ArticleForm {
  title: string;
  slug: string;
  description: string;
  category: string;
  content: string;
  published: boolean;
}

// The default category is a translated label, so the empty form is built at
// render time (with t()) rather than as a module-level constant.
function emptyForm(defaultCategory: string): ArticleForm {
  return {
    title: "",
    slug: "",
    description: "",
    category: defaultCategory,
    content: "",
    published: true,
  };
}

export default function AdminArticlesPage() {
  const { t } = useTranslation();
  const { dir, locale } = useLocale();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editSlug, setEditSlug] = useState<string | null>(null);
  const [form, setForm] = useState<ArticleForm>(() => emptyForm(t("adminArticles.defaultCategory")));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const data = await apiCall<{ success: boolean; articles: Article[] }>(
        API_ENDPOINTS.articles.all,
        { signal }
      );
      setArticles(data.articles);
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError(t("adminArticles.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const openNew = () => {
    setForm(emptyForm(t("adminArticles.defaultCategory")));
    setEditSlug(null);
    setShowForm(true);
    setError(null);
  };

  const openEdit = (article: Article) => {
    setForm({
      title: article.title,
      slug: article.slug,
      description: article.description,
      category: article.category,
      content: article.content,
      published: article.published,
    });
    setEditSlug(article.slug);
    setShowForm(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!form.title || !form.slug || !form.content) {
      setError(t("adminArticles.requiredFields"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editSlug) {
        await apiCall(API_ENDPOINTS.articles.bySlug(editSlug), {
          method: "PUT",
          body: JSON.stringify(form),
        });
      } else {
        await apiCall(API_ENDPOINTS.articles.list, {
          method: "POST",
          body: JSON.stringify(form),
        });
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError((err as Error).message || t("adminArticles.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(t("adminArticles.confirmDelete"))) return;
    try {
      await apiCall(API_ENDPOINTS.articles.bySlug(slug), { method: "DELETE" });
      load();
    } catch (err) {
      setError((err as Error).message || t("adminArticles.deleteError"));
    }
  };

  const autoSlug = (title: string) =>
    title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w֐-׿-]/g, "");

  return (
    <div className="admin-articles-page" dir={dir}>
      <div className="admin-articles-header">
        <h1>{t("adminArticles.title")}</h1>
        <button className="admin-articles-new-btn" onClick={openNew}>
          {t("adminArticles.newArticleButton")}
        </button>
      </div>

      {error && <div className="admin-articles-error">{error}</div>}

      {showForm && (
        <div className="admin-articles-form-overlay">
          <div className="admin-articles-form">
            <h2>{editSlug ? t("adminArticles.editArticle") : t("adminArticles.newArticle")}</h2>

            <label>{t("adminArticles.titleLabel")}</label>
            <input
              value={form.title}
              onChange={(e) => {
                const title = e.target.value;
                setForm((f) => ({
                  ...f,
                  title,
                  slug: f.slug || autoSlug(title),
                }));
              }}
              placeholder={t("adminArticles.titlePlaceholder")}
            />

            <label>{t("adminArticles.slugLabel")}</label>
            <input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="my-article-slug"
              dir="ltr"
            />

            <label>{t("adminArticles.descriptionLabel")}</label>
            <input
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder={t("adminArticles.descriptionPlaceholder")}
            />

            <label>{t("adminArticles.categoryLabel")}</label>
            <input
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
              placeholder={t("adminArticles.defaultCategory")}
            />

            <label>{t("adminArticles.contentLabel")}</label>
            <textarea
              value={form.content}
              onChange={(e) =>
                setForm((f) => ({ ...f, content: e.target.value }))
              }
              placeholder={t("adminArticles.contentPlaceholder")}
              rows={16}
              dir={dir}
            />

            <label className="admin-articles-checkbox-label">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) =>
                  setForm((f) => ({ ...f, published: e.target.checked }))
                }
              />
              {t("adminArticles.publishLabel")}
            </label>

            {error && <div className="admin-articles-error">{error}</div>}

            <div className="admin-articles-form-actions">
              <button
                className="admin-articles-save-btn"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? t("common.saving") : t("common.save")}
              </button>
              <button
                className="admin-articles-cancel-btn"
                onClick={() => setShowForm(false)}
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="admin-articles-loading">{t("common.loading")}</div>
      ) : (
        <table className="admin-articles-table">
          <thead>
            <tr>
              <th>{t("adminArticles.colTitle")}</th>
              <th>{t("adminArticles.colSlug")}</th>
              <th>{t("adminArticles.colCategory")}</th>
              <th>{t("adminArticles.colPublished")}</th>
              <th>{t("adminArticles.colDate")}</th>
              <th>{t("adminArticles.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {articles.length === 0 && (
              <tr>
                <td colSpan={6} className="admin-articles-empty">
                  {t("adminArticles.empty")}
                </td>
              </tr>
            )}
            {articles.map((a) => (
              <tr key={a._id}>
                <td>{a.title}</td>
                <td dir="ltr">{a.slug}</td>
                <td>{a.category}</td>
                <td>
                  <span
                    role="img"
                    aria-label={a.published ? t("adminArticles.published") : t("adminArticles.notPublished")}
                    title={a.published ? t("adminArticles.published") : t("adminArticles.notPublished")}
                  >
                    {a.published ? "✅" : "❌"}
                  </span>
                </td>
                <td>{new Date(a.createdAt).toLocaleDateString(locale)}</td>
                <td className="admin-articles-actions">
                  <button onClick={() => openEdit(a)}>{t("common.edit")}</button>
                  <button
                    className="admin-articles-delete-btn"
                    onClick={() => handleDelete(a.slug)}
                  >
                    {t("common.delete")}
                  </button>
                  <Link
                    to={generatePath(ROUTES.hub.article, { slug: a.slug })}
                    target="_blank"
                    rel="noreferrer"
                    className="admin-articles-view-link"
                  >
                    {t("adminArticles.view")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}