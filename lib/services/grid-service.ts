/**
 * Grid Service - Weekly Grid visualization data composition
 *
 * This is a READ-ONLY service for reporting/visualization.
 * It composes data from BalanceService and InsightsService.
 * It does NOT create or assign chores - that's ChoreTemplates.
 */

import { BalanceService } from "./balance-service.ts";
import { InsightsService, calculateStreak, getLocalDate } from "./insights-service.ts";
import type { BalanceInfo, DailyEarning } from "../types/finance.ts";

/** Single day in the weekly grid */
export interface GridDay {
  date: string;       // YYYY-MM-DD
  dayName: string;    // Sun, Mon, etc.
  points: number;     // Points earned that day
  complete: boolean;  // Had any activity
}

/** Single kid's row in the weekly grid */
export interface GridKid {
  id: string;
  name: string;
  avatar: string;
  days: GridDay[];
  weeklyTotal: number;
  streak: number;
}

/** Complete weekly grid response */
export interface WeeklyGridData {
  weekLabel: string;      // "Feb 3 - Feb 9, 2026"
  weekStart: string;      // YYYY-MM-DD
  weekEnd: string;        // YYYY-MM-DD
  kids: GridKid[];
  generatedAt: string;    // ISO timestamp
}

export class GridService {
  private balanceService: BalanceService;
  private insightsService: InsightsService;

  constructor() {
    this.balanceService = new BalanceService();
    this.insightsService = new InsightsService();
  }

  /**
   * Get weekly grid data for a family
   * Composes data from existing services - no new DB queries
   */
  async getWeeklyGrid(
    familyId: string,
    timezone: string = "America/Los_Angeles"
  ): Promise<WeeklyGridData> {
    // Get balance data (includes daily earnings for rolling 7 days)
    const balances = await this.balanceService.getFamilyBalances(familyId, timezone);

    // Transform balance data into grid format with streak
    const kids = await Promise.all(
      balances.map(async (balance) => await this.transformToGridKid(balance, familyId, timezone))
    );

    // Calculate week label from the daily earnings dates
    const weekDates = balances[0]?.dailyEarnings || [];
    const weekStart = weekDates[0]?.date || this.getDefaultWeekStart(timezone);
    const weekEnd = weekDates[weekDates.length - 1]?.date || weekStart;

    return {
      weekLabel: this.formatWeekLabel(weekStart, weekEnd),
      weekStart,
      weekEnd,
      kids,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Transform BalanceInfo to GridKid format
   */
  private async transformToGridKid(
    balance: BalanceInfo,
    familyId: string,
    timezone: string
  ): Promise<GridKid> {
    // Get streak data by fetching transactions
    const streak = await this.getProfileStreak(balance.profileId, familyId, timezone);

    return {
      id: balance.profileId,
      name: balance.profileName,
      avatar: balance.avatarEmoji,
      days: balance.dailyEarnings.map((d: DailyEarning) => ({
        date: d.date,
        dayName: d.dayName,
        points: d.points,
        complete: d.points > 0,
      })),
      weeklyTotal: balance.weeklyEarnings,
      streak,
    };
  }

  /**
   * Get streak for a specific profile
   * Uses existing calculateStreak function from insights-service
   */
  private async getProfileStreak(
    profileId: string,
    familyId: string,
    _timezone: string
  ): Promise<number> {
    // Query transactions for this profile (last 90 days for streak calculation)
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const client = createClient(supabaseUrl, supabaseServiceKey);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data } = await client
      .schema("choretracker")
      .from("chore_transactions")
      .select("created_at")
      .eq("family_id", familyId)
      .eq("profile_id", profileId)
      .gt("points_change", 0)
      .gte("created_at", ninetyDaysAgo.toISOString());

    const transactionDates = (data || []).map((t: { created_at: string }) => t.created_at);
    return calculateStreak(transactionDates);
  }

  /**
   * Format week label for display
   * e.g., "Feb 3 - Feb 9, 2026"
   */
  private formatWeekLabel(weekStart: string, weekEnd: string): string {
    const startDate = new Date(weekStart + "T00:00:00");
    const endDate = new Date(weekEnd + "T00:00:00");

    const startMonth = startDate.toLocaleDateString("en-US", { month: "short" });
    const startDay = startDate.getDate();
    const endMonth = endDate.toLocaleDateString("en-US", { month: "short" });
    const endDay = endDate.getDate();
    const year = endDate.getFullYear();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}, ${year}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  }

  /**
   * Get default week start if no balance data
   */
  private getDefaultWeekStart(timezone: string): string {
    const now = new Date();
    const localDate = getLocalDate(now.toISOString(), timezone);
    const [yearStr, monthStr, dayStr] = localDate.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    const todayDate = new Date(year, month - 1, day);
    todayDate.setDate(todayDate.getDate() - 6); // 7 days ago

    return `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, "0")}-${String(todayDate.getDate()).padStart(2, "0")}`;
  }
}
