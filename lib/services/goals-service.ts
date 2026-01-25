/**
 * Goals Service for ChoreGami 2026
 * Handles P4: Savings Goals functionality
 *
 * Storage: JSONB in family_profiles.preferences.apps.choregami.goals
 * Per-kid goals stored in profile preferences (not family-level)
 */

import { createClient } from "@supabase/supabase-js";
import type {
  BoostGoalPayload,
  CreateGoalPayload,
  GoalResult,
  SavingsGoal,
} from "../types/finance.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export class GoalsService {
  private client: any;

  constructor() {
    this.client = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Get all goals for a profile
   */
  async getGoals(profileId: string): Promise<SavingsGoal[]> {
    const { data: profile, error } = await this.client
      .from("family_profiles")
      .select("preferences, current_points")
      .eq("id", profileId)
      .single();

    if (error) {
      console.error("❌ Failed to get profile goals:", error);
      return [];
    }

    const goals = profile?.preferences?.apps?.choregami?.goals || [];

    // Update currentAmount based on actual balance for non-achieved goals
    // This auto-syncs progress as kids earn points
    return goals.map((g: SavingsGoal) => {
      if (g.isAchieved) return g;
      // For simplicity, we don't auto-allocate to goals
      // Kids manually add to goals or parent boosts
      return g;
    });
  }

  /**
   * Create a new savings goal
   */
  async createGoal(
    profileId: string,
    payload: CreateGoalPayload,
  ): Promise<GoalResult> {
    const { data: profile, error } = await this.client
      .from("family_profiles")
      .select("preferences")
      .eq("id", profileId)
      .single();

    if (error) {
      return { success: false, error: "Profile not found" };
    }

    const prefs = profile?.preferences || {};
    const apps = prefs.apps || {};
    const choregami = apps.choregami || {};
    const goals: SavingsGoal[] = choregami.goals || [];

    const newGoal: SavingsGoal = {
      id: crypto.randomUUID(),
      name: payload.name,
      description: payload.description,
      targetAmount: payload.targetAmount,
      currentAmount: 0,
      icon: payload.icon || "🎯",
      category: payload.category || "other",
      targetDate: payload.targetDate,
      isAchieved: false,
      createdAt: new Date().toISOString(),
    };

    goals.push(newGoal);

    const { error: updateError } = await this.client
      .from("family_profiles")
      .update({
        preferences: {
          ...prefs,
          apps: {
            ...apps,
            choregami: {
              ...choregami,
              goals,
            },
          },
        },
      })
      .eq("id", profileId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    console.log("✅ Goal created:", { name: newGoal.name, target: newGoal.targetAmount });
    return { success: true, goal: newGoal };
  }

  /**
   * Add points to a goal (from kid's balance or parent boost)
   */
  async addToGoal(
    profileId: string,
    goalId: string,
    amount: number,
    fromBalance = true,
  ): Promise<GoalResult> {
    const { data: profile, error } = await this.client
      .from("family_profiles")
      .select("preferences, current_points, name, family_id")
      .eq("id", profileId)
      .single();

    if (error || !profile) {
      return { success: false, error: "Profile not found" };
    }

    // If from balance, check sufficient points
    if (fromBalance && profile.current_points < amount) {
      return {
        success: false,
        error: `Not enough points. Have ${profile.current_points}, need ${amount}`,
      };
    }

    const prefs = profile.preferences || {};
    const apps = prefs.apps || {};
    const choregami = apps.choregami || {};
    const goals: SavingsGoal[] = choregami.goals || [];

    const goalIndex = goals.findIndex((g) => g.id === goalId);
    if (goalIndex === -1) {
      return { success: false, error: "Goal not found" };
    }

    const goal = goals[goalIndex];
    if (goal.isAchieved) {
      return { success: false, error: "Goal already achieved" };
    }

    // Update goal progress
    const newAmount = Math.min(goal.currentAmount + amount, goal.targetAmount);
    const isAchieved = newAmount >= goal.targetAmount;

    goals[goalIndex] = {
      ...goal,
      currentAmount: newAmount,
      isAchieved,
      achievedAt: isAchieved ? new Date().toISOString() : undefined,
    };

    // Deduct from balance if from kid's points
    let newBalance = profile.current_points;
    if (fromBalance) {
      newBalance = profile.current_points - amount;

      // Record transaction for the transfer to savings
      await this.client
        .schema("choretracker")
        .from("chore_transactions")
        .insert({
          family_id: profile.family_id,
          profile_id: profileId,
          transaction_type: "adjustment",
          points_change: -amount,
          balance_after_transaction: newBalance,
          description: `Saved to goal: ${goal.name}`,
          week_ending: this.getWeekEnding(new Date()),
          metadata: {
            source: "chores2026",
            goalId: goal.id,
            goalName: goal.name,
            savingsTransfer: true,
            timestamp: new Date().toISOString(),
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
    }

    // Update profile
    const { error: updateError } = await this.client
      .from("family_profiles")
      .update({
        current_points: newBalance,
        preferences: {
          ...prefs,
          apps: {
            ...apps,
            choregami: {
              ...choregami,
              goals,
            },
          },
        },
      })
      .eq("id", profileId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    console.log("✅ Added to goal:", {
      goal: goal.name,
      added: amount,
      newAmount,
      isAchieved,
    });

    return { success: true, goal: goals[goalIndex] };
  }

  /**
   * Parent boost - add to goal without deducting from kid's balance
   */
  async boostGoal(payload: BoostGoalPayload): Promise<GoalResult> {
    const { goalId, profileId, amount, boosterId } = payload;

    // Get profile with family_id for transaction
    const { data: profile, error } = await this.client
      .from("family_profiles")
      .select("preferences, family_id, name")
      .eq("id", profileId)
      .single();

    if (error || !profile) {
      return { success: false, error: "Profile not found" };
    }

    const prefs = profile.preferences || {};
    const apps = prefs.apps || {};
    const choregami = apps.choregami || {};
    const goals: SavingsGoal[] = choregami.goals || [];

    const goalIndex = goals.findIndex((g) => g.id === goalId);
    if (goalIndex === -1) {
      return { success: false, error: "Goal not found" };
    }

    const goal = goals[goalIndex];
    if (goal.isAchieved) {
      return { success: false, error: "Goal already achieved" };
    }

    // Update goal progress (parent boost doesn't deduct from kid's balance)
    const newAmount = Math.min(goal.currentAmount + amount, goal.targetAmount);
    const isAchieved = newAmount >= goal.targetAmount;

    goals[goalIndex] = {
      ...goal,
      currentAmount: newAmount,
      isAchieved,
      achievedAt: isAchieved ? new Date().toISOString() : undefined,
    };

    // Record the boost (no transaction on kid's balance)
    // Just log for history
    console.log("💰 Parent boost:", {
      goal: goal.name,
      amount,
      boosterId,
      kidName: profile.name,
    });

    // Update profile
    const { error: updateError } = await this.client
      .from("family_profiles")
      .update({
        preferences: {
          ...prefs,
          apps: {
            ...apps,
            choregami: {
              ...choregami,
              goals,
            },
          },
        },
      })
      .eq("id", profileId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true, goal: goals[goalIndex] };
  }

  /**
   * Delete a goal
   */
  async deleteGoal(profileId: string, goalId: string): Promise<boolean> {
    const { data: profile, error } = await this.client
      .from("family_profiles")
      .select("preferences")
      .eq("id", profileId)
      .single();

    if (error) return false;

    const prefs = profile?.preferences || {};
    const apps = prefs.apps || {};
    const choregami = apps.choregami || {};
    const goals: SavingsGoal[] = choregami.goals || [];

    const filteredGoals = goals.filter((g) => g.id !== goalId);

    const { error: updateError } = await this.client
      .from("family_profiles")
      .update({
        preferences: {
          ...prefs,
          apps: {
            ...apps,
            choregami: {
              ...choregami,
              goals: filteredGoals,
            },
          },
        },
      })
      .eq("id", profileId);

    return !updateError;
  }

  private getWeekEnding(date: Date): string {
    const dayOfWeek = date.getDay();
    const daysUntilSunday = (7 - dayOfWeek) % 7;
    const weekEnding = new Date(date);
    weekEnding.setDate(date.getDate() + daysUntilSunday);
    return weekEnding.toISOString().split("T")[0];
  }
}
