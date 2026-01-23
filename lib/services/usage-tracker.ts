/**
 * Usage Tracker Service
 * Tracks notification feature usage with dual counters:
 * - total_* (all-time, never reset) — lifetime engagement analytics
 * - this_month_* (reset monthly) — gate enforcement
 */

import { getServiceSupabaseClient } from "../supabase.ts";

const METRIC_TO_MONTH_KEY: Record<string, string> = {
  digests: "this_month_digests",
  ics: "this_month_ics",
  badges: "this_month_badges",
};

const METRIC_TO_TOTAL_KEY: Record<string, string> = {
  digests: "total_digests_sent",
  ics: "total_ics_sent",
  badges: "total_badges_sent",
};

export async function incrementUsage(
  profileId: string,
  metric: string,
): Promise<Record<string, unknown>> {
  const supabase = getServiceSupabaseClient();

  const { data } = await supabase
    .from("family_profiles")
    .select("preferences")
    .eq("id", profileId)
    .single();

  const prefs = data?.preferences || {};
  const notifications = prefs.notifications || {};
  const usage: Record<string, any> = { ...(notifications.usage || {}) };

  // Reset monthly counters if new month
  const cycleStart = usage.cycle_start ? new Date(usage.cycle_start) : null;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const cycleMonth = cycleStart
    ? `${cycleStart.getFullYear()}-${String(cycleStart.getMonth() + 1).padStart(2, "0")}`
    : null;

  if (currentMonth !== cycleMonth) {
    Object.keys(usage).forEach((k) => {
      if (k.startsWith("this_month_")) usage[k] = 0;
    });
    usage.cycle_start = now.toISOString();
  }

  // Increment all-time total (never resets)
  const totalKey = METRIC_TO_TOTAL_KEY[metric] || `total_${metric}_sent`;
  usage[totalKey] = (usage[totalKey] || 0) + 1;

  // Increment monthly counter (resets each cycle)
  const monthKey = METRIC_TO_MONTH_KEY[metric];
  if (monthKey) {
    usage[monthKey] = (usage[monthKey] || 0) + 1;
  }

  if (!usage.cycle_start) {
    usage.cycle_start = now.toISOString();
  }

  await supabase.from("family_profiles").update({
    preferences: {
      ...prefs,
      notifications: { ...notifications, usage },
    },
  }).eq("id", profileId);

  return usage;
}

export function getMonthlyUsage(
  profile: { preferences?: { notifications?: { usage?: Record<string, unknown> } } },
  metric: string,
): number {
  const usage = profile?.preferences?.notifications?.usage || {};
  const monthKey = METRIC_TO_MONTH_KEY[metric] || `this_month_${metric}`;
  return (usage[monthKey] as number) || 0;
}

export function getTotalUsage(
  profile: { preferences?: { notifications?: { usage?: Record<string, unknown> } } },
  metric: string,
): number {
  const usage = profile?.preferences?.notifications?.usage || {};
  const totalKey = METRIC_TO_TOTAL_KEY[metric] || `total_${metric}_sent`;
  return (usage[totalKey] as number) || 0;
}
