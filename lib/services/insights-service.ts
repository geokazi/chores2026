/**
 * Insights Service - Behavioral analytics for habit formation
 * Template-aware: measures consistency against EXPECTED days, not calendar days
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getRotationConfig } from "./rotation-service.ts";
import { getPresetByKey } from "../data/rotation-presets.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Row shape returned by chore_transactions queries. */
interface TransactionRow {
  profile_id: string;
  created_at: string;
  points_change: number;
}

/** Row shape from chore_assignments for expected-day calculation. */
interface AssignmentRow {
  assigned_to_profile_id: string;
  assigned_date: string;
}

/** Get the hour (0-23) of a UTC timestamp in a given IANA timezone. */
export function getLocalHour(isoTimestamp: string, timezone: string): number {
  const date = new Date(isoTimestamp);
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hourCycle: "h23",
    timeZone: timezone,
  }).formatToParts(date);
  const hourPart = parts.find(p => p.type === "hour");
  return parseInt(hourPart?.value || "0", 10);
}

/** Get the local date (YYYY-MM-DD) of a UTC timestamp in a given IANA timezone. */
export function getLocalDate(isoTimestamp: string, timezone: string): string {
  const date = new Date(isoTimestamp);
  const parts = new Intl.DateTimeFormat("en-CA", { // en-CA gives YYYY-MM-DD format
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: timezone,
  }).formatToParts(date);
  const year = parts.find(p => p.type === "year")?.value || "1970";
  const month = parts.find(p => p.type === "month")?.value || "01";
  const day = parts.find(p => p.type === "day")?.value || "01";
  return `${year}-${month}-${day}`;
}

export interface WeekTrend {
  weekStart: string;
  activeDays: number;
  expectedDays: number;
  completions: number;
  pct: number;
}

export interface KidTrend {
  profileId: string;
  name: string;
  weeks: WeekTrend[];
  overallPct: number;
  deltaFromPrev: number; // week-over-week change
}

export interface StreakData {
  profileId: string;
  name: string;
  currentStreak: number;
  consistencyPct: number; // active/expected over 30 days
  longestStreak: number;
  milestone: "none" | "building" | "strengthening" | "forming" | "formed";
}

export interface RoutineData {
  profileId: string;
  name: string;
  morningCount: number;
  eveningCount: number;
  morningPct: number;
}

/** This week's day-by-day activity for each kid. */
export interface ThisWeekActivity {
  profileId: string;
  name: string;
  days: Array<{ date: string; dayName: string; done: boolean; points: number }>;
  totalDone: number;
  totalPoints: number;
}

/** Combined result from the single getInsights() call. */
export interface InsightsResult {
  trends: KidTrend[];
  streaks: StreakData[];
  routines: RoutineData[];
  totalActiveDays: number; // Unique days with any activity (for new user detection)
  thisWeekActivity: ThisWeekActivity[]; // Day-by-day for current week
}

