import { useEffect, useState } from "react";
import { generatePath, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/authStore";
import { useLocale } from "../i18n/useLocale";
import { API_ENDPOINTS, apiCall } from "../config/api";
import ChecklistStep from "../features/dashboard/ChecklistStep";
import StatTile from "../features/dashboard/StatTile";
import FeedList, { type FeedItem } from "../features/dashboard/FeedList";
import { ROUTES } from "../router/paths";

interface UsageStats {
  totalRequests: number;
  totalTokens: number;
}

interface DailyUsage {
  _id: string;
  requests: number;
  tokens: number;
}

interface ProviderKey {
  _id: string;
  userId?: string;
  isActive: boolean;
}

interface NewsItem {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
}

// GET /usage/daily only returns rows for days that actually had usage — days
// with none are simply absent. Fill the gaps with 0 so the sparkline always
// gets one point per one of the last 7 calendar days, in order.
function buildLast7DaySeries(daily: DailyUsage[], key: "requests" | "tokens"): number[] {
  const byDate = new Map(daily.map((entry) => [entry._id, entry[key]]));
  const series: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    series.push(byDate.get(date.toISOString().slice(0, 10)) ?? 0);
  }
  return series;
}

export default function SafeAIPlatformHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { locale } = useLocale();

  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [usageFailed, setUsageFailed] = useState(false);
  const [usageLoading, setUsageLoading] = useState(true);

  const [requestsTrend, setRequestsTrend] = useState<number[] | undefined>(undefined);
  const [tokensTrend, setTokensTrend] = useState<number[] | undefined>(undefined);

  const [activeKeysCount, setActiveKeysCount] = useState<number | null>(null);
  const [keysFailed, setKeysFailed] = useState(false);
  const [keysLoading, setKeysLoading] = useState(true);

  const [newsItems, setNewsItems] = useState<FeedItem[]>([]);
  const [newsFailed, setNewsFailed] = useState(false);
  const [newsLoading, setNewsLoading] = useState(true);

  // All three stat tiles reveal together once every source they depend on
  // has settled — one still loading would otherwise leave the row popping
  // in one tile at a time as each request happens to resolve.
  const statsRowLoading = usageLoading || keysLoading;

  useEffect(() => {
    apiCall<UsageStats>(API_ENDPOINTS.usage.stats)
      .then(setUsage)
      .catch(() => setUsageFailed(true))
      .finally(() => setUsageLoading(false));
  }, []);

  useEffect(() => {
    apiCall<DailyUsage[]>(API_ENDPOINTS.usage.daily)
      .then((daily) => {
        setRequestsTrend(buildLast7DaySeries(daily, "requests"));
        setTokensTrend(buildLast7DaySeries(daily, "tokens"));
      })
      .catch(() => {
        // Sparklines are a decorative addition — if the daily breakdown fails
        // to load, the tiles just fall back to showing no trend line.
      });
  }, []);

  useEffect(() => {
    if (!user?._id) return;
    apiCall<ProviderKey[]>(API_ENDPOINTS.providerKeys)
      .then((keys) => setActiveKeysCount(keys.filter((k) => k.userId === user._id && k.isActive).length))
      .catch(() => setKeysFailed(true))
      .finally(() => setKeysLoading(false));
  }, [user?._id]);

  useEffect(() => {
    apiCall<NewsItem[]>(`${API_ENDPOINTS.news}?limit=3`)
      .then((items) =>
        setNewsItems(
          items.map((item) => ({
            id: item._id,
            title: item.title,
            meta: new Date(item.createdAt).toLocaleDateString(locale),
            onClick: () => navigate(generatePath(ROUTES.hub.newsItem, { id: item._id })),
          })),
        ),
      )
      .catch(() => setNewsFailed(true))
      .finally(() => setNewsLoading(false));
  }, [navigate, locale]);

  return (
    <>
      <span className="dash-eyebrow">SafeAI Platform</span>
      <h1 className="dash-title">
        {user?.name ? t("platformHome.greetingNamed", { name: user.name }) : t("platformHome.greeting")}
      </h1>
      <p className="dash-subtitle">{t("platformHome.subtitle")}</p>

      <h2 className="dash-section-title">{t("platformHome.getStarted")}</h2>
      <div className="dash-getstarted-card">
        <ChecklistStep
          step={1}
          label={t("platformHome.createKey")}
          description={t("platformHome.createKeyDesc")}
          done={!keysLoading && !!activeKeysCount}
          path={`${ROUTES.platform.account}/api-keys`}
        />
        <ChecklistStep
          step={2}
          label={t("platformHome.firstCall")}
          description={t("platformHome.firstCallDesc")}
          done={!usageLoading && !!usage?.totalRequests}
          path={ROUTES.hub.articles}
        />
      </div>

      <div className="dash-stats-row">
        <StatTile
          label={t("platformHome.requests7d")}
          value={usage?.totalRequests ?? null}
          loading={statsRowLoading}
          failed={usageFailed}
          trend={requestsTrend}
        />
        <StatTile
          label={t("platformHome.tokensUsed")}
          value={usage?.totalTokens ?? null}
          loading={statsRowLoading}
          failed={usageFailed}
          trend={tokensTrend}
        />
        <StatTile
          label={t("platformHome.activeKeys")}
          value={activeKeysCount}
          loading={statsRowLoading}
          failed={keysFailed}
        />
      </div>

      <div className="dash-feeds">
        <FeedList
          title={t("platformHome.recentUpdates")}
          items={newsItems}
          loading={newsLoading}
          failed={newsFailed}
          emptyLabel={t("platformHome.updatesEmpty")}
        />
      </div>
    </>
  );
}
