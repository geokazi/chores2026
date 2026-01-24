/**
 * Insights Service - Behavioral analytics for habit formation
 * Template-aware: measures consistency against EXPECTED days, not calendar days
 */

import { createClient } from "@supabase/supabase-js";
import { getRotationConfig } from "./rotation-service.ts";
import { getPresetByKey } from "../data/rotation-presets.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Get the hour (0-23) of a UTC timestamp in a given IANA timezone. */
function getLocalHour(isoTimestamp: string, timezone: string): number {
  const date = new Date(isoTimestamp);
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: timezone,
  }).formatToParts(date);
  const hourPart = parts.find(p => p.type === "hour");
  return parseInt(hourPart?.value || "0", 10);
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

export class InsightsService {
  private client;

  constructor() {
    this.client = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Get expected days per week for a kid based on family's template.
   * All current templates assign chores 7 days/week.
   * Manual-only families: expected = days with assignments.
   */
  private getExpectedDaysPerWeek(
    familySettings: Record<string, unknown> | null,
    profileId: string
  ): number {
    if (!familySettings) return 7; // default assumption

    const config = getRotationConfig(familySettings);
    if (config) {
      // Check if this kid has a slot in the rotation
      const hasSlot = config.child_slots.some(s => s.profile_id === profileId);
      if (hasSlot) {
        const preset = getPresetByKey(config.active_preset);
        if (preset) {
          // Count scheduled days from first week type
          const weekType = preset.week_types[0];
          const slotMapping = config.child_slots.find(s => s.profile_id === profileId);
          if (slotMapping && preset.schedule?.[weekType]?.[slotMapping.slot]) {
            const schedule = preset.schedule[weekType][slotMapping.slot];
            return Object.keys(schedule).filter(day => {
              const chores = schedule[day as keyof typeof schedule];
              return Array.isArray(chores) && chores.length > 0;
            }).length;
          }
          // Dynamic templates: all days expected
          if (preset.is_dynamic) return 7;
        }
      }
    }
    // No template or kid not in rotation: use 7 as default
    // (will be refined by actual assignment data in consistency calc)
    return 7;
  }

  /**
   * 12-week consistency trend per kid.
   * For manual-only families, expected days come from chore_assignments.
   */
  async getConsistencyTrend(
    familyId: string,
    familySettings: Record<string, unknown> | null,
    childProfiles: Array<{ id: string; name: string }>
  ): Promise<KidTrend[]> {
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

    // Get completions grouped by profile and date
    const { data: txData } = await this.client
      .schema("choretracker")
      .from("chore_transactions")
      .select("profile_id, created_at")
      .eq("family_id", familyId)
      .eq("transaction_type", "chore_completed")
      .gte("created_at", twelveWeeksAgo.toISOString());

    // Get manual assignments for expected-day calculation (non-template families)
    const config = familySettings ? getRotationConfig(familySettings) : null;
    let manualAssignments: Array<{ assigned_to_profile_id: string; assigned_date: string }> = [];
    if (!config) {
      const { data } = await this.client
        .schema("choretracker")
        .from("chore_assignments")
        .select("assigned_to_profile_id, assigned_date")
        .eq("family_id", familyId)
        .gte("assigned_date", twelveWeeksAgo.toISOString().split("T")[0]);
      manualAssignments = (data as any[]) || [];
    }

    const results: KidTrend[] = [];

    for (const kid of childProfiles) {
      const expectedPerWeek = this.getExpectedDaysPerWeek(familySettings, kid.id);

      // Build week buckets
      const weeks: WeekTrend[] = [];
      for (let w = 11; w >= 0; w--) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (w * 7 + weekStart.getDay()));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const weekStartStr = weekStart.toISOString().split("T")[0];
        const weekEndStr = weekEnd.toISOString().split("T")[0];

        // Count distinct active days this week
        const activeDays = new Set(
          ((txData as any[]) || [])
            .filter(tx => tx.profile_id === kid.id)
            .map(tx => tx.created_at.slice(0, 10))
            .filter((d: string) => d >= weekStartStr && d < weekEndStr)
        ).size;

        // Expected days: template-based or assignment-based
        let expected = expectedPerWeek;
        if (!config && manualAssignments.length > 0) {
          expected = new Set(
            manualAssignments
              .filter(a => a.assigned_to_profile_id === kid.id)
              .map(a => a.assigned_date)
              .filter(d => d >= weekStartStr && d < weekEndStr)
          ).size || expectedPerWeek; // fallback to 7 if no assignments
        }

        const completions = ((txData as any[]) || [])
          .filter(tx => tx.profile_id === kid.id &&
            tx.created_at.slice(0, 10) >= weekStartStr &&
            tx.created_at.slice(0, 10) < weekEndStr
          ).length;

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
    }

    return results;
  }

  /**
   * Streaks with recovery: consistency % over 30 days + habit milestones.
   * Streak = consecutive expected-days with completions.
   */
  async getStreaks(
    familyId: string,
    familySettings: Record<string, unknown> | null,
    childProfiles: Array<{ id: string; name: string }>
  ): Promise<StreakData[]> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: txData } = await this.client
      .schema("choretracker")
      .from("chore_transactions")
      .select("profile_id, created_at")
      .eq("family_id", familyId)
      .eq("transaction_type", "chore_completed")
      .gte("created_at", ninetyDaysAgo.toISOString());

    const results: StreakData[] = [];

    for (const kid of childProfiles) {
      const expectedPerWeek = this.getExpectedDaysPerWeek(familySettings, kid.id);
      const kidTx = ((txData as any[]) || []).filter(tx => tx.profile_id === kid.id);
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

      // Consistency % (last 30 days)
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
    }

    return results;
  }

  /**
   * Routine breakdown: morning vs evening completions.
   * Uses created_at hour in the family's local timezone (before noon = morning).
   */
  async getRoutineBreakdown(
    familyId: string,
    childProfiles: Array<{ id: string; name: string }>,
    timezone = "UTC"
  ): Promise<RoutineData[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: txData } = await this.client
      .schema("choretracker")
      .from("chore_transactions")
      .select("profile_id, created_at")
      .eq("family_id", familyId)
      .eq("transaction_type", "chore_completed")
      .gte("created_at", thirtyDaysAgo.toISOString());

    return childProfiles.map(kid => {
      const kidTx = ((txData as any[]) || []).filter(tx => tx.profile_id === kid.id);
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
    });
  }
}
