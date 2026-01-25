/**
 * Rewards Service for ChoreGami 2026
 * Handles P3: Rewards Marketplace functionality
 *
 * Storage: JSONB in families.settings.apps.choregami.rewards.catalog
 * Purchases: choretracker.reward_purchases (relational, FK to transactions)
 */

import { createClient } from "@supabase/supabase-js";
import { TransactionService } from "./transaction-service.ts";
import { getActivityService } from "./activity-service.ts";
import type {
  AvailableReward,
  ClaimRewardPayload,
  ClaimResult,
  RewardPurchase,
} from "../types/finance.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export class RewardsService {
  private client: any;
  private transactionService: TransactionService;

  constructor() {
    this.client = createClient(supabaseUrl, supabaseServiceKey);
    this.transactionService = new TransactionService();
  }

  /**
   * Get available rewards for a family from JSONB settings
   */
  async getAvailableRewards(familyId: string): Promise<AvailableReward[]> {
    const { data: family, error } = await this.client
      .from("families")
      .select("settings")
      .eq("id", familyId)
      .single();

    if (error) {
      console.error("❌ Failed to get family settings:", error);
      return [];
    }

    const catalog = family?.settings?.apps?.choregami?.rewards?.catalog || [];
    // Filter to active rewards only
    return catalog.filter((r: AvailableReward) => r.isActive);
  }

  /**
   * Add or update a reward in the family catalog
   */
  async upsertReward(
    familyId: string,
    reward: Omit<AvailableReward, "createdAt"> & { createdAt?: string },
  ): Promise<AvailableReward> {
    const { data: family, error } = await this.client
      .from("families")
      .select("settings")
      .eq("id", familyId)
      .single();

    if (error) throw new Error(`Failed to get family: ${error.message}`);

    const settings = family?.settings || {};
    const apps = settings.apps || {};
    const choregami = apps.choregami || {};
    const rewards = choregami.rewards || {};
    const catalog: AvailableReward[] = rewards.catalog || [];

    const now = new Date().toISOString();
    const fullReward: AvailableReward = {
      ...reward,
      createdAt: reward.createdAt || now,
    };

    // Update existing or add new
    const existingIndex = catalog.findIndex((r) => r.id === reward.id);
    if (existingIndex >= 0) {
      catalog[existingIndex] = fullReward;
    } else {
      catalog.push(fullReward);
    }

    // Update JSONB
    const { error: updateError } = await this.client
      .from("families")
      .update({
        settings: {
          ...settings,
          apps: {
            ...apps,
            choregami: {
              ...choregami,
              rewards: {
                ...rewards,
                catalog,
              },
            },
          },
        },
      })
      .eq("id", familyId);

    if (updateError) {
      throw new Error(`Failed to save reward: ${updateError.message}`);
    }

    return fullReward;
  }

  /**
   * Delete a reward from the catalog
   */
  async deleteReward(familyId: string, rewardId: string): Promise<boolean> {
    const { data: family, error } = await this.client
      .from("families")
      .select("settings")
      .eq("id", familyId)
      .single();

    if (error) throw new Error(`Failed to get family: ${error.message}`);

    const settings = family?.settings || {};
    const apps = settings.apps || {};
    const choregami = apps.choregami || {};
    const rewards = choregami.rewards || {};
    const catalog: AvailableReward[] = rewards.catalog || [];

    const filteredCatalog = catalog.filter((r) => r.id !== rewardId);

    const { error: updateError } = await this.client
      .from("families")
      .update({
        settings: {
          ...settings,
          apps: {
            ...apps,
            choregami: {
              ...choregami,
              rewards: {
                ...rewards,
                catalog: filteredCatalog,
              },
            },
          },
        },
      })
      .eq("id", familyId);

    if (updateError) {
      throw new Error(`Failed to delete reward: ${updateError.message}`);
    }

    return true;
  }

  /**
   * Claim a reward - creates pending request (NO transaction yet)
   * Points are NOT deducted until parent fulfills/approves
   *
   * Flow:
   * 1. Kid claims → status "pending", no points deducted
   * 2. Parent marks done → points deducted, transaction created, FamilyScore synced
   */
  async claimReward(payload: ClaimRewardPayload): Promise<ClaimResult> {
    const { rewardId, profileId, familyId } = payload;

    // 1. Get reward from catalog
    const rewards = await this.getAvailableRewards(familyId);
    const reward = rewards.find((r) => r.id === rewardId);

    if (!reward) {
      return { success: false, error: "Reward not found or inactive" };
    }

    // 2. Get current balance (to check affordability)
    const { data: profile, error: profileError } = await this.client
      .from("family_profiles")
      .select("current_points, name")
      .eq("id", profileId)
      .single();

    if (profileError || !profile) {
      return { success: false, error: "Profile not found" };
    }

    // Still check balance so kids can't claim things they can't afford
    if (profile.current_points < reward.pointCost) {
      return {
        success: false,
        error: `Not enough points. Need ${reward.pointCost}, have ${profile.current_points}`,
      };
    }

    // 3. Create pending purchase request (NO transaction yet - that happens when parent fulfills)
    try {
      const purchaseId = crypto.randomUUID();
      const { error: purchaseError } = await this.client
        .schema("choretracker")
        .from("reward_purchases")
        .insert({
          id: purchaseId,
          family_id: familyId,
          profile_id: profileId,
          reward_id: rewardId,
          transaction_id: null, // No transaction yet - created on fulfill
          point_cost: reward.pointCost,
          status: "pending", // Awaiting parent fulfillment
          reward_snapshot: { name: reward.name, icon: reward.icon },
          created_at: new Date().toISOString(),
        });

      if (purchaseError) {
        console.error("❌ Failed to create purchase request:", purchaseError);
        return { success: false, error: "Failed to create claim request" };
      }

      console.log("✅ Reward claim requested (pending parent approval):", {
        reward: reward.name,
        cost: reward.pointCost,
        requestedBy: profile.name,
      });

      return {
        success: true,
        purchase: {
          id: purchaseId,
          profileId,
          rewardId,
          transactionId: null as unknown as string, // Will be set when fulfilled
          pointCost: reward.pointCost,
          status: "pending",
          rewardName: reward.name,
          rewardIcon: reward.icon,
          createdAt: new Date().toISOString(),
        },
        newBalance: profile.current_points, // Balance unchanged until parent fulfills
      };
    } catch (error) {
      console.error("❌ Claim request failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get recent purchases for a profile or family
   */
  async getRecentPurchases(
    familyId: string,
    profileId?: string,
    limit = 10,
  ): Promise<RewardPurchase[]> {
    let query = this.client
      .schema("choretracker")
      .from("reward_purchases")
      .select("*")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (profileId) {
      query = query.eq("profile_id", profileId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Failed to get purchases:", error);
      return [];
    }

    return (data || []).map((p: any) => ({
      id: p.id,
      profileId: p.profile_id,
      rewardId: p.reward_id,
      transactionId: p.transaction_id,
      pointCost: p.point_cost,
      status: p.status,
      rewardName: p.reward_snapshot?.name,
      rewardIcon: p.reward_snapshot?.icon,
      createdAt: p.created_at,
      fulfilledAt: p.fulfilled_at,
    }));
  }

  /**
   * Fulfill a purchase - NOW deducts points, creates transaction, syncs FamilyScore
   *
   * This is when the financial transaction actually happens:
   * - Points deducted from kid's balance
   * - Transaction recorded in ledger
   * - FamilyScore synced
   * - Activity logged
   */
  async fulfillPurchase(
    purchaseId: string,
    fulfilledByProfileId: string,
  ): Promise<{ success: boolean; error?: string }> {
    // 1. Get the purchase details
    const { data: purchase, error: purchaseError } = await this.client
      .schema("choretracker")
      .from("reward_purchases")
      .select("*")
      .eq("id", purchaseId)
      .single();

    if (purchaseError || !purchase) {
      console.error("❌ Purchase not found:", purchaseError);
      return { success: false, error: "Purchase not found" };
    }

    // Already fulfilled?
    if (purchase.status === "fulfilled") {
      return { success: false, error: "Already fulfilled" };
    }

    // 2. Get kid's current balance and name
    const { data: profile, error: profileError } = await this.client
      .from("family_profiles")
      .select("current_points, name")
      .eq("id", purchase.profile_id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: "Profile not found" };
    }

    // 3. Verify they still have enough points
    if (profile.current_points < purchase.point_cost) {
      return {
        success: false,
        error: `Not enough points. Need ${purchase.point_cost}, have ${profile.current_points}`,
      };
    }

    // 4. NOW create the transaction (deducts points, syncs FamilyScore)
    try {
      const rewardName = purchase.reward_snapshot?.name || "Reward";
      const rewardIcon = purchase.reward_snapshot?.icon || "🎁";

      const { transactionId, newBalance } = await this.transactionService.recordRewardRedemption(
        purchase.profile_id,
        purchase.family_id,
        purchase.point_cost,
        rewardName,
        {
          rewardId: purchase.reward_id,
          rewardIcon,
          rewardName,
          purchaseId,
        },
      );

      // 5. Update purchase record with transaction ID and fulfilled status
      const { error: updateError } = await this.client
        .schema("choretracker")
        .from("reward_purchases")
        .update({
          status: "fulfilled",
          transaction_id: transactionId,
          fulfilled_at: new Date().toISOString(),
          fulfilled_by_profile_id: fulfilledByProfileId,
        })
        .eq("id", purchaseId);

      if (updateError) {
        console.warn("⚠️ Failed to update purchase status:", updateError);
      }

      // 6. Log activity for the feed
      try {
        const activityService = getActivityService();
        await activityService.logActivity({
          familyId: purchase.family_id,
          actorId: purchase.profile_id,
          actorName: profile.name,
          type: "reward_fulfilled",
          title: `${profile.name} received "${rewardName}"`,
          icon: rewardIcon,
          points: -purchase.point_cost,
          meta: { rewardId: purchase.reward_id, rewardName, purchaseId },
        });
      } catch (activityError) {
        console.warn("⚠️ Failed to log activity (non-critical):", activityError);
      }

      console.log("✅ Reward fulfilled:", {
        reward: rewardName,
        cost: purchase.point_cost,
        newBalance,
        kid: profile.name,
        fulfilledBy: fulfilledByProfileId,
      });

      return { success: true };
    } catch (error) {
      console.error("❌ Fulfill failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
