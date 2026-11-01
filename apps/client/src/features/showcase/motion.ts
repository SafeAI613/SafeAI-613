import type { CSSProperties } from "react";

/** True when the visitor asked the OS to minimise motion — animations must then render their final state at once. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Stagger index for an element marked with `data-reveal` — the CSS multiplies
 * it into the reveal animation's delay, so siblings appear one after another.
 */
export function revealDelay(index: number): CSSProperties {
  return { "--reveal-index": index } as CSSProperties;
}
