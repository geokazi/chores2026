/**
 * Balance Service for ChoreGami 2026
 * Handles P2: Balance & Pay Out functionality
 *
 * Balance derived from family_profiles.current_points
 * Pay Out uses TransactionService for FamilyScore sync
 */

import { createClient } from "@supabase/supabase-js";
import { TransactionService } from "./transaction-service.ts";
import { getActivityService } from "./activity-service.ts";
import { getLocalDate } from "./insights-service.ts";
import type {
  BalanceInfo,
  DailyEarning,
  FinanceSettings,
  PayOutRequest,
  PayOutResult,
} from "../types/finance.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Get rolling 7-day window (today + 6 previous days) with day names - timezone aware */
function getRolling7DayDates(timezone: string = "America/Los_Angeles"): Array<{ date: string; dayName: string }> {
  // Get today's date in user's timezone
  const now = new Date();
  const todayLocal = getLocalDate(now.toISOString(), timezone); // YYYY-MM-DD
  const [yearStr, monthStr, dayStr] = todayLocal.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  const todayDate = new Date(year, month - 1, day);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekDates: Array<{ date: string; dayName: string }> = [];

  // Rolling window: start 6 days ago, end today (always shows 7 days of activity)
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() - i);
    weekDates.push({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      dayName: dayNames[d.getDay()],
    });
  }

  return weekDates;
}

export class BalanceService {
  private client: any;
  private transactionService: TransactionService;

  constructor() {
    this.client = createClient(supabaseUrl, supabaseServiceKey);
    this.transactionService = new TransactionService();
  }

  /**
   * Get finance settings for a family
   */
  async getFinanceSettings(familyId: string): Promise<FinanceSettings> {
    try {
      const { data, error } = await this.client
        .from("families")
        .select("settings")
        .eq("id", familyId)
        .single();

      if (error || !data) {
        return {
          dollarValuePerPoint: 1.0,
          payoutRequiresPin: true,
        };
      }

      const family = data as { settings?: Record<string, any> };
      const finance = family.settings?.apps?.choregami?.finance;
      if (!finance) {
        return {
          dollarValuePerPoint: 1.0,
          payoutRequiresPin: true,
        };
      }

      return finance as FinanceSettings;
    } catch {
      return {
        dollarValuePerPoint: 1.0,
        payoutRequiresPin: true,
      };
    }
  }

  /**
   * Get balance info for all kids in a family
   * Uses SAME query pattern as chore-service.getFamilyAnalytics for consistency
   * @param timezone - IANA timezone for local date calculations
   */
  async getFamilyBalances(familyId: string, timezone: string = "America/Los_Angeles"): Promise<BalanceInfo[]> {
    const financeSettings = await this.getFinanceSettings(familyId);
    const weekDates = getRolling7DayDates(timezone);
    const weekStart = weekDates[0].date;

    // Get all child profiles with their current points
    // Filter out deleted profiles (is_deleted = true), but include NULL (not deleted)
    const { data: profiles, error } = await this.client
      .from("family_profiles")
      .select("id, name, current_points, role, is_deleted")
      .eq("family_id", familyId)
      .eq("role", "child")
      .or("is_deleted.is.null,is_deleted.eq.false");

    if (error) {
      console.error("❌ Failed to get family profiles:", error);
      return [];
    }

    // Get ALL positive transactions for this FAMILY (same as chore-service.getFamilyAnalytics)
    const { data: allTransactions } = await this.client
      .schema("choretracker")
      .from("chore_transactions")
      .select("profile_id, points_change, created_at")
      .eq("family_id", familyId)
      .gt("points_change", 0);

    const balances: BalanceInfo[] = [];

    for (const profile of profiles || []) {
      // Filter transactions for this profile (same as chore-service)
      const profileTx = (allTransactions || []).filter(
        (t: any) => t.profile_id === profile.id
      );

      // Filter transactions to this week using timezone-aware local date
      const weekTransactions = profileTx.filter((t: any) => {
        const txLocalDate = getLocalDate(t.created_at, timezone);
        return txLocalDate >= weekStart;
      });

      // Calculate daily earnings using timezone-aware local date
      const dailyEarnings: DailyEarning[] = weekDates.map(({ date, dayName }) => {
        const dayPoints = weekTransactions
          .filter((t: any) => {
            const txLocalDate = getLocalDate(t.created_at, timezone);
            return txLocalDate === date;
          })
          .reduce((sum: number, t: any) => sum + t.points_change, 0);

        return { date, dayName, points: dayPoints };
      });

      const weeklyEarnings = dailyEarnings.reduce((sum, d) => sum + d.points, 0);

      balances.push({
        profileId: profile.id,
        profileName: profile.name,
        avatarEmoji: "🧒",
        currentPoints: profile.current_points || 0,
        dollarValue: (profile.current_points || 0) * financeSettings.dollarValuePerPoint,
        weeklyEarnings,
        dailyEarnings,
      });
    }

    return balances;
  }

