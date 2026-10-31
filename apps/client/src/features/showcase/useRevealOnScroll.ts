import { useEffect, useRef } from "react";

const REVEALED_CLASS = "is-revealed";

/**
 * Fades elements in as they scroll into view. Mark each element with
 * `data-reveal` inside the container the returned ref is attached to; the
 * class is added once and the element is no longer observed.
 *
 * Only a class is toggled — the motion itself lives in showcase.css, where
 * `prefers-reduced-motion` turns it off.
 */
export function useRevealOnScroll<T extends HTMLElement>() {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const targets = container.querySelectorAll<HTMLElement>("[data-reveal]");

    if (!("IntersectionObserver" in window)) {
      targets.forEach((target) => target.classList.add(REVEALED_CLASS));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add(REVEALED_CLASS);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return containerRef;
}
