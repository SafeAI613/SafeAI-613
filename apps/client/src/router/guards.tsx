import type { ReactNode } from "react";
import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/authStore";
import { loginPath, safeNextPath } from "./paths";

// Tokens live only in localStorage (see utils/tokenManager); the user object
// comes from AuthContext, the single source of truth for auth state.
function hasSession(isAuthenticated: boolean): boolean {
  return isAuthenticated && !!localStorage.getItem("accessToken");
}

/** Renders children only for a logged-in user; otherwise sends them to login and back here afterwards. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!hasSession(isAuthenticated)) {
    return <Navigate to={loginPath(location.pathname + location.search + location.hash)} replace />;
  }

  return <>{children}</>;
}

/**
 * Renders children only for a guest. A logged-in user is sent to `?next=`
 * when present, else to `redirectTo` (e.g. a platform's teaser page sends a
 * logged-in user straight into that platform).
 */
export function PublicRoute({ children, redirectTo }: { children: ReactNode; redirectTo?: string }) {
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();

  // Also require a refresh token, so a half-finished registration (user
  // stored, tokens not yet issued) is not bounced away from the auth pages.
  if (hasSession(isAuthenticated) && localStorage.getItem("refreshToken")) {
    return <Navigate to={safeNextPath(searchParams.get("next"), redirectTo)} replace />;
  }

  return <>{children}</>;
}
