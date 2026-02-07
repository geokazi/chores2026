/**
 * Gift Code Purchase API
 * POST /api/gift/purchase - Buy a gift code for someone else
 * Generates code, optionally sends email, returns code for display
 * ~100 lines
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { getServiceSupabaseClient } from "../../../lib/supabase.ts";
import { sendGiftCodeEmail, isValidEmail } from "../../../lib/services/email-service.ts";
import type { PaidPlanType } from "../../../lib/plan-gate.ts";

interface PurchaseRequest {
  planType: string;
  recipientEmail?: string;
  recipientName?: string;
  senderName?: string;
  personalMessage?: string;
  sendEmail: boolean;
}

const VALID_PLAN_TYPES = ["summer", "school_year", "full_year"] as const;

const PLAN_DURATIONS: Record<string, string> = {
  summer: "3 months",
  school_year: "6 months",
  full_year: "12 months",
};

export const handler: Handlers = {
  async POST(req) {
    // 1. Check authentication
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated || !session.user?.id) {
      return Response.json({ error: "Please log in to purchase a gift" }, { status: 401 });
    }

    // 2. Parse and validate request
    const body: PurchaseRequest = await req.json();
    const { planType, recipientEmail, recipientName, senderName, personalMessage, sendEmail } = body;

    if (!planType || !VALID_PLAN_TYPES.includes(planType as any)) {
      return Response.json({
        error: "Invalid plan type. Choose: summer, school_year, or full_year"
      }, { status: 400 });
    }

    // If sending email, validate recipient
    if (sendEmail) {
      if (!recipientEmail || !isValidEmail(recipientEmail)) {
        return Response.json({ error: "Valid recipient email is required" }, { status: 400 });
      }
    }

    const supabase = getServiceSupabaseClient();

    // 3. Generate gift code using database function
    const { data: giftCode, error: genError } = await supabase.rpc("create_gift_code", {
      p_plan_type: planType,
      p_purchased_by: session.user.id,
      p_message: personalMessage || `Gift from ${senderName || session.user.email}`,
    });

    if (genError || !giftCode) {
      console.error("Gift code generation failed:", genError);
      return Response.json({ error: "Failed to generate gift code" }, { status: 500 });
    }

    console.log(`🎁 Gift code generated: ${giftCode} by ${session.user.email}`);

    // 4. Send email if requested
    let emailSent = false;
    let emailError: string | undefined;

    if (sendEmail && recipientEmail) {
      const emailResult = await sendGiftCodeEmail({
        recipientEmail,
        recipientName,
        senderName: senderName || session.user.email?.split("@")[0] || "A friend",
        giftCode,
        planType,
        planDuration: PLAN_DURATIONS[planType],
        personalMessage,
      });

      emailSent = emailResult.success;
      if (!emailResult.success) {
        emailError = emailResult.error;
        console.error(`Failed to send gift email to ${recipientEmail}:`, emailError);
      }
    }

    // 5. Return response
    return Response.json({
      success: true,
      giftCode,
      planType,
      planDuration: PLAN_DURATIONS[planType],
      emailSent,
      emailError,
      recipientEmail: sendEmail ? recipientEmail : undefined,
      redeemUrl: `https://choregami.app/redeem?code=${encodeURIComponent(giftCode)}`,
    });
  },
};
