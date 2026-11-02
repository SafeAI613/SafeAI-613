import { useTranslation } from "react-i18next";
import type { LimitsStatus } from "../../hooks/useUsageData";

interface Props {
  limitsStatus: LimitsStatus;
}

function ProgressBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? (used / limit) * 100 : 0;
  const color = pct > 90 ? "var(--color-danger)" : pct > 70 ? "var(--color-warning)" : "var(--color-success)";
  return (
    <div style={{ width: "100%", height: "20px", backgroundColor: "var(--gray-200)", borderRadius: "var(--radius-pill)", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", backgroundColor: color, transition: "width 0.3s ease" }} />
    </div>
  );
}

export default function BudgetCard({ limitsStatus }: Props) {
  const { t } = useTranslation();
  const { perMinute, perDay } = limitsStatus.rateLimits;
  const { budget } = limitsStatus;

  return (
    <div className="card" style={{ marginTop: "24px" }}>
      <h3>{t("userDashboard.rateLimitsTitle")}</h3>
      <div style={{ marginTop: "16px" }}>
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span>{t("userDashboard.perMinuteLabel")}</span>
            <span>{perMinute.used} / {perMinute.limit}</span>
          </div>
          <ProgressBar used={perMinute.used} limit={perMinute.limit} />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span>{t("userDashboard.perDayLabel")}</span>
            <span>{perDay.used} / {perDay.limit}</span>
          </div>
          <ProgressBar used={perDay.used} limit={perDay.limit} />
        </div>

        {budget && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span>{t("userDashboard.monthlyBudgetLabel")}</span>
              <span>${budget.currentSpent.toFixed(4)} / ${budget.monthlyLimit.toFixed(2)}</span>
            </div>
            <ProgressBar used={budget.currentSpent} limit={budget.monthlyLimit} />
            <p style={{ marginTop: "8px", fontSize: "14px", color: "var(--text-muted)" }}>
              {t("userDashboard.remainingBudget", { amount: budget.remaining.toFixed(4), percent: (100 - budget.percentUsed).toFixed(1) })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
