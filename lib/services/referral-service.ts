/**
 * Referral Service - Share ChoreGami
 *
 * Handles referral code generation, lookup, and conversion tracking.
 * Uses JSONB storage in families.settings.apps.choregami.referral
 */

import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

export interface ReferralAttribution {
  source: string;  // 'direct', 'web', 'app', 'email', 'social'
  campaign?: string;  // Optional campaign identifier
}

export interface ReferralConversion {
  family_id: string;
  family_name: string;
  user_id: string;
  converted_at: string;
  attribution?: ReferralAttribution;
}

export interface Referral {
  code: string;
  created_at: string;
  code_refreshed_at?: string;  // Set when code is regenerated
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
    console.log("[Referral] getOrCreateReferral called", { familyId });

    // Check if referral already exists
    const { data: family } = await this.supabase
      .from("families")
      .select("settings")
      .eq("id", familyId)
      .single();

    const existing = family?.settings?.apps?.choregami?.referral;
    if (existing?.code) {
      console.log("[Referral] Found existing referral", { code: existing.code, conversions: existing.conversions?.length || 0 });
      return existing as Referral;
    }

    // Generate new code and initialize
    const code = this.generateCode();
    console.log("[Referral] Creating new referral", { familyId, code });
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
    console.log("[Referral] findByCode called", { code });

    if (!code || code.length !== 6) {
      console.log("[Referral] Invalid code length", { code, length: code?.length });
      return null;
    }

    const { data, error } = await this.supabase.rpc("find_family_by_referral_code", {
      p_code: code.toUpperCase(),
    });

    if (error) {
      console.error("[Referral] Code lookup error:", error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log("[Referral] Code not found", { code });
      return null;
    }

    const row = data[0];
    console.log("[Referral] Code found", { code, familyId: row.family_id, familyName: row.family_name });
    return {
      familyId: row.family_id,
      familyName: row.family_name,
      referral: row.referral as Referral,
    };
  }

  /**
   * Record conversion when referred user signs up
   * Uses atomic SQL function with FOR UPDATE lock to prevent race conditions
   */
  async recordConversion(
    referrerFamilyId: string,
    newFamilyId: string,
    newFamilyName: string,
    newUserId: string,
    attribution?: { source?: string; campaign?: string }
  ): Promise<{ success: boolean; error?: string }> {
    // Block self-referral (early exit before DB call)
    if (referrerFamilyId === newFamilyId) {
      return { success: false, error: "Cannot refer yourself" };
    }

    // Record the conversion atomically (SQL handles cap + duplicate checks)
    const { data, error } = await this.supabase.rpc("record_referral_conversion", {
      p_referrer_family_id: referrerFamilyId,
      p_new_family_id: newFamilyId,
      p_new_family_name: newFamilyName,
      p_new_user_id: newUserId,
      p_source: attribution?.source ?? null,
      p_campaign: attribution?.campaign ?? null,
    });

    if (error) {
      console.error("[referral] Conversion error:", error);
      return { success: false, error: "Failed to record conversion" };
    }

    // Handle result codes from atomic SQL function
    const result = data as string;
    switch (result) {
      case "success":
        return { success: true };
      case "cap_reached":
        return { success: false, error: "Maximum referral rewards reached (6 months)" };
      case "duplicate":
        return { success: false, error: "Already credited for this signup" };
      case "not_found":
        return { success: false, error: "Referrer family not found" };
      default:
        return { success: false, error: "Unknown error" };
    }
  }

  /** Refresh referral code (generates new code, preserves history) */
  async refreshCode(familyId: string): Promise<string> {
    const newCode = this.generateCode();

    const { error } = await this.supabase.rpc("refresh_referral_code", {
      p_family_id: familyId,
      p_new_code: newCode,
    });

    if (error) {
      console.error("[referral] Refresh code error:", error);
      throw new Error("Failed to refresh referral code");
    }

    return newCode;
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

  /** Get available referral bonus months (earned - redeemed) */
  async getAvailableBonus(familyId: string): Promise<number> {
    const stats = await this.getStats(familyId);
    if (!stats) return 0;
    return Math.max(0, stats.monthsEarned - stats.monthsRedeemed);
  }

  /** Apply referral bonus months (marks them as redeemed) */
  async applyReferralBonus(familyId: string, months: number): Promise<{ success: boolean; error?: string }> {
    if (months <= 0) {
      return { success: false, error: "Invalid months value" };
    }

    // Get current referral data
    const { data: family, error: fetchError } = await this.supabase
      .from("families")
      .select("settings")
      .eq("id", familyId)
      .single();

    if (fetchError || !family) {
      return { success: false, error: "Failed to fetch family" };
    }

    const referral = family.settings?.apps?.choregami?.referral;
    if (!referral) {
      return { success: false, error: "No referral data found" };
    }

    const available = (referral.reward_months_earned || 0) - (referral.reward_months_redeemed || 0);
    if (months > available) {
      return { success: false, error: `Only ${available} bonus months available` };
    }

    // Update redeemed count
    const newRedeemed = (referral.reward_months_redeemed || 0) + months;
    const currentSettings = family.settings;
    const newSettings = {
      ...currentSettings,
      apps: {
        ...currentSettings.apps,
        choregami: {
          ...currentSettings.apps?.choregami,
          referral: {
            ...referral,
            reward_months_redeemed: newRedeemed,
          },
        },
      },
    };

    const { error: updateError } = await this.supabase
      .from("families")
      .update({ settings: newSettings })
      .eq("id", familyId);

    if (updateError) {
      console.error("[ReferralService] Failed to apply bonus:", updateError);
      return { success: false, error: "Failed to apply bonus" };
    }

    console.log("[ReferralService] Bonus applied:", { familyId, months, newRedeemed });
    return { success: true };
  }
}
