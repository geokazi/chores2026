/**
 * Gift Code Redemption API
 * POST /api/gift/redeem - Redeem a gift code to activate a plan
 * ~60 lines - validates code, activates plan, extends if existing
 */

import { Handlers } from "$fresh/server.ts";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { calculateNewExpiry, PlanType } from "../../../lib/plan-gate.ts";

export const handler: Handlers = {
  async POST(req) {
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated) {
      return Response.json({ error: "Please log in to redeem a gift code" }, { status: 401 });
    }

    const { code, familyId: explicitFamilyId } = await req.json();
    if (!code || typeof code !== "string") {
      return Response.json({ error: "Gift code is required" }, { status: 400 });
    }

    // Use explicit familyId if provided (from /setup flow), otherwise from session
    const targetFamilyId = explicitFamilyId || session.family?.id;
    if (!targetFamilyId) {
      return Response.json({ error: "No family to apply code to. Complete setup first." }, { status: 400 });
    }

    // Normalize code: uppercase, trim
    const normalizedCode = code.toUpperCase().trim();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find unused gift code
    const { data: giftCode, error: findError } = await supabase
      .from("gift_codes")
      .select("*")
      .eq("code", normalizedCode)
      .is("redeemed_by", null)
      .single();

    if (findError || !giftCode) {
      console.log(`❌ Gift code not found or already used: ${normalizedCode}`);
      return Response.json({ error: "Invalid or already used code" }, { status: 400 });
    }

    // Calculate new expiry (extends if existing plan)
    const familyId = targetFamilyId;
    const planType = giftCode.plan_type as Exclude<PlanType, 'free'>;

    // If explicit familyId provided (setup flow), fetch current family settings
    let currentFamilySettings = session.family?.settings || {};
    if (explicitFamilyId && explicitFamilyId !== session.family?.id) {
      const { data: familyData } = await supabase
        .from("families")
        .select("settings")
        .eq("id", explicitFamilyId)
        .single();
      currentFamilySettings = familyData?.settings || {};
    }

    const newExpiry = calculateNewExpiry(currentFamilySettings, planType);

    // Update family settings with new plan
    const currentSettings = currentFamilySettings as Record<string, unknown>;
    const currentApps = (currentSettings.apps || {}) as Record<string, unknown>;
    const currentChoregami = (currentApps.choregami || {}) as Record<string, unknown>;
    const updatedSettings = {
      ...currentSettings,
      apps: {
        ...currentApps,
        choregami: {
          ...currentChoregami,
          plan: {
            type: planType,
            expires_at: newExpiry.toISOString().split('T')[0], // YYYY-MM-DD
            activated_at: new Date().toISOString().split('T')[0],
            source: "gift",
            gift_code: normalizedCode,
          },
        },
      },
    };

    // Transaction: update family settings + mark code as redeemed
    const { error: updateError } = await supabase
      .from("families")
      .update({ settings: updatedSettings })
      .eq("id", familyId);

    if (updateError) {
      console.error("❌ Failed to update family settings:", updateError);
      return Response.json({ error: "Failed to activate plan" }, { status: 500 });
    }

    const { error: redeemError } = await supabase
      .from("gift_codes")
      .update({
        redeemed_by: familyId,
        redeemed_at: new Date().toISOString(),
      })
      .eq("code", normalizedCode);

    if (redeemError) {
      console.error("❌ Failed to mark code as redeemed:", redeemError);
      // Plan is already activated, so just log - don't fail the request
    }

    console.log(`✅ Gift code redeemed: ${normalizedCode} → family ${familyId}, expires ${newExpiry.toISOString()}`);

    return Response.json({
      success: true,
      plan_type: planType,
      expires_at: newExpiry.toISOString(),
      message: giftCode.message || null,
    });
  },
};
