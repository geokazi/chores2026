/**
 * Referral Service - Share ChoreGami
 *
 * Handles referral code generation, lookup, and conversion tracking.
 * Uses JSONB storage in families.settings.apps.choregami.referral
 */

import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

export interface ReferralConversion {
  family_id: string;
  family_name: string;
  user_id: string;
  converted_at: string;
}

export interface Referral {
  code: string;
  created_at: string;
  conversions: ReferralConversion[];
  reward_months_earned: number;
  reward_months_redeemed: number;
  last_conversion_at: string | null;
}

export interface ReferralLookup {
  familyId: string;
  familyName: string;
  referral: Referral;
}

// Maximum free months a user can earn through referrals
const MAX_REWARD_MONTHS = 6;

export class ReferralService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
  }

  /** Generate 6-char uppercase alphanumeric code */
  generateCode(): string {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  }

  /** Get existing referral for family or create new one (idempotent) */
  async getOrCreateReferral(familyId: string): Promise<Referral> {
    // Check if referral already exists
    const { data: family } = await this.supabase
      .from("families")
      .select("settings")
      .eq("id", familyId)
      .single();

    const existing = family?.settings?.apps?.choregami?.referral;
    if (existing?.code) {
      return existing as Referral;
    }

    // Generate new code and initialize
    const code = this.generateCode();
    const { error } = await this.supabase.rpc("init_family_referral", {
      p_family_id: familyId,
      p_code: code,
    });

    if (error) {
      console.error("[referral] Init error:", error);
      throw new Error("Failed to initialize referral");
    }

    return {
      code,
      created_at: new Date().toISOString(),
      conversions: [],
      reward_months_earned: 0,
      reward_months_redeemed: 0,
      last_conversion_at: null,
    };
  }

  /** O(1) lookup by code via GIN index */
  async findByCode(code: string): Promise<ReferralLookup | null> {
    if (!code || code.length !== 6) {
      return null;
    }

    const { data, error } = await this.supabase.rpc("find_family_by_referral_code", {
      p_code: code.toUpperCase(),
    });

    if (error) {
      console.error("[referral] Code lookup error:", error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const row = data[0];
    return {
      familyId: row.family_id,
      familyName: row.family_name,
      referral: row.referral as Referral,
    };
  }

  /** Record conversion when referred user signs up */
  async recordConversion(
    referrerFamilyId: string,
    newFamilyId: string,
    newFamilyName: string,
    newUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    // Block self-referral
    if (referrerFamilyId === newFamilyId) {
      return { success: false, error: "Cannot refer yourself" };
    }

    // Check for duplicate conversion
    const { data: family } = await this.supabase
      .from("families")
      .select("settings")
      .eq("id", referrerFamilyId)
      .single();

    const referral = family?.settings?.apps?.choregami?.referral;

    // Check 6-month cap
    if ((referral?.reward_months_earned ?? 0) >= MAX_REWARD_MONTHS) {
      return { success: false, error: "Maximum referral rewards reached (6 months)" };
    }

    // Check for duplicate conversion
    if (referral?.conversions) {
      const alreadyConverted = referral.conversions.some(
        (c: ReferralConversion) => c.family_id === newFamilyId
      );
      if (alreadyConverted) {
        return { success: false, error: "Already credited for this signup" };
      }
    }

    // Record the conversion
    const { error } = await this.supabase.rpc("record_referral_conversion", {
      p_referrer_family_id: referrerFamilyId,
      p_new_family_id: newFamilyId,
      p_new_family_name: newFamilyName,
      p_new_user_id: newUserId,
    });

    if (error) {
      console.error("[referral] Conversion error:", error);
      return { success: false, error: "Failed to record conversion" };
    }

    return { success: true };
  }

  /** Get stats for display */
  async getStats(familyId: string): Promise<{
    code: string;
    conversions: number;
    monthsEarned: number;
    monthsRedeemed: number;
  } | null> {
    const referral = await this.getOrCreateReferral(familyId);
    return {
      code: referral.code,
      conversions: referral.conversions.length,
      monthsEarned: referral.reward_months_earned,
      monthsRedeemed: referral.reward_months_redeemed,
    };
  }
}
