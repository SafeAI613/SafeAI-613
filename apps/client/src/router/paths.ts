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

  // Shared pages (outside both platforms)
  login: "/login",
  register: "/register",
  registerSuccess: "/register-success",
  forgotPassword: "/forgot-password",
  changePassword: "/change-password",
  about: "/about",
  contact: "/contact",
  privacy: "/privacy",
  becomeOrgOwner: "/become-org-owner",

  // Linked from outside the app — never move these: emails (verify / reset)
  // and PayMe's redirect after a wallet top-up.
  verifyEmail: "/verify-email/:token",
  resetPassword: "/reset-password/:token",
  paymeSuccess: "/organizations/:id/wallet/payme/success",
  paymeFail: "/organizations/:id/wallet/payme/fail",

  platform: {
    root: "/platform",
    dashboard: "/platform/dashboard",
    // Personal area (users, org owners) and system admin — each tab is
    // `<area>/<section>`, see ROLE_SECTIONS in pages/SafeAIUIPage.tsx.
    account: "/platform/account",
    admin: "/platform/admin",
    requestDetails: "/platform/requests/:id",
    organizationUsers: "/platform/organization/users",
    organizationInvoices: "/platform/organization/invoices",
    changelog: "/platform/changelog",
    // One-time display of a newly issued API key (the key arrives in navigation state)
    apiKeyCreated: "/platform/api-key-created",
  },

  hub: {
    root: "/hub",
    forum: "/hub/forum",
    forumPost: "/hub/forum/:id",
    news: "/hub/news",
    newsItem: "/hub/news/:id",
    articles: "/hub/articles",
    article: "/hub/articles/:slug",
    courses: "/hub/courses",
    guides: "/hub/guides",
    projects: "/hub/projects",
    // Community agents: marketplace (index), submit, stats, a single agent, and the desktop-app download
    agents: "/hub/agents",
    agentsSubmit: "/hub/agents/submit",
    agentsStats: "/hub/agents/stats",
    agent: "/hub/agents/:id",
    agentsDownload: "/hub/agents/download",
    // Content admin (server enforces the admin role)
    adminArticles: "/hub/admin/articles",
  },
} as const;

/**
 * Old URLs that moved, mapped to their new location. Kept so links in
 * emails, bookmarks and search results keep working (the SPA equivalent of a
 * permanent 301 redirect). Query string, hash and navigation state are
 * preserved, and `:params` in `from` are filled into `to`.
 */
export const LEGACY_REDIRECTS: ReadonlyArray<{ from: string; to: string }> = [
  { from: "/safeai-platform", to: ROUTES.platform.dashboard },
  { from: "/safeai-hub", to: ROUTES.hub.root },
  { from: "/landing-preview", to: ROUTES.home },
  // Platform — /safeai-ui is also linked from server emails (utils/email.ts)
  { from: "/safeai-ui", to: ROUTES.platform.account },
  { from: "/admin/all-requests", to: `${ROUTES.platform.admin}/all-requests` },
  { from: "/admin/organizations", to: `${ROUTES.platform.admin}/organizations` },
  { from: "/request/:id", to: ROUTES.platform.requestDetails },
  { from: "/organization/users", to: ROUTES.platform.organizationUsers },
  { from: "/organization/invoices", to: ROUTES.platform.organizationInvoices },
  { from: "/activity-log", to: ROUTES.platform.changelog },
  { from: "/api-key-display", to: ROUTES.platform.apiKeyCreated },
  // Hub — /tender-board is also linked from server emails (utils/email.ts)
  { from: "/forum", to: ROUTES.hub.forum },
  { from: "/forum/post/:id", to: ROUTES.hub.forumPost },
  { from: "/ai-news", to: ROUTES.hub.news },
  { from: "/ai-news/:id", to: ROUTES.hub.newsItem },
  { from: "/docs", to: ROUTES.hub.articles },
  { from: "/docs/:slug", to: ROUTES.hub.article },
  { from: "/docs-old", to: ROUTES.hub.articles },
  { from: "/courses", to: ROUTES.hub.courses },
  { from: "/recommended-guides", to: ROUTES.hub.guides },
  { from: "/tender-board", to: ROUTES.hub.projects },
  { from: "/agents-marketplace", to: ROUTES.hub.agents },
  { from: "/agents-marketplace/submit", to: ROUTES.hub.agentsSubmit },
  { from: "/agents-marketplace/stats", to: ROUTES.hub.agentsStats },
  { from: "/agents-marketplace/:id", to: ROUTES.hub.agent },
  { from: "/download-agents", to: ROUTES.hub.agentsDownload },
  { from: "/admin/articles", to: ROUTES.hub.adminArticles },
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
