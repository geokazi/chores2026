/**
 * Feature Limits Configuration
 * Centralized tier limits — easy to adjust without code changes.
 */

export const FEATURE_LIMITS = {
  free: {
    digests_per_month: 4, // 1/week
    sms_per_month: 4, // SMS costs money
    calendar_exports: Infinity, // Zero cost
    badge_taps: Infinity, // Zero cost
  },
  premium: {
    digests_per_month: Infinity,
    sms_per_month: Infinity,
    calendar_exports: Infinity,
    badge_taps: Infinity,
  },
} as const;

// Hard cap: max emails/month across ALL users (prevents catastrophic runaway)
export const GLOBAL_EMAIL_BUDGET = 1000;
