import { useState, useCallback, type ReactNode } from "react";
import { cleanupTokenManager } from "../utils/tokenManager";
import { API_ENDPOINTS } from "../config/api";
import { AuthContext, type AuthUser } from "./authStore";

function readFromStorage(): { user: AuthUser | null; userRole: "admin" | "user" | null } {
  try {
    const raw = localStorage.getItem("user");
    const role = localStorage.getItem("userRole") as "admin" | "user" | null;
    return { user: raw ? JSON.parse(raw) : null, userRole: role };
  } catch {
    return { user: null, userRole: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initial = readFromStorage();
  const [user, setUserState] = useState<AuthUser | null>(initial.user);

  const userRole = (user?.role as "admin" | "user" | null) ?? null;

  const setUser = useCallback((updated: AuthUser) => {
    localStorage.setItem("user", JSON.stringify(updated));
    localStorage.setItem("userRole", updated.role ?? "");
    setUserState(updated);
  }, []);

  const logout = useCallback(() => {
    // Revoke the refresh token on the server so it can't be reused after
    // logout (OWASP Session Management: invalidate the session server-side).
    // Best effort and fire-and-forget: a plain fetch with keepalive instead of
    // apiCall(), because apiCall's 401 handling would redirect mid-logout and
    // local logout must succeed even when the server is unreachable.
    const accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");
    if (accessToken && refreshToken) {
      fetch(API_ENDPOINTS.auth.logout, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }

    cleanupTokenManager();
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("userRole");
    setUserState(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      userRole,
      isAuthenticated: !!user,
      setUser,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
