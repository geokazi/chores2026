/**
 * Stripe Checkout API - Create checkout session for plan purchase
 * POST /api/stripe/checkout
 * ~70 lines
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { PlanType, STRIPE_PRICE_IDS } from "../../../lib/plan-gate.ts";
import { ReferralService } from "../../../lib/services/referral-service.ts";
import Stripe from "npm:stripe@14";

const PAID_PLAN_TYPES = ["summer", "school_year", "full_year"] as const;
type PaidPlanType = typeof PAID_PLAN_TYPES[number];

function isPaidPlanType(type: string): type is PaidPlanType {
  return PAID_PLAN_TYPES.includes(type as PaidPlanType);
}

export const handler: Handlers = {
  async POST(req) {
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated || !session.family) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      console.error("[stripe/checkout] STRIPE_SECRET_KEY not configured");
      return Response.json({ error: "Payment service unavailable" }, { status: 503 });
    }

    let body: { planType: string };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { planType } = body;
    if (!isPaidPlanType(planType)) {
      return Response.json({ error: "Invalid plan type" }, { status: 400 });
    }

    const stripe = new Stripe(stripeSecretKey);
    const priceId = STRIPE_PRICE_IDS[planType];

    // Check for referral bonus
    let bonusMonths = 0;
    try {
      const referralService = new ReferralService();
      bonusMonths = await referralService.getAvailableBonus(session.family.id);
    } catch (e) {
      console.warn("[stripe/checkout] Could not check referral bonus:", e);
    }

    // Build URLs
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    try {
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{
          price: priceId,
          quantity: 1,
        }],
        metadata: {
          family_id: session.family.id,
          plan_type: planType,
          referral_bonus_months: bonusMonths.toString(),
        },
        success_url: `${baseUrl}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/pricing`,
      });

      return Response.json({ url: checkoutSession.url });
    } catch (error) {
      console.error("[stripe/checkout] Failed to create session:", error);
      return Response.json({ error: "Failed to create checkout session" }, { status: 500 });
    }
  },
};
