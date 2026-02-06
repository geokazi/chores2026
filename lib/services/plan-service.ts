/**
 * Plan Service - Manage family plan activation and trial
 * Handles trial initialization, plan activation, and device hash tracking
 * ~120 lines
 */

import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { PlanType, PlanSource, PLAN_DURATIONS_DAYS, calculateNewExpiry } from "../plan-gate.ts";

export interface PlanData {
  type: PlanType;
  expires_at: string;
  activated_at: string;
  source: PlanSource;
  stripe_payment_id?: string;
  gift_code?: string;
}

export interface TrialData {
  started_at: string;
  device_hash: string;
}

export class PlanService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
  }

  /** Check if device hash already exists (fraud prevention) */
  async deviceHashExists(deviceHash: string): Promise<boolean> {
    if (!deviceHash || deviceHash.length !== 64) return false;

    const { data } = await this.supabase
      .from("families")
      .select("id")
      .eq("trial_device_hash", deviceHash)
      .limit(1);

    return data !== null && data.length > 0;
  }

  /** Initialize trial for a new family */
  async initializeTrial(familyId: string, deviceHash: string): Promise<{ success: boolean; error?: string }> {
    // Check for existing device hash (fraud prevention)
    const hashExists = await this.deviceHashExists(deviceHash);
    if (hashExists) {
      return { success: false, error: "device_exists" };
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + PLAN_DURATIONS_DAYS.trial);

    // Get current settings
    const { data: family, error: fetchError } = await this.supabase
      .from("families")
      .select("settings")
      .eq("id", familyId)
      .single();

    if (fetchError) {
      console.error("[PlanService] Failed to fetch family:", fetchError);
      return { success: false, error: "fetch_failed" };
    }

    const currentSettings = family?.settings || { _version: 1 };
    const choregamiSettings = currentSettings.apps?.choregami || {};

    // Build new settings with trial
    const newSettings = {
      ...currentSettings,
      apps: {
        ...currentSettings.apps,
        choregami: {
          ...choregamiSettings,
          plan: {
            type: "trial" as PlanType,
            expires_at: expiresAt.toISOString().split("T")[0],
            activated_at: now.toISOString(),
            source: "trial" as PlanSource,
          },
          trial: {
            started_at: now.toISOString(),
            device_hash: deviceHash,
          },
        },
      },
    };

    const { error: updateError } = await this.supabase
      .from("families")
      .update({
        settings: newSettings,
        trial_device_hash: deviceHash,
      })
      .eq("id", familyId);

    if (updateError) {
      console.error("[PlanService] Failed to initialize trial:", updateError);
      return { success: false, error: "update_failed" };
    }

    console.log("[PlanService] Trial initialized:", { familyId, expiresAt: expiresAt.toISOString() });
    return { success: true };
  }

  /** Activate a paid plan (from Stripe or gift code) */
  async activatePlan(
    familyId: string,
    planType: Exclude<PlanType, "free" | "trial">,
    source: PlanSource,
    metadata?: { stripe_payment_id?: string; gift_code?: string }
  ): Promise<{ success: boolean; expiresAt?: string; error?: string }> {
    // Get current settings
    const { data: family, error: fetchError } = await this.supabase
      .from("families")
      .select("settings")
      .eq("id", familyId)
      .single();

    if (fetchError) {
      console.error("[PlanService] Failed to fetch family:", fetchError);
      return { success: false, error: "fetch_failed" };
    }

    const currentSettings = family?.settings || { _version: 1 };
    const choregamiSettings = currentSettings.apps?.choregami || {};
    const expiresAt = calculateNewExpiry(currentSettings, planType);

    // Build updated plan
    const planData: PlanData = {
      type: planType,
      expires_at: expiresAt.toISOString().split("T")[0],
      activated_at: new Date().toISOString(),
      source,
      ...metadata,
    };

    const newSettings = {
      ...currentSettings,
      apps: {
        ...currentSettings.apps,
        choregami: {
          ...choregamiSettings,
          plan: planData,
        },
      },
    };

    const { error: updateError } = await this.supabase
      .from("families")
      .update({ settings: newSettings })
      .eq("id", familyId);

    if (updateError) {
      console.error("[PlanService] Failed to activate plan:", updateError);
      return { success: false, error: "update_failed" };
    }

    console.log("[PlanService] Plan activated:", { familyId, planType, source, expiresAt: expiresAt.toISOString() });
    return { success: true, expiresAt: expiresAt.toISOString() };
  }
}
