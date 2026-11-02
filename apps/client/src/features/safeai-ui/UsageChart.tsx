import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useTranslation } from "react-i18next";
import { useLocale } from "../../i18n/useLocale";
import type { UsageStats, DailyUsage, ModelUsage } from "../../hooks/useUsageData";

interface Props {
  usageStats: UsageStats;
  dailyUsage: DailyUsage[];
  modelUsage: ModelUsage[];
}

export default function UsageChart({ usageStats, dailyUsage, modelUsage }: Props) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const shortDate = (v: unknown) => new Date(v as string).toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
  const fullDate = (v: unknown) => new Date(v as string).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
  return (
    <>
      <div className="card" style={{ marginTop: "24px" }}>
        <h3>{t("userDashboard.usageStatsTitle")}</h3>
        <div className="dashboard-grid" style={{ marginTop: "16px" }}>
          <div className="stat-card">
            <h4>{t("userDashboard.totalTokensLabel")}</h4>
            <p className="stat-value">{usageStats.totalTokens.toLocaleString(locale)}</p>
            <p className="stat-change">{t("userDashboard.avgTokensPerRequest", { avg: Math.round(usageStats.totalTokens / (usageStats.totalRequests || 1)) })}</p>
          </div>
          <div className="stat-card">
            <h4>{t("userDashboard.avgResponseTimeLabel")}</h4>
            <p className="stat-value">{Math.round(usageStats.avgResponseTime)}ms</p>
          </div>
          <div className="stat-card">
            <h4>{t("userDashboard.totalCostLabel")}</h4>
            <p className="stat-value">${usageStats.totalCost.toFixed(4)}</p>
          </div>
          <div className="stat-card">
            <h4>{t("userDashboard.successRateLabel")}</h4>
            <p className="stat-value">
              {((usageStats.successfulRequests / (usageStats.totalRequests || 1)) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {dailyUsage.length > 0 && (
        <div className="card" style={{ marginTop: "24px" }}>
          <h3>{t("userDashboard.dailyUsageTitle")}</h3>
          <ResponsiveContainer width="100%" height={300} style={{ marginTop: "16px" }}>
            <LineChart data={dailyUsage}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="_id" tickFormatter={shortDate} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip labelFormatter={fullDate} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="requests" stroke="#8884d8" name={t("userDashboard.chartRequestsLabel")} />
              <Line yAxisId="right" type="monotone" dataKey="tokens" stroke="#82ca9d" name={t("userDashboard.chartTokensLabel")} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {modelUsage.length > 0 && (
        <div className="card" style={{ marginTop: "24px" }}>
          <h3>{t("userDashboard.modelUsageTitle")}</h3>
          <div style={{ overflowX: "auto", marginTop: "16px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-default)" }}>
                  <th style={{ padding: "12px", textAlign: "start" }}>{t("userDashboard.modelHeaderLabel")}</th>
                  <th style={{ padding: "12px", textAlign: "start" }}>{t("userDashboard.providerHeaderLabel")}</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>{t("userDashboard.requestsHeaderLabel")}</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>{t("userDashboard.chartTokensLabel")}</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>{t("userDashboard.costHeaderLabel")}</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>{t("userDashboard.freeHeaderLabel")}</th>
                </tr>
              </thead>
              <tbody>
                {modelUsage.map((m, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-muted)" }}>
                    <td style={{ padding: "12px" }}>{m._id.model}</td>
                    <td style={{ padding: "12px" }}><span className="badge badge-secondary">{m._id.provider}</span></td>
                    <td style={{ padding: "12px", textAlign: "center" }}>{m.requests}</td>
                    <td style={{ padding: "12px", textAlign: "center" }}>{m.tokens.toLocaleString(locale)}</td>
                    <td style={{ padding: "12px", textAlign: "center" }}>${m.cost.toFixed(4)}</td>
                    <td style={{ padding: "12px", textAlign: "center" }}><span aria-label={m.isFree ? t("userDashboard.freeYes") : t("userDashboard.freeNo")}>{m.isFree ? "✅" : "❌"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
