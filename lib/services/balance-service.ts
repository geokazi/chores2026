/**
 * Balance Service for ChoreGami 2026
 * Handles P2: Balance & Pay Out functionality
 *
 * Balance derived from family_profiles.current_points
 * Pay Out uses TransactionService for FamilyScore sync
 */

import { createClient } from "@supabase/supabase-js";
import { TransactionService } from "./transaction-service.ts";
import type {
  BalanceInfo,
  FinanceSettings,
  PayOutRequest,
  PayOutResult,
} from "../types/finance.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
   */
  async getFamilyBalances(familyId: string): Promise<BalanceInfo[]> {
    const financeSettings = await this.getFinanceSettings(familyId);

    // Get all child profiles with their current points
    // Kids are identified by user_id IS NULL (they don't have Supabase auth accounts)
    const { data: profiles, error } = await this.client
      .from("family_profiles")
      .select("id, name, avatar_emoji, current_points, role, user_id")
      .eq("family_id", familyId)
      .is("user_id", null)
      .eq("is_deleted", false);

    if (error) {
      console.error("❌ Failed to get family profiles:", error);
      return [];
    }

    // Get weekly earnings for each kid (last 7 days of transactions)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const balances: BalanceInfo[] = [];

    for (const profile of profiles || []) {
      // Get earnings breakdown
      const { data: transactions } = await this.client
        .schema("choretracker")
        .from("chore_transactions")
        .select("points_change, transaction_type")
        .eq("profile_id", profile.id)
        .gte("created_at", weekAgo.toISOString())
        .in("transaction_type", ["chore_completed", "bonus_awarded"]);

      const weeklyEarnings = (transactions || []).reduce(
        (sum: number, t: any) => sum + (t.points_change > 0 ? t.points_change : 0),
        0,
      );

      const choreEarnings = (transactions || [])
        .filter((t: any) => t.transaction_type === "chore_completed")
        .reduce((sum: number, t: any) => sum + (t.points_change > 0 ? t.points_change : 0), 0);

      balances.push({
        profileId: profile.id,
        profileName: profile.name,
        avatarEmoji: profile.avatar_emoji || "🧒",
        currentPoints: profile.current_points || 0,
        dollarValue: (profile.current_points || 0) * financeSettings.dollarValuePerPoint,
        weeklyEarnings,
        choreEarnings,
      });
    }

    return balances;
  }

  /**
   * Get balance info for a single profile
   */
  async getProfileBalance(
    profileId: string,
    familyId: string,
  ): Promise<BalanceInfo | null> {
    const financeSettings = await this.getFinanceSettings(familyId);

    const { data: profile, error } = await this.client
      .from("family_profiles")
      .select("id, name, avatar_emoji, current_points")
      .eq("id", profileId)
      .single();

    if (error || !profile) {
      console.error("❌ Failed to get profile:", error);
      return null;
    }

    // Get weekly earnings
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: transactions } = await this.client
      .schema("choretracker")
      .from("chore_transactions")
      .select("points_change, transaction_type")
      .eq("profile_id", profileId)
      .gte("created_at", weekAgo.toISOString())
      .in("transaction_type", ["chore_completed", "bonus_awarded"]);

    const weeklyEarnings = (transactions || []).reduce(
      (sum: number, t: any) => sum + (t.points_change > 0 ? t.points_change : 0),
      0,
    );

    const choreEarnings = (transactions || [])
      .filter((t: any) => t.transaction_type === "chore_completed")
      .reduce((sum: number, t: any) => sum + (t.points_change > 0 ? t.points_change : 0), 0);

    return {
      profileId: profile.id,
      profileName: profile.name,
      avatarEmoji: profile.avatar_emoji || "🧒",
      currentPoints: profile.current_points || 0,
      dollarValue: (profile.current_points || 0) * financeSettings.dollarValuePerPoint,
      weeklyEarnings,
      choreEarnings,
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