  /**
   * Get balance info for a single profile
   * Uses SAME query pattern as chore-service.getFamilyAnalytics for consistency
   * @param timezone - IANA timezone for local date calculations
   */
  async getProfileBalance(
    profileId: string,
    familyId: string,
    timezone: string = "America/Los_Angeles",
  ): Promise<BalanceInfo | null> {
    const financeSettings = await this.getFinanceSettings(familyId);
    const weekDates = getRolling7DayDates(timezone);
    const weekStart = weekDates[0].date;

    const { data: profile, error } = await this.client
      .from("family_profiles")
      .select("id, name, current_points")
      .eq("id", profileId)
      .single();

    if (error || !profile) {
      console.error("❌ Failed to get profile:", error);
      return null;
    }

    // Get transactions for this FAMILY and filter by profile (same as chore-service)
    const { data: allTransactions } = await this.client
      .schema("choretracker")
      .from("chore_transactions")
      .select("profile_id, points_change, created_at")
      .eq("family_id", familyId)
      .gt("points_change", 0);

    // Filter for this profile
    const profileTx = (allTransactions || []).filter(
      (t: any) => t.profile_id === profileId
    );

    // Filter transactions to this week using timezone-aware local date
    const weekTransactions = profileTx.filter((t: any) => {
      const txLocalDate = getLocalDate(t.created_at, timezone);
      return txLocalDate >= weekStart;
    });

    // Calculate daily earnings using timezone-aware local date
    const dailyEarnings: DailyEarning[] = weekDates.map(({ date, dayName }) => {
      const dayPoints = weekTransactions
        .filter((t: any) => {
          const txLocalDate = getLocalDate(t.created_at, timezone);
          return txLocalDate === date;
        })
        .reduce((sum: number, t: any) => sum + t.points_change, 0);

      return { date, dayName, points: dayPoints };
    });

    const weeklyEarnings = dailyEarnings.reduce((sum, d) => sum + d.points, 0);

    return {
      profileId: profile.id,
      profileName: profile.name,
      avatarEmoji: "🧒",
      currentPoints: profile.current_points || 0,
      dollarValue: (profile.current_points || 0) * financeSettings.dollarValuePerPoint,
      weeklyEarnings,
      dailyEarnings,
    };
  }

  /**
   * Process a payout - requires parent PIN verification
   * Uses TransactionService for FamilyScore sync
   */
  async processPayout(
    request: PayOutRequest,
    parentProfileId: string,
    familyId: string,
  ): Promise<PayOutResult> {
    const { profileId, amount, parentPin } = request;

    // 1. Verify parent PIN
    const financeSettings = await this.getFinanceSettings(familyId);
    if (financeSettings.payoutRequiresPin) {
      const pinValid = await this.verifyParentPin(parentProfileId, parentPin);
      if (!pinValid) {
        return { success: false, error: "Invalid PIN" };
      }
    }

    // 2. Get current balance
    const { data: profile, error: profileError } = await this.client
      .from("family_profiles")
      .select("current_points, name, family_id")
      .eq("id", profileId)
      .single();

    if (profileError || !profile) {
      return { success: false, error: "Profile not found" };
    }

    if (profile.current_points < amount) {
      return {
        success: false,
        error: `Insufficient balance. Have ${profile.current_points}, requested ${amount}`,
      };
    }

    // 3. Create payout transaction via TransactionService (handles FamilyScore sync)
    const dollarAmount = amount * financeSettings.dollarValuePerPoint;

    try {
      const { transactionId, newBalance } = await this.transactionService.recordCashOut(
        profileId,
        familyId,
        amount,
        dollarAmount,
        parentProfileId,
      );

      console.log("✅ Payout processed:", {
        kid: profile.name,
        amount,
        dollarAmount,
        newBalance,
      });

      // Log activity for the feed
      try {
        const activityService = getActivityService();
        await activityService.logActivity({
          familyId,
          actorId: profileId,
          actorName: profile.name,
          type: "cash_out",
          title: `${profile.name} received $${dollarAmount.toFixed(2)} payout`,
          icon: "💵",
          points: -amount,
          meta: { dollarAmount, approvedBy: parentProfileId },
        });
      } catch (activityError) {
        console.warn("⚠️ Failed to log payout activity (non-critical):", activityError);
      }

      return {
        success: true,
        transactionId,
        newBalance,
      };
    } catch (error) {
      console.error("❌ Payout transaction failed:", error);
      return { success: false, error: "Failed to process payout" };
    }
  }

  /**
   * Get transaction history for a profile
   */
  async getTransactionHistory(
    profileId: string,
    limit = 20,
  ): Promise<any[]> {
    const { data, error } = await this.client
      .schema("choretracker")
      .from("chore_transactions")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("❌ Failed to get transaction history:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Verify parent PIN against stored value
   * Uses plaintext comparison (bcrypt hashes need re-setup per existing pattern)
   */
  private async verifyParentPin(parentProfileId: string, pin: string): Promise<boolean> {
    if (!pin) return false;

    const { data: parent, error } = await this.client
      .from("family_profiles")
      .select("pin_hash, name")
      .eq("id", parentProfileId)
      .single();

    if (error || !parent?.pin_hash) {
      console.log(`⚠️ No PIN set for parent: ${parent?.name || parentProfileId}`);
      return false;
    }

    // Check if pin_hash is a bcrypt hash (starts with $2) or plaintext
    if (parent.pin_hash.startsWith("$2")) {
      console.log(`⚠️ Found bcrypt hash for ${parent.name}, needs re-setup`);
      return false;
    }

    // Plaintext PIN comparison
    return parent.pin_hash === pin;
  }
}
