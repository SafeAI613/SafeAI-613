import { useTranslation } from "react-i18next";
import type { OrganizationStats } from "./UsersManagement";

interface Props {
  stats: OrganizationStats;
  orgName: string;
  orgDescription: string;
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ backgroundColor: "var(--bg-surface)", padding: "15px", borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-sm)" }}>
      <div style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "5px" }}>{label}</div>
      <div style={{ fontSize: "24px", fontWeight: "bold", color }}>{value}</div>
    </div>
  );
}

export default function OrgStatsPanel({ stats, orgName, orgDescription }: Props) {
  const { t } = useTranslation();
  return (
    <div style={{ backgroundColor: "var(--bg-elevated)", borderRadius: "var(--radius-sm)", padding: "20px", marginBottom: "20px" }}>
      <h3 style={{ marginTop: 0, marginBottom: "15px", color: "var(--text-secondary)" }}>
        📊 {t("usersManagement.orgStatsTitle", { name: orgName })}
      </h3>
      <p>{orgDescription}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}>
        <StatBox label={t("usersManagement.statTotalUsersLabel")} value={String(stats.totalUsers)} color="var(--color-info)" />
        <StatBox label={t("statistics.activeUsersLabel")} value={String(stats.activeUsers)} color="var(--color-success)" />
        <StatBox label={t("usersManagement.statTotalMonthlyCostLabel")} value={`$${stats.totalCost.toFixed(2)}`} color="var(--color-danger)" />
        <StatBox label={t("usersManagement.statAvgPerUserLabel")} value={`$${stats.averageCostPerUser.toFixed(2)}`} color="var(--color-warning)" />
      </div>
    </div>
  );
}