export class InsightsService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Look up the parent's timezone from their profile preferences.
   * Reuses this service's Supabase client (no extra client creation).
   */
  async getTimezone(profileId: string): Promise<string> {
    try {
      const { data: profile } = await this.client
        .from("family_profiles")
        .select("preferences")
        .eq("id", profileId)
        .single();
      return (profile?.preferences as Record<string, unknown>)?.timezone as string || "UTC";
    } catch {
      return "UTC";
    }
  }

  /**
   * Single entry point: fetches transactions once, then computes all insights.
   * Reduces DB round-trips from 3-4 to 1-2.
   */
  async getInsights(
    familyId: string,
    familySettings: Record<string, unknown> | null,
    childProfiles: Array<{ id: string; name: string }>,
    timezone = "UTC"
  ): Promise<InsightsResult> {
    // Single query: 90 days covers all three methods (90 ⊇ 84 ⊇ 30)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Get ALL positive transactions (same as chore-service.getFamilyAnalytics for consistency)
    const { data: rawTxData } = await this.client
      .schema("choretracker")
      .from("chore_transactions")
      .select("profile_id, created_at, points_change")
      .eq("family_id", familyId)
      .gt("points_change", 0)
      .gte("created_at", ninetyDaysAgo.toISOString());

    const txData: TransactionRow[] = (rawTxData as TransactionRow[]) || [];

    // Get manual assignments for expected-day calculation (non-template families)
    const config = familySettings ? getRotationConfig(familySettings) : null;
    let manualAssignments: AssignmentRow[] = [];
    if (!config) {
      const twelveWeeksAgo = new Date();
      twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
      const { data } = await this.client
        .schema("choretracker")
        .from("chore_assignments")
        .select("assigned_to_profile_id, assigned_date")
        .eq("family_id", familyId)
        .gte("assigned_date", twelveWeeksAgo.toISOString().split("T")[0]);
      manualAssignments = (data as AssignmentRow[]) || [];
    }

    // Compute all three in parallel (CPU-only, no more DB calls)
    const [trends, streaks, routines] = await Promise.all([
      this.computeConsistencyTrend(txData, manualAssignments, familySettings, childProfiles, config, timezone),
      this.computeStreaks(txData, familySettings, childProfiles),
      this.computeRoutineBreakdown(txData, childProfiles, timezone),
    ]);

    // Compute new user metrics
    const totalActiveDays = new Set(txData.map(tx => tx.created_at.slice(0, 10))).size;
    const thisWeekActivity = this.computeThisWeekActivity(txData, childProfiles, timezone);

    return { trends, streaks, routines, totalActiveDays, thisWeekActivity };
  }

  /**
   * Compute day-by-day activity for the current week (Sun-Sat).
   * Uses timezone-aware dates to match Reports page.
   */
  private computeThisWeekActivity(
    txData: TransactionRow[],
    childProfiles: Array<{ id: string; name: string }>,
    timezone: string
  ): ThisWeekActivity[] {
    // Get today's date in user's timezone
    const now = new Date();
    const todayLocal = getLocalDate(now.toISOString(), timezone);
    const [yearStr, monthStr, dayStr] = todayLocal.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    // Week start: Sunday (to match Reports page)
    const todayDate = new Date(year, month - 1, day);
    const dayOfWeek = todayDate.getDay(); // 0=Sun, 6=Sat
    const sundayDate = new Date(year, month - 1, day - dayOfWeek);

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weekDates: Array<{ date: string; dayName: string }> = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(sundayDate);
      d.setDate(sundayDate.getDate() + i);
      weekDates.push({
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        dayName: dayNames[i],
      });
    }

    return childProfiles.map(kid => {
      // Filter transactions for this kid
      const kidTx = txData.filter(tx => tx.profile_id === kid.id);

      // Calculate points per day
      const pointsByDate: Record<string, number> = {};
      kidTx.forEach(tx => {
        const txDate = getLocalDate(tx.created_at, timezone);
        pointsByDate[txDate] = (pointsByDate[txDate] || 0) + tx.points_change;
      });

      const days = weekDates.map(({ date, dayName }) => {
        const points = pointsByDate[date] || 0;
        return {
          date,
          dayName,
          done: points > 0,
          points,
        };
      });

      const totalPoints = days.reduce((sum, d) => sum + d.points, 0);

      return {
        profileId: kid.id,
        name: kid.name,
        days,
        totalDone: days.filter(d => d.done).length,
        totalPoints,
      };
    });
  }

  /**
   * Get expected days per week for a kid based on family's template.
   * Delegates to the standalone getExpectedDaysForProfile() function.
   */
  getExpectedDaysPerWeek(
    familySettings: Record<string, unknown> | null,
    profileId: string
  ): number {
    return getExpectedDaysForProfile(familySettings, profileId);
  }

  /**
   * 12-week consistency trend per kid (CPU-only, uses pre-fetched data).
   * Uses timezone-aware date conversion to correctly bucket transactions.
   */
  private computeConsistencyTrend(
    txData: TransactionRow[],
    manualAssignments: AssignmentRow[],
    familySettings: Record<string, unknown> | null,
    childProfiles: Array<{ id: string; name: string }>,
    config: ReturnType<typeof getRotationConfig>,
    timezone: string
  ): KidTrend[] {
    const results: KidTrend[] = [];
    const today = new Date();
    const todayDayOfWeek = today.getDay(); // 0=Sun, 6=Sat

    for (const kid of childProfiles) {
      try {
        const expectedPerWeek = this.getExpectedDaysPerWeek(familySettings, kid.id);

        // Pre-compute local dates for this kid's transactions (avoids repeated timezone conversion)
        const kidTxLocalDates = txData
          .filter(tx => tx.profile_id === kid.id)
          .map(tx => getLocalDate(tx.created_at, timezone));

        const weeks: WeekTrend[] = [];
        for (let w = 11; w >= 0; w--) {
          const weekStart = new Date();
          weekStart.setHours(0, 0, 0, 0);
          weekStart.setDate(weekStart.getDate() - (w * 7 + todayDayOfWeek));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);

          const weekStartStr = weekStart.toISOString().split("T")[0];
          const weekEndStr = weekEnd.toISOString().split("T")[0];

          // Count distinct active days this week (using timezone-aware local dates)
          const activeDays = new Set(
            kidTxLocalDates.filter(d => d >= weekStartStr && d < weekEndStr)
          ).size;

          // Expected days: template-based or assignment-based
          let expected = expectedPerWeek;
          if (!config && manualAssignments.length > 0) {
            const assignedDays = new Set(
              manualAssignments
                .filter(a => a.assigned_to_profile_id === kid.id)
                .map(a => a.assigned_date)
                .filter(d => d >= weekStartStr && d < weekEndStr)
            ).size;
            expected = assignedDays || expectedPerWeek;
          }

          // Fix: cap current week's expected days to days elapsed so far
          if (w === 0) {
            const daysSoFar = todayDayOfWeek + 1; // Sun=1 through Sat=7
            expected = Math.min(expected, daysSoFar);
          }

          // Count completions using timezone-aware local dates
          const completions = kidTxLocalDates
            .filter(d => d >= weekStartStr && d < weekEndStr).length;

          const pct = expected > 0 ? Math.round((activeDays / expected) * 100) : 0;
          weeks.push({ weekStart: weekStartStr, activeDays, expectedDays: expected, completions, pct: Math.min(pct, 100) });
        }

        const currentPct = weeks[weeks.length - 1]?.pct || 0;
        const prevPct = weeks[weeks.length - 2]?.pct || 0;

        results.push({
          profileId: kid.id,
          name: kid.name,
          weeks,
          overallPct: Math.round(weeks.reduce((s, w) => s + w.pct, 0) / weeks.length),
          deltaFromPrev: currentPct - prevPct,
        });
      } catch (error) {
        console.warn(`[insights] Error computing trend for ${kid.name}:`, error);
        results.push({
          profileId: kid.id,
          name: kid.name,
          weeks: [],
          overallPct: 0,
          deltaFromPrev: 0,
        });
      }
    }

    return results;
  }

  /**
   * Streaks with recovery + consistency % + habit milestones (CPU-only).
   */
  private computeStreaks(
    txData: TransactionRow[],
    familySettings: Record<string, unknown> | null,
    childProfiles: Array<{ id: string; name: string }>
  ): StreakData[] {
    const results: StreakData[] = [];

    for (const kid of childProfiles) {
      try {
        const expectedPerWeek = this.getExpectedDaysPerWeek(familySettings, kid.id);
        const kidTx = txData.filter(tx => tx.profile_id === kid.id);
        const uniqueDates = [...new Set(kidTx.map(tx => tx.created_at.slice(0, 10)))].sort().reverse();

        // Current streak (consecutive days from today/yesterday)
        const today = new Date().toISOString().slice(0, 10);
        const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
        let currentStreak = 0;

        if (uniqueDates.length > 0 && (uniqueDates[0] === today || uniqueDates[0] === yesterday)) {
          currentStreak = 1;
          for (let i = 1; i < uniqueDates.length; i++) {
            const curr = new Date(uniqueDates[i - 1] + "T00:00:00");
            const prev = new Date(uniqueDates[i] + "T00:00:00");
            const diffDays = (curr.getTime() - prev.getTime()) / 86_400_000;
            if (diffDays <= 2) { // Allow 1 gap day (streak recovery)
              currentStreak++;
            } else {
              break;
            }
          }
        }

        // Longest streak (with recovery)
        let longestStreak = 0;
        let tempStreak = 0;
        const sortedAsc = [...uniqueDates].sort();
        for (let i = 0; i < sortedAsc.length; i++) {
          if (i === 0) {
            tempStreak = 1;
          } else {
            const curr = new Date(sortedAsc[i] + "T00:00:00");
            const prev = new Date(sortedAsc[i - 1] + "T00:00:00");
            const diffDays = (curr.getTime() - prev.getTime()) / 86_400_000;
            if (diffDays <= 2) {
              tempStreak++;
            } else {
              longestStreak = Math.max(longestStreak, tempStreak);
              tempStreak = 1;
            }
          }
        }
        longestStreak = Math.max(longestStreak, tempStreak);

        // Consistency % (last 30 days, template-aware)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
        const activeLast30 = uniqueDates.filter(d => d >= thirtyDaysAgo).length;
        const expectedLast30 = Math.round(expectedPerWeek * (30 / 7));
        const consistencyPct = expectedLast30 > 0
          ? Math.min(100, Math.round((activeLast30 / expectedLast30) * 100))
          : 0;

        // Habit milestone based on current streak
        let milestone: StreakData["milestone"] = "none";
        if (currentStreak >= 30) milestone = "formed";
        else if (currentStreak >= 21) milestone = "forming";
        else if (currentStreak >= 14) milestone = "strengthening";
        else if (currentStreak >= 7) milestone = "building";

        results.push({
          profileId: kid.id,
          name: kid.name,
          currentStreak,
          consistencyPct,
          longestStreak,
          milestone,
        });
      } catch (error) {
        console.warn(`[insights] Error computing streak for ${kid.name}:`, error);
        results.push({
          profileId: kid.id,
          name: kid.name,
          currentStreak: 0,
          consistencyPct: 0,
          longestStreak: 0,
          milestone: "none",
        });
      }
    }

    return results;
  }

  /**
   * Routine breakdown: morning vs evening completions (CPU-only).
   */
  private computeRoutineBreakdown(
    txData: TransactionRow[],
    childProfiles: Array<{ id: string; name: string }>,
    timezone: string
  ): RoutineData[] {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

    return childProfiles.map(kid => {
      try {
        const kidTx = txData.filter(tx =>
          tx.profile_id === kid.id && tx.created_at >= thirtyDaysAgo
        );
        const morningCount = kidTx.filter(tx => {
          const hour = getLocalHour(tx.created_at, timezone);
          return hour < 12;
        }).length;
        const eveningCount = kidTx.length - morningCount;
        const total = kidTx.length || 1;

        return {
          profileId: kid.id,
          name: kid.name,
          morningCount,
          eveningCount,
          morningPct: Math.round((morningCount / total) * 100),
        };
      } catch (error) {
        console.warn(`[insights] Error computing routine for ${kid.name}:`, error);
        return {
          profileId: kid.id,
          name: kid.name,
          morningCount: 0,
          eveningCount: 0,
          morningPct: 0,
        };
      }
    });
  }
}

