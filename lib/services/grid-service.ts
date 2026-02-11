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

/** Individual chore within a day */
export interface GridChore {
  id: string;
  name: string;
  icon?: string;
  points: number;
  status: "completed" | "pending" | "not_assigned";
}

/** Single day in the weekly grid */
export interface GridDay {
  date: string;       // YYYY-MM-DD
  dayName: string;    // Sun, Mon, etc.
  points: number;     // Points earned that day (completed only)
  totalPoints: number; // Total points possible (all assigned chores)
  complete: boolean;  // Had any activity
  chores: GridChore[]; // Individual chores for this day
}

/** Single kid's row in the weekly grid */
export interface GridKid {
  id: string;
  name: string;
  avatar: string;
  days: GridDay[];
  weeklyTotal: number;
  weeklyPossible: number; // Total points possible for the week
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
   * Composes data from existing services + chore assignments
   */
  async getWeeklyGrid(
    familyId: string,
    timezone: string = "America/Los_Angeles"
  ): Promise<WeeklyGridData> {
    // Get balance data (includes daily earnings for rolling 7 days)
    const balances = await this.balanceService.getFamilyBalances(familyId, timezone);

    // Calculate week dates from balance data
    const weekDates = balances[0]?.dailyEarnings || [];
    const weekStart = weekDates[0]?.date || this.getDefaultWeekStart(timezone);
    const weekEnd = weekDates[weekDates.length - 1]?.date || weekStart;

    // Fetch chore assignments for the week (single query for all kids)
    const assignments = await this.getWeekAssignments(familyId, weekStart, weekEnd);

    // Transform balance data into grid format with streak and chores
    const kids = await Promise.all(
      balances.map(async (balance) =>
        await this.transformToGridKid(balance, familyId, timezone, assignments)
      )
    );

    return {
      weekLabel: this.formatWeekLabel(weekStart, weekEnd),
      weekStart,
      weekEnd,
      kids,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Fetch chore assignments for the week
   */
  private async getWeekAssignments(
    familyId: string,
    weekStart: string,
    weekEnd: string
  ): Promise<Map<string, Map<string, GridChore[]>>> {
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const client = createClient(supabaseUrl, supabaseServiceKey);

    const { data: assignments, error } = await client
      .schema("choretracker")
      .from("chore_assignments")
      .select(`
        id,
        assigned_to_profile_id,
        assigned_date,
        status,
        point_value,
        chore_template:chore_templates(id, name, icon)
      `)
      .eq("family_id", familyId)
      .gte("assigned_date", weekStart)
      .lte("assigned_date", weekEnd)
      .or("is_deleted.is.null,is_deleted.eq.false");

    if (error) {
      console.error("❌ Error fetching weekly assignments:", error);
    }
    console.log(`📊 Weekly Grid: Found ${assignments?.length || 0} assignments for ${weekStart} to ${weekEnd}`);

    // Group by profile_id -> date -> chores[]
    const result = new Map<string, Map<string, GridChore[]>>();

    for (const assignment of assignments || []) {
      const profileId = assignment.assigned_to_profile_id as string | null;
      const date = assignment.assigned_date as string | null;
      // Supabase returns single object for FK relations, but TS may infer array
      const template = assignment.chore_template as unknown as { id: string; name: string; icon?: string } | null;

      if (!profileId || !date) continue;

      if (!result.has(profileId)) {
        result.set(profileId, new Map());
      }
      const profileMap = result.get(profileId)!;

      if (!profileMap.has(date)) {
        profileMap.set(date, []);
      }

      profileMap.get(date)!.push({
        id: assignment.id as string,
        name: template?.name || "Unknown Chore",
        icon: template?.icon,
        points: (assignment.point_value as number) || 0,
        status: assignment.status === "completed" || assignment.status === "verified"
          ? "completed"
          : "pending",
      });
    }

    return result;
  }

  /**
   * Transform BalanceInfo to GridKid format with chore details
   */
  private async transformToGridKid(
    balance: BalanceInfo,
    familyId: string,
    timezone: string,
    assignments: Map<string, Map<string, GridChore[]>>
  ): Promise<GridKid> {
    // Get streak data by fetching transactions
    const streak = await this.getProfileStreak(balance.profileId, familyId, timezone);

    // Get this kid's assignments
    const kidAssignments = assignments.get(balance.profileId) || new Map();

    // Build days with chore details
    const days: GridDay[] = balance.dailyEarnings.map((d: DailyEarning) => {
      const dayChores: GridChore[] = kidAssignments.get(d.date) || [];
      const totalPoints = dayChores.reduce((sum: number, c: GridChore) => sum + c.points, 0);
      const earnedPoints = dayChores
        .filter((c: GridChore) => c.status === "completed")
        .reduce((sum: number, c: GridChore) => sum + c.points, 0);

      return {
        date: d.date,
        dayName: d.dayName,
        points: earnedPoints,
        totalPoints,
        complete: dayChores.length > 0 && dayChores.every((c: GridChore) => c.status === "completed"),
        chores: dayChores,
      };
    });

    // Calculate weekly possible points
    const weeklyPossible = days.reduce((sum, d) => sum + d.totalPoints, 0);

    return {
      id: balance.profileId,
      name: balance.profileName,
      avatar: balance.avatarEmoji,
      days,
      weeklyTotal: balance.weeklyEarnings,
      weeklyPossible,
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
