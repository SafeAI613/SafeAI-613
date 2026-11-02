import { useEffect, useState } from "react";
import { generatePath, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/authStore";
import { useLocale } from "../i18n/useLocale";
import { API_ENDPOINTS, apiCall } from "../config/api";
import { ChatIcon, NewsIcon } from "../features/landing/icons";
import FeedList, { type FeedItem } from "../features/dashboard/FeedList";
import { ROUTES } from "../router/paths";

interface ForumPost {
  _id: string;
  title: string;
  author: { name: string };
  createdAt: string;
}

interface ForumPostsResponse {
  posts: ForumPost[];
}

interface NewsItem {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
}

function truncate(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength).trimEnd()}…`;
}

export default function SafeAIHubHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { locale } = useLocale();

  const [postItems, setPostItems] = useState<FeedItem[]>([]);
  const [postsFailed, setPostsFailed] = useState(false);
  const [postsLoading, setPostsLoading] = useState(true);

  const [newsItems, setNewsItems] = useState<FeedItem[]>([]);
  const [newsFailed, setNewsFailed] = useState(false);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    const role = user?.role || "user";
    apiCall<ForumPostsResponse>(`${API_ENDPOINTS.posts}?page=1&userRole=${role}`)
      .then((data) =>
        setPostItems(
          (data.posts || []).slice(0, 3).map((post) => ({
            id: post._id,
            title: post.title,
            meta: `${post.author?.name || t("shell.feed.defaultAuthor")} · ${new Date(post.createdAt).toLocaleDateString(locale)}`,
            icon: <ChatIcon size={18} />,
            onClick: () => navigate(generatePath(ROUTES.hub.forumPost, { id: post._id })),
          })),
        ),
      )
      .catch(() => setPostsFailed(true))
      .finally(() => setPostsLoading(false));
  }, [navigate, user?.role, t, locale]);

  useEffect(() => {
    apiCall<NewsItem[]>(`${API_ENDPOINTS.news}?limit=3`)
      .then((items) =>
        setNewsItems(
          items.map((item) => ({
            id: item._id,
            title: item.title,
            meta: new Date(item.createdAt).toLocaleDateString(locale),
            description: truncate(item.content, 60),
            icon: <NewsIcon size={14} />,
            onClick: () => navigate(generatePath(ROUTES.hub.newsItem, { id: item._id })),
          })),
        ),
      )
      .catch(() => setNewsFailed(true))
      .finally(() => setNewsLoading(false));
  }, [navigate, locale]);

  return (
    <>
      <span className="dash-eyebrow">SafeAI Hub</span>
      <h1 className="dash-title">
        {user?.name ? t("hubHome.greetingNamed", { name: user.name }) : t("hubHome.greeting")}
      </h1>
      <p className="dash-subtitle">{t("hubHome.subtitle")}</p>

      <div className="dash-feeds-lead">
        <FeedList
          title={t("hubHome.postsTitle")}
          items={postItems}
          loading={postsLoading}
          failed={postsFailed}
          emptyLabel={t("hubHome.postsEmpty")}
          variant="cards"
        />
        <FeedList
          title={t("hubHome.updatesTitle")}
          items={newsItems}
          loading={newsLoading}
          failed={newsFailed}
          emptyLabel={t("hubHome.updatesEmpty")}
          variant="updates"
        />
      </div>
    </>
  );
}
