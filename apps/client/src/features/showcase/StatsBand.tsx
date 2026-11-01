import CountUp from "./CountUp";
import { revealDelay } from "./motion";

export interface StatItem {
  /** Stable key — the label can change when a live figure replaces a static one. */
  id: string;
  value: number;
  suffix?: string;
  label: string;
}

interface StatsBandProps {
  items: StatItem[];
  label: string;
}

/** A row of big animated numbers. Meant to sit inside a container that uses useRevealOnScroll. */
export default function StatsBand({ items, label }: StatsBandProps) {
  return (
    <dl className="sx-stats" aria-label={label}>
      {items.map((item, index) => (
        <div key={item.id} className="sx-stat" data-reveal style={revealDelay(index)}>
          <dt className="sx-stat-label">{item.label}</dt>
          <dd className="sx-stat-value">
            <CountUp value={item.value} suffix={item.suffix} className="sx-gradient-text" />
          </dd>
        </div>
      ))}
    </dl>
  );
}
