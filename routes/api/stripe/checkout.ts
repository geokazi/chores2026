/**
 * Stripe Checkout API - Create checkout session for plan purchase
 * POST /api/stripe/checkout
 * Supports both subscription (recurring) and one-time payment modes
 * ~90 lines
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { getSubscriptionPriceIds, getOnetimePriceIds } from "../../../lib/plan-gate.ts";
import { ReferralService } from "../../../lib/services/referral-service.ts";
import Stripe from "npm:stripe@14";

// One-time plan types (fixed term purchases)
const ONETIME_PLAN_TYPES = ["summer", "school_year", "full_year"] as const;
type OnetimePlanType = typeof ONETIME_PLAN_TYPES[number];

// Subscription plan types (auto-renewing)
const SUBSCRIPTION_PLAN_TYPES = ["monthly", "annual"] as const;
type SubscriptionPlanType = typeof SUBSCRIPTION_PLAN_TYPES[number];

const BILLING_MODES = ["subscription", "onetime"] as const;
type BillingMode = typeof BILLING_MODES[number];

function isOnetimePlanType(type: string): type is OnetimePlanType {
  return ONETIME_PLAN_TYPES.includes(type as OnetimePlanType);
}

function isSubscriptionPlanType(type: string): type is SubscriptionPlanType {
  return SUBSCRIPTION_PLAN_TYPES.includes(type as SubscriptionPlanType);
}

function isBillingMode(mode: string): mode is BillingMode {
  return BILLING_MODES.includes(mode as BillingMode);
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

    let body: { planType: string; billingMode?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { planType, billingMode = "onetime" } = body;
    if (!isBillingMode(billingMode)) {
      return Response.json({ error: "Invalid billing mode" }, { status: 400 });
    }

    // Validate plan type based on billing mode
    if (billingMode === "onetime" && !isOnetimePlanType(planType)) {
      return Response.json({ error: "Invalid plan type for one-time purchase" }, { status: 400 });
    }
    if (billingMode === "subscription" && !isSubscriptionPlanType(planType)) {
      return Response.json({ error: "Invalid plan type for subscription" }, { status: 400 });
    }

    const stripe = new Stripe(stripeSecretKey);

    // Get the appropriate price ID based on billing mode
    let priceId: string;
    if (billingMode === "subscription") {
      const priceIds = getSubscriptionPriceIds();
      priceId = priceIds[planType as SubscriptionPlanType];
    } else {
      const priceIds = getOnetimePriceIds();
      priceId = priceIds[planType as OnetimePlanType];
    }

    // Stripe checkout mode: subscription for recurring, payment for one-time
    const checkoutMode = billingMode === "subscription" ? "subscription" : "payment";

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
        mode: checkoutMode,
        payment_method_types: ["card"],
        line_items: [{
          price: priceId,
          quantity: 1,
        }],
        metadata: {
          family_id: session.family.id,
          plan_type: planType,
          billing_mode: billingMode,
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
