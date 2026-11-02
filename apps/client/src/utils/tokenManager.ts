/**
 * Token Manager Utility
 * Handles token refresh, expiration detection, and session management
 */

import { API_ENDPOINTS } from '../config/api';
import { appUrl, ROUTES } from '../router/paths';

interface TokenRefreshResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
}

// Track if we're currently refreshing to avoid multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

// Track user activity
let lastActivityTime = Date.now();
let activityCheckInterval: number | null = null;
let sessionWarningTimeout: number | null = null;

// Configuration
const INACTIVITY_WARNING_TIME = 14 * 60 * 1000; // 14 minutes (before 15min token expiry)
const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'];

/**
 * Subscribe to token refresh completion
 */
function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

/**
 * Notify all subscribers when token is refreshed
 */
function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (!refreshToken) {
    console.error('No refresh token available');
    return null;
  }

  if (isRefreshing) {
    // Wait for the ongoing refresh to complete
    return new Promise((resolve) => {
      subscribeTokenRefresh((token: string) => {
        resolve(token);
      });
    });
  }

  isRefreshing = true;

  try {
    const response = await fetch(API_ENDPOINTS.auth.login.replace('/login', '/refresh'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data: TokenRefreshResponse = await response.json();

    if (data.success && data.accessToken) {
      // Update tokens in localStorage
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      
      // Notify subscribers
      onTokenRefreshed(data.accessToken);
      
      return data.accessToken;
    }

    throw new Error('Invalid refresh response');
  } catch (error) {
    console.error('Token refresh error:', error);
    
    // Clear tokens and redirect to login
    handleSessionExpired();
    
    return null;
  } finally {
    isRefreshing = false;
  }
}

/**
 * Handle session expiration - show warning or logout
 */
export function handleSessionExpired() {
  // Clear all auth data
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('userRole');
  
  // Stop activity tracking
  stopActivityTracking();
  
  // Redirect to the app's home page (respecting the deploy base path, e.g. /console/)
  window.location.href = appUrl(ROUTES.home);
}

/** Event the app listens to in order to show the in-app session warning dialog. */
export const SESSION_WARNING_EVENT = 'safeai:session-warning';

/**
 * Called when the warning timer fires. The user is warned only after a real
 * idle period: if there was activity since the timer was scheduled, the timer
 * is simply rescheduled for the remaining idle time (OWASP idle-timeout
 * guidance; WCAG 2.2.1 "Timing Adjustable" — warn before ending a session and
 * let the user extend it).
 */
function showSessionWarning() {
  const idleFor = Date.now() - lastActivityTime;
  if (idleFor < INACTIVITY_WARNING_TIME) {
    scheduleWarning(INACTIVITY_WARNING_TIME - idleFor);
    return;
  }

  // Let the React layer render an accessible, non-blocking dialog
  // (SessionWarningDialog) instead of a blocking window.confirm.
  window.dispatchEvent(new CustomEvent(SESSION_WARNING_EVENT));
}

/**
 * User chose to stay signed in from the session warning dialog.
 */
export async function extendSession(): Promise<boolean> {
  updateActivity();
  const token = await refreshAccessToken();
  if (!token) {
    handleSessionExpired();
    return false;
  }
  resetActivityTimer();
  return true;
}

/**
 * Update last activity time
 */
function updateActivity() {
  lastActivityTime = Date.now();
}

/**
 * Reset activity timer and schedule next warning
 */
function resetActivityTimer() {
  scheduleWarning(INACTIVITY_WARNING_TIME);
}

function scheduleWarning(delayMs: number) {
  if (sessionWarningTimeout) {
    clearTimeout(sessionWarningTimeout);
  }
  sessionWarningTimeout = setTimeout(showSessionWarning, delayMs);
}

/**
 * Check if user has been active and refresh token if needed
 */
function checkActivityAndRefresh() {
  const timeSinceActivity = Date.now() - lastActivityTime;
  
  // If user has been active in the last 10 minutes, refresh the token
  if (timeSinceActivity < TOKEN_REFRESH_INTERVAL) {
    refreshAccessToken();
  }
}

/**
 * Start tracking user activity
 */
export function startActivityTracking() {
  // Update activity on user interactions
  ACTIVITY_EVENTS.forEach(event => {
    document.addEventListener(event, updateActivity, { passive: true });
  });

  // Initial activity timestamp
  updateActivity();

  // Set up periodic token refresh check (every 10 minutes)
  activityCheckInterval = setInterval(checkActivityAndRefresh, TOKEN_REFRESH_INTERVAL);

  // Set up initial warning timer
  resetActivityTimer();
}

/**
 * Stop tracking user activity
 */
export function stopActivityTracking() {
  // Remove event listeners
  ACTIVITY_EVENTS.forEach(event => {
    document.removeEventListener(event, updateActivity);
  });

  // Clear intervals and timeouts
  if (activityCheckInterval) {
    clearInterval(activityCheckInterval);
    activityCheckInterval = null;
  }

  if (sessionWarningTimeout) {
    clearTimeout(sessionWarningTimeout);
    sessionWarningTimeout = null;
  }
}

/**
 * Initialize token management for authenticated users
 */
export function initializeTokenManager() {
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');

  if (accessToken && refreshToken) {
    startActivityTracking();
  }
}

/**
 * Cleanup token manager (call on logout)
 */
export function cleanupTokenManager() {
  stopActivityTracking();
}
