import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./motion";

interface CountUpProps {
  value: number;
  suffix?: string;
  durationMs?: number;
  className?: string;
}

const formatNumber = (value: number, suffix: string) => `${value.toLocaleString("he-IL")}${suffix}`;

/**
 * A number that counts up from 0 the first time it scrolls into view.
 *
 * Each frame writes straight to the DOM node instead of going through React
 * state, so the animation doesn't re-render the component ~60 times a second.
 * Screen readers get the final value from a visually hidden copy.
 */
export default function CountUp({ value, suffix = "", durationMs = 1600, className }: CountUpProps) {
  const numberRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = numberRef.current;
    if (!element) return;

    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      element.textContent = formatNumber(value, suffix);
      return;
    }

    let frameId = 0;

    const animate = () => {
      const startedAt = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - startedAt) / durationMs, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        element.textContent = formatNumber(Math.round(value * eased), suffix);
        if (progress < 1) frameId = requestAnimationFrame(tick);
      };
      frameId = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        animate();
      },
      { threshold: 0.4 },
    );
    observer.observe(element);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, [value, suffix, durationMs]);

  return (
    <span className={className}>
      <span ref={numberRef} aria-hidden="true">
        {formatNumber(0, suffix)}
      </span>
      <span className="sx-sr-only">{formatNumber(value, suffix)}</span>
    </span>
  );
}
