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
   * Claim a reward - validates balance, creates transaction, records purchase
   * Uses TransactionService for FamilyScore sync
   */
  async claimReward(payload: ClaimRewardPayload): Promise<ClaimResult> {
    const { rewardId, profileId, familyId } = payload;

    // 1. Get reward from catalog
    const rewards = await this.getAvailableRewards(familyId);
    const reward = rewards.find((r) => r.id === rewardId);

    if (!reward) {
      return { success: false, error: "Reward not found or inactive" };
    }

    // 2. Get current balance
    const { data: profile, error: profileError } = await this.client
      .from("family_profiles")
      .select("current_points, name")
      .eq("id", profileId)
      .single();

    if (profileError || !profile) {
      return { success: false, error: "Profile not found" };
    }

    if (profile.current_points < reward.pointCost) {
      return {
        success: false,
        error: `Not enough points. Need ${reward.pointCost}, have ${profile.current_points}`,
      };
    }

    // 3. Create transaction via TransactionService (handles FamilyScore sync)
    try {
      const { transactionId, newBalance } = await this.transactionService.recordRewardRedemption(
        profileId,
        familyId,
        reward.pointCost,
        reward.name,
        {
          rewardId: reward.id,
          rewardIcon: reward.icon,
          rewardName: reward.name,
        },
      );

      // 4. Record purchase with FK to transaction
      const purchaseId = crypto.randomUUID();
      const { error: purchaseError } = await this.client
        .schema("choretracker")
        .from("reward_purchases")
        .insert({
          id: purchaseId,
          family_id: familyId,
          profile_id: profileId,
          reward_id: rewardId,
          transaction_id: transactionId,
          point_cost: reward.pointCost,
          status: "purchased",
          reward_snapshot: { name: reward.name, icon: reward.icon },
          created_at: new Date().toISOString(),
        });

      if (purchaseError) {
        console.warn("⚠️ Failed to record purchase (non-critical):", purchaseError);
      }

      console.log("✅ Reward claimed:", {
        reward: reward.name,
        cost: reward.pointCost,
        newBalance,
        claimedBy: profile.name,
      });

      // Log activity for the feed
      try {
        const activityService = getActivityService();
        await activityService.logActivity({
          familyId,
          actorId: profileId,
          actorName: profile.name,
          type: "reward_claimed",
          title: `${profile.name} claimed "${reward.name}"`,
          icon: reward.icon || "🎁",
          points: -reward.pointCost,
          meta: { rewardId: reward.id, rewardName: reward.name },
        });
      } catch (activityError) {
        console.warn("⚠️ Failed to log reward claim activity (non-critical):", activityError);
      }

      return {
        success: true,
        purchase: {
          id: purchaseId,
          profileId,
          rewardId,
          transactionId,
          pointCost: reward.pointCost,
          status: "purchased",
          rewardName: reward.name,
          rewardIcon: reward.icon,
          createdAt: new Date().toISOString(),
        },
        newBalance,
      };
    } catch (error) {
      console.error("❌ Claim failed:", error);
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
   * Mark a purchase as fulfilled (parent confirms delivery)
   */
  async fulfillPurchase(
    purchaseId: string,
    fulfilledByProfileId: string,
  ): Promise<boolean> {
    const { error } = await this.client
      .schema("choretracker")
      .from("reward_purchases")
      .update({
        status: "fulfilled",
        fulfilled_at: new Date().toISOString(),
        fulfilled_by_profile_id: fulfilledByProfileId,
      })
      .eq("id", purchaseId);

    if (error) {
      console.error("❌ Failed to fulfill purchase:", error);
      return false;
    }

    return true;
  }
}
