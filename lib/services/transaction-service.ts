/**
 * Transaction Service for ChoreGami 2026
 * Production-tested transaction ledger system copied from Choregami Eats
 * Records point changes when chores are completed/uncompleted with FamilyScore integration
 */

import { createClient } from "@supabase/supabase-js";
import {
  generateTransactionFingerprint,
  type TransactionHashData,
} from "../security/external-hash-fingerprint.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface TransactionRequest {
  profileId: string;
  familyId: string;
  choreAssignmentId?: string; // Optional for non-chore transactions
  transactionType:
    | "chore_completed"
    | "chore_reversed"
    | "adjustment"
    | "bonus_awarded"
    | "cash_out"
    | "penalty_applied"
    | "reward_redemption";
  pointsChange: number;
  description: string;
  adjustedBy?: string; // For manual adjustments
  reason?: string; // Additional context
}

export class TransactionService {
  private client: any;

  constructor() {
    this.client = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Records chore completion transaction (awards points)
   */
  async recordChoreCompletion(
    choreAssignmentId: string,
    pointValue: number,
    choreName: string,
    profileId: string,
    familyId: string,
  ): Promise<void> {
    console.log("🏆 Recording chore completion transaction:", {
      choreAssignmentId,
      pointValue,
      choreName,
      profileId,
    });

    await this.createTransaction({
      profileId,
      familyId,
      choreAssignmentId,
      transactionType: "chore_completed",
      pointsChange: pointValue,
      description: `Chore completed: ${choreName} (+${pointValue} pts)`,
    });
  }

  /**
   * Records chore reversal transaction (deducts points)
   */
  async recordChoreReversal(
    choreAssignmentId: string,
    pointValue: number,
    choreName: string,
    profileId: string,
    familyId: string,
    reason: string,
  ): Promise<void> {
    console.log("🔄 Recording chore reversal transaction:", {
      choreAssignmentId,
      pointValue,
      choreName,
      profileId,
      reason,
    });

    await this.createTransaction({
      profileId,
      familyId,
      choreAssignmentId,
      transactionType: "chore_reversed",
      pointsChange: -pointValue, // Negative to deduct points
      description:
        `Chore reversed: ${choreName} (-${pointValue} pts) - ${reason}`,
    });
  }

  /**
   * Creates a transaction record in the ChoreGami transaction table
   */
  private async createTransaction(request: TransactionRequest): Promise<void> {
    const weekEnding = this.getWeekEnding(new Date());

    // Get current balance for this profile to calculate balance_after_transaction
    const { data: profile } = await this.client
      .from("family_profiles")
      .select("current_points")
      .eq("id", request.profileId)
      .single();

    const currentBalance = profile?.current_points || 0;
    const balanceAfterTransaction = currentBalance + request.pointsChange;

    // Prevent negative balances for reversals
    if (
      request.transactionType === "chore_reversed" &&
      balanceAfterTransaction < 0
    ) {
      console.log(
        `⚠️ Reversal would cause negative balance: ${currentBalance} + ${request.pointsChange} = ${balanceAfterTransaction}`,
      );
      console.log("🔧 Setting balance to 0 to prevent constraint violation");
      // Set to 0 instead of negative and adjust points change accordingly
      const adjustedPointsChange = -currentBalance; // Only deduct what's available

      const transactionData = {
        family_id: request.familyId,
        profile_id: request.profileId,
        chore_assignment_id: request.choreAssignmentId ?? null,
        transaction_type: request.transactionType,
        points_change: adjustedPointsChange,
        balance_after_transaction: 0,
        description:
          `${request.description} (adjusted from ${request.pointsChange} to ${adjustedPointsChange} to prevent negative balance)`,
        week_ending: weekEnding,
        metadata: {
          source: "chores2026",
          timestamp: new Date().toISOString(),
          originalPointsChange: request.pointsChange,
          adjustedForBalance: true,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("💾 Creating adjusted transaction:", transactionData);

      const { error } = await this.client
        .schema("choretracker")
        .from("chore_transactions")
        .insert(transactionData);

      if (error) {
        console.error("❌ Transaction creation failed:", error);
        throw new Error(`Failed to record transaction: ${error.message}`);
      }

      console.log("✅ Adjusted transaction recorded successfully");

      // Update denormalized balance in family_profiles
      await this.updateProfileBalance(request.profileId, adjustedPointsChange);

      // 🚀 CENTRALIZED FAMILYSCORE INTEGRATION (adjusted transaction)
      try {
        const adjustedRequest = {
          ...request,
          pointsChange: adjustedPointsChange,
        };
        await this.notifyFamilyScore(adjustedRequest, 0);
      } catch (error) {
        // Log but never fail ChoreGami transactions
        console.warn(
          "⚠️ FamilyScore sync failed for adjusted transaction (non-critical):",
          error,
        );
      }
      return;
    }

    const transactionData = {
      family_id: request.familyId,
      profile_id: request.profileId,
      chore_assignment_id: request.choreAssignmentId ?? null,
      transaction_type: request.transactionType,
      points_change: request.pointsChange,
      balance_after_transaction: balanceAfterTransaction,
      description: request.description,
      week_ending: weekEnding,
      metadata: {
        source: "chores2026",
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log("💾 Creating transaction:", transactionData);

    const { error } = await this.client
      .schema("choretracker")
      .from("chore_transactions")
      .insert(transactionData);

    if (error) {
      console.error("❌ Transaction creation failed:", error);
      throw new Error(`Failed to record transaction: ${error.message}`);
    }

    console.log("✅ Transaction recorded successfully");

    // Update denormalized balance in family_profiles
    await this.updateProfileBalance(request.profileId, request.pointsChange);

    // 🚀 CENTRALIZED FAMILYSCORE INTEGRATION
    try {
      await this.notifyFamilyScore(request, balanceAfterTransaction);
    } catch (error) {
      // Log but never fail ChoreGami transactions
      console.warn("⚠️ FamilyScore sync failed (non-critical):", error);
    }
  }

  /**
   * Updates the current_points field in family_profiles table
   */
  private async updateProfileBalance(
    profileId: string,
    pointsChange: number,
  ): Promise<void> {
    try {
      // Get current balance
      const { data: profile } = await this.client
        .from("family_profiles")
        .select("current_points")
        .eq("id", profileId)
        .single();

      const currentPoints = profile?.current_points || 0;
      const newBalance = currentPoints + pointsChange;

      // Update balance
      const { error } = await this.client
        .from("family_profiles")
        .update({ current_points: newBalance })
        .eq("id", profileId);

      if (error) {
        console.error("⚠️ Failed to update profile balance:", error);
        // Don't throw - transaction record is more important
      } else {
        console.log(
          `💰 Updated profile balance: ${currentPoints} → ${newBalance}`,
        );
      }
    } catch (error) {
      console.error("⚠️ Error updating profile balance:", error);
      // Don't throw - transaction record is more important
    }
  }

  /**
   * Calculates week ending date (Sunday) for transaction grouping
   */
  private getWeekEnding(date: Date): string {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    const daysUntilSunday = (7 - dayOfWeek) % 7;
    const weekEnding = new Date(date);
    weekEnding.setDate(date.getDate() + daysUntilSunday);
    return weekEnding.toISOString().split("T")[0];
  }

  /**
   * 🚀 CENTRALIZED FAMILYSCORE INTEGRATION
   * Notifies FamilyScore of all point changes for real-time leaderboard updates
   */
  private async notifyFamilyScore(
    request: TransactionRequest,
    newBalance: number,
  ): Promise<void> {
    const familyScoreApiUrl = Deno.env.get("FAMILYSCORE_BASE_URL");
    const familyScoreApiKey = Deno.env.get("FAMILYSCORE_API_KEY");

    if (!familyScoreApiUrl || !familyScoreApiKey) {
      console.log("ℹ️ FamilyScore not configured, skipping sync");
      return;
    }

    // Generate transaction fingerprint for audit trail
    const completionTime = new Date().toISOString();
    const transactionHash = await generateTransactionFingerprint({
      family_id: request.familyId,
      user_id: request.profileId,
      points: Math.abs(request.pointsChange),
      chore_id: request.choreAssignmentId || `transaction_${Date.now()}`,
      completion_time: completionTime,
    });

    // ✅ NEW: Always use state synchronization instead of incremental approach
    const endpoint = "/api/points/set";

    // 🚀 ENHANCED: Include auto-registration metadata for smart family creation
    const payload = {
      family_id: request.familyId,
      user_id: request.profileId,
      points: newBalance, // ✅ Use absolute current balance instead of incremental change
      reason: this.mapTransactionTypeToReason(request),
      
      // 🆕 NEW: Optional smart auto-registration metadata
      family_name: `Chores2026 Family`, // Will be used only if family doesn't exist
      user_name: request.profileId.includes("parent") 
        ? `Parent` 
        : request.profileId.replace(/kid_|child_/, "").replace("_", " ").split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      user_role: request.profileId.includes("parent") ? "parent" : "child",
      
      metadata: {
        source: "chores2026_transaction_service",
        transaction_type: request.transactionType,
        transaction_hash: transactionHash,
        balance_after: newBalance,
        chore_assignment_id: request.choreAssignmentId,
        description: request.description,
        week_ending: this.getWeekEnding(new Date()),
        adjusted_by: request.adjustedBy,
        reason: request.reason,
        timestamp: completionTime,
        vault_verification: true,
      },
    };

    console.log(
      `🚀 Notifying FamilyScore: ${request.transactionType} → balance: ${newBalance}pts`,
      {
        endpoint,
        family_id: request.familyId,
        user_id: request.profileId,
        new_balance: newBalance,
        hash: transactionHash.substring(0, 8) + "...",
      },
    );

    const response = await fetch(`${familyScoreApiUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "x-api-key": familyScoreApiKey,
        "Content-Type": "application/json",
        "X-Transaction-Hash": transactionHash,
        "X-Completion-Time": completionTime,
        "X-Client-Version": "chores2026-transaction-service-1.0",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() =>
        "Unable to read error"
      );
      throw new Error(`FamilyScore API error ${response.status}: ${errorText}`);
    }

    console.log(
      `✅ FamilyScore synced: ${request.transactionType} ${request.pointsChange}pts`,
    );
  }

  /**
   * Maps transaction types to FamilyScore reason codes
   */
  private mapTransactionTypeToReason(request: TransactionRequest): string {
    const reasonMap = {
      "chore_completed": `chore_completion_${request.choreAssignmentId}`,
      "chore_reversed": `chore_reversal_${request.choreAssignmentId}`,
      "adjustment": "parent_adjustment",
      "bonus_awarded": "achievement_bonus",
      "cash_out": "cash_out",
      "penalty_applied": "penalty",
      "reward_redemption": "reward_redemption",
    };
    return reasonMap[request.transactionType as keyof typeof reasonMap] ||
      "unknown_transaction";
  }

  /**
   * 🆕 NEW TRANSACTION METHODS FOR EXPANDED FUNCTIONALITY
   */

  /**
   * Records manual point adjustment by family admin
   */
  async recordManualAdjustment(
    profileId: string,
    pointsChange: number,
    reason: string,
    adjustedBy: string,
    familyId: string,
  ): Promise<void> {
    console.log("🔧 Recording manual adjustment:", {
      profileId,
      pointsChange,
      reason,
      adjustedBy,
      familyId,
    });

    await this.createTransaction({
      profileId,
      familyId,
      transactionType: "adjustment",
      pointsChange,
      description: `Manual adjustment: ${reason}`,
      adjustedBy,
      reason,
    });
  }

  /**
   * Records bonus point award (achievements, special events, etc.)
   */
  async recordBonusAward(
    profileId: string,
    points: number,
    bonusType: string,
    familyId: string,
  ): Promise<void> {
    console.log("🎉 Recording bonus award:", {
      profileId,
      points,
      bonusType,
      familyId,
    });

    await this.createTransaction({
      profileId,
      familyId,
      transactionType: "bonus_awarded",
      pointsChange: points,
      description: `Bonus award: ${bonusType} (+${points} pts)`,
      reason: bonusType,
    });
  }

  /**
   * Records system correction (admin fixes, data migrations, etc.)
   */
  async recordSystemCorrection(
    profileId: string,
    pointsChange: number,
    reason: string,
    familyId: string,
  ): Promise<void> {
    console.log("🔨 Recording system correction:", {
      profileId,
      pointsChange,
      reason,
      familyId,
    });

    await this.createTransaction({
      profileId,
      familyId,
      transactionType: "adjustment",
      pointsChange,
      description: `System correction: ${reason}`,
      reason,
      adjustedBy: "system",
    });
  }

  /**
   * Records point adjustment (used by parent point adjustment API)
   */
  async recordPointAdjustment(
    adjustmentId: string,
    pointsChange: number,
    reason: string,
    profileId: string,
    familyId: string,
  ): Promise<void> {
    console.log("⚡ Recording point adjustment:", {
      adjustmentId,
      pointsChange,
      reason,
      profileId,
      familyId,
    });

    await this.createTransaction({
      profileId,
      familyId,
      // choreAssignmentId omitted - manual adjustments don't have a chore assignment
      transactionType: "adjustment",
      pointsChange,
      description: `Point adjustment: ${reason}`,
      reason,
      adjustedBy: "parent",
    });
  }

  /**
   * 🔄 FAMILYSCORE SYNC METHODS
   * Methods for synchronizing local state with FamilyScore to resolve discrepancies
   */

  /**
   * Sync local family state with FamilyScore to resolve discrepancies
   */
  async syncWithFamilyScore(
    familyId: string, 
    options: {
      mode?: "compare" | "force_local" | "force_familyscore";
      dryRun?: boolean;
      localState?: Array<{
        user_id: string;
        current_points: number;
        name: string;
        role?: string;
      }>;
    } = {}
  ): Promise<SyncResult> {
    const familyScoreApiUrl = Deno.env.get("FAMILYSCORE_BASE_URL");
    const familyScoreApiKey = Deno.env.get("FAMILYSCORE_API_KEY");

    if (!familyScoreApiUrl || !familyScoreApiKey) {
      console.warn("⚠️ FamilyScore not configured, cannot sync");
      return { 
        success: false, 
        error: "FamilyScore not configured",
        sync_performed: false 
      };
    }

    try {
      console.log("🔄 Starting FamilyScore sync...", { familyId, options });

      // Use provided local state or fetch from database
      let localBalances;
      if (options.localState && options.localState.length > 0) {
        // Use provided local state (from UI)
        localBalances = options.localState.map(profile => ({
          profile_id: profile.user_id,
          name: profile.name,
          current_points: profile.current_points,
          role: profile.role
        }));
        console.log("📋 Using provided local state for sync:", { 
          member_count: localBalances.length,
          total_points: localBalances.reduce((sum, p) => sum + p.current_points, 0)
        });
      } else {
        // Fetch current local balances from Supabase
        localBalances = await this.getCurrentFamilyBalances(familyId);
        console.log("📋 Fetched local state from database:", { 
          member_count: localBalances.length,
          total_points: localBalances.reduce((sum, p) => sum + p.current_points, 0)
        });
      }
      
      const payload = {
        family_id: familyId,
        local_state: localBalances.map(profile => ({
          user_id: profile.profile_id,
          current_points: profile.current_points || 0,
          name: profile.name || "Unknown",
          role: profile.role,
          last_transaction_hash: profile.last_transaction_hash
        })),
        sync_mode: options.mode || "force_local",
        dry_run: options.dryRun || false,
        client_timestamp: new Date().toISOString()
      };

      console.log("📋 Final sync payload:", { 
        family_id: familyId,
        local_users: payload.local_state.length,
        mode: payload.sync_mode,
        total_local_points: payload.local_state.reduce((sum, u) => sum + u.current_points, 0)
      });

      const response = await fetch(`${familyScoreApiUrl}/api/sync/leaderboard`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": familyScoreApiKey,
          "X-Client-Version": "chores2026-transaction-service-1.0",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unable to read error");
        throw new Error(`FamilyScore sync failed ${response.status}: ${errorText}`);
      }

      const result: SyncResult = await response.json();
      
      if (result.success && result.sync_performed) {
        console.log("✅ FamilyScore sync completed:", {
          changes_made: result.sync_performed,
          discrepancies: result.data?.sync_results?.discrepancies_found || 0
        });

        // Apply any recommended local changes if needed
        if (result.data?.sync_results?.actions_taken?.length > 0) {
          await this.applySyncResults(result.data.sync_results);
        }
        
        // Trigger UI refresh
        await this.notifyBalanceUpdate(familyId);
      }
      
      return result;
      
    } catch (error) {
      console.warn("⚠️ FamilyScore sync failed (non-critical):", error);
      return { 
        success: false, 
        error: error.message,
        sync_performed: false 
      };
    }
  }

  /**
   * Get current family member balances from local Supabase database
   */
  private async getCurrentFamilyBalances(familyId: string): Promise<Array<{
    profile_id: string;
    name: string;
    current_points: number;
    role?: string;
    last_transaction_hash?: string;
  }>> {
    try {
      const { data, error } = await this.client
        .from("family_profiles")
        .select("profile_id, name, current_points, role, last_transaction_hash")
        .eq("family_id", familyId);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("❌ Failed to get family balances:", error);
      return [];
    }
  }

  /**
   * Apply sync results by updating local database if needed
   */
  private async applySyncResults(syncResults: any): Promise<void> {
    try {
      if (!syncResults.actions_taken?.length) return;

      console.log("🔧 Applying sync results...", {
        actions: syncResults.actions_taken.length
      });

      for (const action of syncResults.actions_taken) {
        if (action.action === "updated_points" && action.user_id) {
          // Update local balance to match FamilyScore
          await this.updateLocalBalance(action.user_id, action.new_points);
          console.log(`✅ Updated local balance: ${action.user_id} → ${action.new_points}pts`);
        }
      }
    } catch (error) {
      console.error("❌ Failed to apply sync results:", error);
    }
  }

  /**
   * Update local profile balance
   */
  private async updateLocalBalance(profileId: string, newPoints: number): Promise<void> {
    try {
      const { error } = await this.client
        .from("family_profiles")
        .update({ current_points: newPoints })
        .eq("profile_id", profileId);

      if (error) throw error;
    } catch (error) {
      console.error(`❌ Failed to update local balance for ${profileId}:`, error);
      throw error;
    }
  }

  /**
   * Notify UI of balance updates (placeholder for future implementation)
   */
  private async notifyBalanceUpdate(familyId: string): Promise<void> {
    // Future: Could trigger WebSocket notifications or other UI updates
    console.log(`📡 Balance update notification sent for family ${familyId}`);
  }

  /**
   * Perform startup sync to catch any missed updates
   */
  async performStartupSync(familyId: string): Promise<SyncResult> {
    console.log("🔄 Performing startup sync with FamilyScore...");
    
    const result = await this.syncWithFamilyScore(familyId, { mode: "force_local" });
    
    if (result.success && result.data?.sync_results?.discrepancies_found > 0) {
      console.log(`ℹ️ Found ${result.data.sync_results.discrepancies_found} sync discrepancies`);
      // Could trigger user notification or auto-repair
    }
    
    return result;
  }
}

// Types for sync functionality
interface SyncResult {
  success: boolean;
  sync_performed: boolean;
  error?: string;
  data?: {
    family_id?: string;
    leaderboard?: Array<any>;
    version_seq?: number;
    last_sync_at?: string;
    sync_results?: {
      discrepancies_found: number;
      actions_taken?: Array<{
        user_id: string;
        action: string;
        old_points: number;
        new_points: number;
        reason: string;
      }>;
      sync_completed_at?: string;
    };
  };
}
