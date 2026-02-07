/**
 * Gift Code Validation API
 * POST /api/gift/validate - Check if a gift code is valid (no login required)
 * ~30 lines - validates code exists and is unused, returns plan info
 */

import { Handlers } from "$fresh/server.ts";
import { getServiceSupabaseClient } from "../../../lib/supabase.ts";

export const handler: Handlers = {
  async POST(req) {
    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return Response.json({ valid: false, error: "Gift code is required" }, { status: 400 });
    }

    // Normalize code: uppercase, trim
    const normalizedCode = code.toUpperCase().trim();

    const supabase = getServiceSupabaseClient();

    // Find unused gift code
    const { data: giftCode, error: findError } = await supabase
      .from("gift_codes")
      .select("plan_type, message")
      .eq("code", normalizedCode)
      .is("redeemed_by", null)
      .single();

    if (findError || !giftCode) {
      return Response.json({ valid: false, error: "Invalid or already used code" });
    }

    // Code is valid - return plan info without redeeming
    return Response.json({
      valid: true,
      plan_type: giftCode.plan_type,
      message: giftCode.message || null,
    });
  },
};
