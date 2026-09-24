import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/landing-page-v2.css";
import "../styles/dashboard-pages.css";
import { useAuth } from "../context/authStore";
import { API_ENDPOINTS, apiCall } from "../config/api";
import { ChatIcon } from "../features/landing/icons";
import FeedList, { type FeedItem } from "../features/dashboard/FeedList";

interface ForumPost {
  _id: string;
  title: string;
  author: { name: string };
  createdAt: string;
}

interface ForumPostsResponse {
  posts: ForumPost[];
}

// Public "before login" marketing page for SafeAI Hub (SCRUM-228) — reached
// from the gateway's Hub card. Already colored to its destination, unlike a
// generic login screen, and shows a real preview of the forum content.
export default function HubTeaserPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [postItems, setPostItems] = useState<FeedItem[]>([]);
  const [postsFailed, setPostsFailed] = useState(false);
  const [postsLoading, setPostsLoading] = useState(true);

  useEffect(() => {
    apiCall<ForumPostsResponse>(`${API_ENDPOINTS.posts}?page=1`)
      .then((data) =>
        setPostItems(
          (data.posts || []).slice(0, 3).map((post) => ({
            id: post._id,
            title: post.title,
            meta: `${post.author?.name || "משתמש"} · ${new Date(post.createdAt).toLocaleDateString("he-IL")}`,
            icon: <ChatIcon size={18} />,
            onClick: () => navigate("/forum"),
          })),
        ),
      )
      .catch(() => setPostsFailed(true))
      .finally(() => setPostsLoading(false));
  }, [navigate]);

  const continueToHub = () => {
    navigate(isAuthenticated ? "/safeai-hub" : "/login?next=/safeai-hub");
  };

  return (
    <div className="landing-v2 theme-hub" dir="rtl">
      <header className="lv2-teaser-header">
        <Link to="/" className="lv2-teaser-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
          <span>חזרה לדף הבית</span>
        </Link>
        <span className="lv2-teaser-brand">SafeAI Hub</span>
        <span className="lv2-teaser-spacer" />
      </header>

      <div className="lv2-teaser-body">
        <span className="lv2-teaser-eyebrow">לפני שנכנסים</span>
        <h1 className="lv2-teaser-heading">כל הידע והקהילה — פורום, קורסים, מדריכים ועוד</h1>

        <div className="lv2-teaser-preview">
          <FeedList
            title="פוסטים אחרונים בפורום"
            items={postItems}
            loading={postsLoading}
            failed={postsFailed}
            emptyLabel="אין עדיין פוסטים בפורום."
          />
        </div>

        <button className="lv2-teaser-cta" onClick={continueToHub}>
          התחבר והמשך ל-Hub
        </button>
      </div>
    </div>
  );
}
