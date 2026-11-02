import { useTranslation } from "react-i18next";
import Sparkline from "./Sparkline";
import { useLocale } from "../../i18n/useLocale";

interface StatTileProps {
  label: string;
  value: number | null;
  loading: boolean;
  failed: boolean;
  trend?: number[];
}

// Plain numeric display — no count-up animation. That's reserved for the
// public landing page's stats banner (SCRUM-227); inside an authenticated
// dashboard the number should just be there when the data arrives.
//
// While loading, renders a skeleton placeholder rather than "…" text. The
// page passes the same combined `loading` flag to every tile in a row so
// they all reveal together, instead of popping in one at a time as each
// request happens to resolve.
export default function StatTile({ label, value, loading, failed, trend }: StatTileProps) {
  const { t } = useTranslation();
  const { locale } = useLocale();

  if (loading) {
    return (
      <div className="dash-stat-tile">
        <div className="dash-stat-skeleton-value" aria-hidden="true" />
        <div className="dash-stat-skeleton-label" aria-hidden="true" />
        <span className="lv2-sr-only">{t("shell.statTile.loading", { label })}</span>
      </div>
    );
  }

  return (
    <div className="dash-stat-tile">
      <div className="dash-stat-value">{failed || value === null ? "—" : value.toLocaleString(locale)}</div>
      <div className="dash-stat-label">{label}</div>
      {!failed && trend && <Sparkline values={trend} />}
    </div>
  );
}
