/**
 * App Interaction Tracking Utility
 * Lightweight demand signal tracking for authenticated user interactions
 * ~40 lines - reuses existing /api/demand-signal endpoint
 */

// Session ID for correlating interactions (same pattern as landing page)
const getSessionId = (): string => {
  let id = sessionStorage.getItem("app_session_id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("app_session_id", id);
  }
  return id;
};

// Collect minimal navigator context (same as TeaserCards.tsx)
const getNavigatorContext = () => ({
  language: navigator.language,
  platform: navigator.platform,
  screen: {
    width: screen.width,
    height: screen.height,
    pixelRatio: devicePixelRatio,
  },
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});

/**
 * Track an app interaction (non-blocking, fire-and-forget)
 * @param action - e.g., "nav_open_left", "payout_click", "reward_tab_switch"
 * @param meta - optional extra context (e.g., { tab: "catalog" })
 */
export const trackInteraction = (action: string, meta?: Record<string, unknown>) => {
  // Fire-and-forget - never blocks UI
  fetch("/api/demand-signal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      v: 3,
      feature: "app_interaction",
      session_id: getSessionId(),
      navigator: getNavigatorContext(),
      interaction: { action, ...meta, ts: Date.now() },
    }),
  }).catch(() => {}); // Silent fail - tracking should never break the app
};