/**
 * Standalone helper: compute expected days per week from family settings.
 * Used by email-digest for template-aware consistency calculation.
 */
export function getExpectedDaysForProfile(
  familySettings: Record<string, unknown> | null,
  profileId: string
): number {
  if (!familySettings) return 7;

  const config = getRotationConfig(familySettings);
  if (config) {
    const slotMapping = config.child_slots.find(s => s.profile_id === profileId);
    if (slotMapping) {
      const preset = getPresetByKey(config.active_preset);
      if (preset) {
        const weekType = preset.week_types[0];
        if (preset.schedule?.[weekType]?.[slotMapping.slot]) {
          const schedule = preset.schedule[weekType][slotMapping.slot];
          return Object.keys(schedule).filter(day => {
            const chores = schedule[day as keyof typeof schedule];
            return Array.isArray(chores) && chores.length > 0;
          }).length;
        }
        if (preset.is_dynamic) return 7;
      }
    }
  }
  return 7;
}

/**
 * Calculate streak (consecutive days with completions) from transaction dates.
 * Allows 1-day recovery gap (diffDays <= 2) to avoid penalizing minor misses.
 * Shared by InsightsService and email-digest.
 */
export function calculateStreak(transactionDates: string[]): number {
  if (transactionDates.length === 0) return 0;

  // Get unique dates sorted descending
  const uniqueDates = [...new Set(transactionDates.map((d) => d.slice(0, 10)))].sort().reverse();
  if (uniqueDates.length === 0) return 0;

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  // Streak must include today or yesterday
  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const curr = new Date(uniqueDates[i - 1] + "T00:00:00");
    const prev = new Date(uniqueDates[i] + "T00:00:00");
    const diffDays = (curr.getTime() - prev.getTime()) / 86_400_000;
    if (diffDays <= 2) { // Allow 1 gap day (streak recovery)
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Calculate 30-day consistency % (active days / expected days).
 * Template-aware: uses expectedPerWeek to compute expected days over 30 days.
 * Shared by InsightsService and email-digest.
 */
export function calculateConsistency(transactionDates: string[], expectedPerWeek = 7): number {
  if (transactionDates.length === 0) return 0;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const recentDates = [...new Set(transactionDates.map(d => d.slice(0, 10)))]
    .filter(d => d >= thirtyDaysAgo);
  const expected = Math.round(expectedPerWeek * (30 / 7));
  return expected > 0 ? Math.min(100, Math.round((recentDates.length / expected) * 100)) : 0;
}
