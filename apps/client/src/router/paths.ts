// Single source of truth for every client URL.
//
// The site is a gateway (`/`) in front of two platforms, each living under
// its own prefix with its own layout:
//   /platform/*  — SafeAI Platform: using SafeAI as an AI provider (requires login)
//   /hub/*       — SafeAI Hub: knowledge & community (public reading, login to act)
// Auth and general pages (about, contact, privacy) stay at the root, shared by both.
//
// Never hard-code a path string in a component — import it from here, so a
// route can move without hunting for every link that points at it.

export const ROUTES = {
  home: "/",

  // Shared auth pages
  login: "/login",
  register: "/register",

  platform: {
    root: "/platform",
    dashboard: "/platform/dashboard",
  },

  hub: {
    root: "/hub",
  },
} as const;

/**
 * Old URLs that moved, mapped to their new location. Kept so links in
 * emails, bookmarks and search results keep working (the SPA equivalent of a
 * permanent 301 redirect). Query string and hash are preserved.
 */
export const LEGACY_REDIRECTS: ReadonlyArray<{ from: string; to: string }> = [
  { from: "/safeai-platform", to: ROUTES.platform.dashboard },
  { from: "/safeai-hub", to: ROUTES.hub.root },
  { from: "/landing-preview", to: ROUTES.home },
];

/**
 * Returns `path` only if it is a same-site relative path, otherwise `fallback`.
 * Guards every `?next=` redirect against open-redirects to another origin.
 */
export function safeNextPath(path: string | null | undefined, fallback: string = ROUTES.home): string {
  return path && path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}

/** Login URL that returns the user to `next` after a successful login. */
export function loginPath(next: string): string {
  return `${ROUTES.login}?next=${encodeURIComponent(next)}`;
}
