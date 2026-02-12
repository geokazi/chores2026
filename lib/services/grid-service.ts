/**
 * Grid Service - Weekly Grid visualization data composition
 *
 * This is a READ-ONLY service for reporting/visualization.
 * It composes data from BalanceService and InsightsService.
 * It does NOT create or assign chores - that's ChoreTemplates.
 */

import { BalanceService } from "./balance-service.ts";
import { InsightsService, calculateStreak, getLocalDate } from "./insights-service.ts";
import { getRotationConfig, getChoresForChild } from "./rotation-service.ts";
import { getPresetByKey } from "../data/rotation-presets.ts";
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
   * Fetch chores for the week from ALL sources:
   * 1. Rotation chores (from family settings)
   * 2. Recurring chores (from chore_templates)
   * 3. Manual one-time chores (from chore_assignments)
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

    // Result map: profileId -> date -> chores[]
    const result = new Map<string, Map<string, GridChore[]>>();

    // Helper to add a chore to the result
    const addChore = (profileId: string, date: string, chore: GridChore) => {
      if (!result.has(profileId)) {
        result.set(profileId, new Map());
      }
      const profileMap = result.get(profileId)!;
      if (!profileMap.has(date)) {
        profileMap.set(date, []);
      }
      profileMap.get(date)!.push(chore);
    };

    // Generate date range for the week
    const dates: string[] = [];
    const startDate = new Date(weekStart + "T12:00:00");
    const endDate = new Date(weekEnd + "T12:00:00");
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }

    // Get family settings for rotation config
    const { data: family } = await client
      .from("families")
      .select("settings")
      .eq("id", familyId)
      .single();

    const rotationConfig = getRotationConfig(family?.settings || {});

    // Get child profiles for this family (handle NULL is_deleted)
    const { data: childProfiles } = await client
      .from("family_profiles")
      .select("id, name")
      .eq("family_id", familyId)
      .eq("role", "child")
      .or("is_deleted.is.null,is_deleted.eq.false");

    const childIds = (childProfiles || []).map((p: { id: string }) => p.id);
    console.log(`📊 Weekly Grid: Found ${childIds.length} children`);

    // Get all completed chore transactions (wider range, filter by local date)
    // Need to fetch more than just the week to handle timezone differences
    const txStartDate = new Date(weekStart + "T00:00:00");
    txStartDate.setDate(txStartDate.getDate() - 1); // 1 day before to handle timezone
    const txEndDate = new Date(weekEnd + "T23:59:59");
    txEndDate.setDate(txEndDate.getDate() + 1); // 1 day after to handle timezone

    const { data: completedTx } = await client
      .schema("choretracker")
      .from("chore_transactions")
      .select("profile_id, metadata, created_at, chore_assignment_id")
      .eq("family_id", familyId)
      .eq("transaction_type", "chore_completed")
      .gte("created_at", txStartDate.toISOString())
      .lte("created_at", txEndDate.toISOString());

    // Build completion lookup sets using metadata dates (timezone-safe)
    // Key format: "profileId:rotation:choreKey:date" or "profileId:recurring:templateId:date"
    // Also track completed assignment IDs for manual chores
    const completedSet = new Set<string>();
    const completedAssignmentIds = new Set<string>();

    for (const tx of completedTx || []) {
      const meta = tx.metadata as Record<string, unknown> | null;
      const profileId = tx.profile_id as string;

      // Track assignment ID for manual one-time chores
      if (tx.chore_assignment_id) {
        completedAssignmentIds.add(tx.chore_assignment_id as string);
      }

      if (meta?.rotation_chore && meta?.rotation_date) {
        completedSet.add(`${profileId}:rotation:${meta.rotation_chore}:${meta.rotation_date}`);
      }
      if (meta?.recurring_template_id && meta?.recurring_date) {
        completedSet.add(`${profileId}:recurring:${meta.recurring_template_id}:${meta.recurring_date}`);
      }
    }
    console.log(`📊 Weekly Grid: Found ${completedTx?.length || 0} completion transactions, ${completedSet.size} in set`);

    // === 1. ROTATION CHORES ===
    if (rotationConfig) {
      const preset = getPresetByKey(rotationConfig.active_preset);
      if (preset) {
        for (const childId of childIds) {
          for (const dateStr of dates) {
            const dateObj = new Date(dateStr + "T12:00:00");
            const chores = getChoresForChild(rotationConfig, childId, dateObj);
            for (const chore of chores) {
              const isCompleted = completedSet.has(`${childId}:rotation:${chore.key}:${dateStr}`);
              addChore(childId, dateStr, {
                id: `rotation_${chore.key}_${dateStr}`,
                name: chore.name,
                icon: chore.icon,
                points: chore.points,
                status: isCompleted ? "completed" : "pending",
              });
            }
          }
        }
        console.log(`📊 Weekly Grid: Added rotation chores from ${rotationConfig.active_preset}`);
      }
    }

    // === 2. RECURRING CHORES (Manual recurring templates) ===
    const { data: recurringTemplates } = await client
      .schema("choretracker")
      .from("chore_templates")
      .select("id, name, points, icon, recurring_days, assigned_to_profile_id")
      .eq("family_id", familyId)
      .eq("is_recurring", true)
      .eq("is_active", true)
      .or("is_deleted.is.null,is_deleted.eq.false");

    const dayNameToNum: Record<string, number> = {
      sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
    };

    let recurringChoreCount = 0;
    for (const template of recurringTemplates || []) {
      const profileId = template.assigned_to_profile_id as string | null;
      const recurringDays = template.recurring_days as string[] | null;
      if (!profileId || !recurringDays || !childIds.includes(profileId)) {
        console.log(`📊 Skipping template ${template.name}: profileId=${profileId}, days=${recurringDays}, inChildren=${childIds.includes(profileId || "")}`);
        continue;
      }

      for (const dateStr of dates) {
        const dateObj = new Date(dateStr + "T12:00:00");
        const dayNum = dateObj.getDay();
        // Handle both lowercase and array of numbers for recurring_days
        const isDueToday = recurringDays.some((day: string | number) => {
          if (typeof day === "number") return day === dayNum;
          return dayNameToNum[day.toLowerCase()] === dayNum;
        });
        if (isDueToday) {
          const completionKey = `${profileId}:recurring:${template.id}:${dateStr}`;
          const isCompleted = completedSet.has(completionKey);
          addChore(profileId, dateStr, {
            id: `recurring_${template.id}_${dateStr}`,
            name: template.name as string,
            icon: template.icon as string | undefined,
            points: template.points as number,
            status: isCompleted ? "completed" : "pending",
          });
          recurringChoreCount++;
        }
      }
    }
    console.log(`📊 Weekly Grid: Found ${recurringTemplates?.length || 0} recurring templates, added ${recurringChoreCount} chore instances`);

    // === 3. MANUAL ONE-TIME CHORES (from chore_assignments) ===
    // Query by due_date instead of assigned_date to match kid dashboard behavior
    const { data: assignments, error } = await client
      .schema("choretracker")
      .from("chore_assignments")
      .select(`
        id,
        assigned_to_profile_id,
        assigned_date,
        due_date,
        status,
        point_value,
        chore_template:chore_templates(id, name, icon, is_recurring)
      `)
      .eq("family_id", familyId)
      .or("is_deleted.is.null,is_deleted.eq.false");

    if (error) {
      console.error("❌ Error fetching weekly assignments:", error);
    }

    // Filter to non-recurring (manual one-time) assignments only
    let manualChoreCount = 0;
    for (const assignment of assignments || []) {
      const profileId = assignment.assigned_to_profile_id as string | null;
      const template = assignment.chore_template as unknown as { id: string; name: string; icon?: string; is_recurring?: boolean } | null;

      // Skip recurring templates - they're handled above
      if (template?.is_recurring) continue;
      if (!profileId) continue;

      // Use due_date if available, fall back to assigned_date
      // Extract just the date part (YYYY-MM-DD) from due_date timestamp
      let date: string | null = null;
      if (assignment.due_date) {
        // due_date might be a timestamp like "2026-02-11T23:59:59.999Z"
        const dueDate = assignment.due_date as string;
        date = dueDate.split("T")[0];
      } else if (assignment.assigned_date) {
        date = assignment.assigned_date as string;
      }

      if (!date) continue;

      // Check if date is within our week range
      if (date < weekStart || date > weekEnd) continue;

      // Check completion status from assignment or transaction tracking
      const isCompleted = assignment.status === "completed" ||
                          assignment.status === "verified" ||
                          completedAssignmentIds.has(assignment.id as string);

      addChore(profileId, date, {
        id: assignment.id as string,
        name: template?.name || "Unknown Chore",
        icon: template?.icon,
        points: (assignment.point_value as number) || 0,
        status: isCompleted ? "completed" : "pending",
      });
      manualChoreCount++;
    }
    console.log(`📊 Weekly Grid: Found ${assignments?.length || 0} assignments, added ${manualChoreCount} manual chores for week ${weekStart} to ${weekEnd}`);

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
