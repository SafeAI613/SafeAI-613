import { useEffect, useState } from "react";
import { API_ENDPOINTS, apiCall } from "../../config/api";

/** Live, system-wide counts from the public GET /public-stats endpoint (no auth). */
export interface PublicStats {
  userCount: number;
  organizationCount: number;
  tenderCount: number;
}

/**
 * Loads the public counts shown on the showcase pages. Returns null until
 * they arrive — and keeps returning null if the request fails, since the
 * live numbers are a decorative extra and the pages render fine without them.
 */
export function usePublicStats(): PublicStats | null {
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    apiCall<PublicStats>(API_ENDPOINTS.publicStats, { signal: controller.signal })
      .then(setStats)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.warn("Public stats are unavailable; showing static figures only.", error);
      });

    return () => controller.abort();
  }, []);

  return stats;
}
