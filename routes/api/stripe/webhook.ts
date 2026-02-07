/**
 * Stripe Webhook Handler - Process payment events
 * POST /api/stripe/webhook
 * ~90 lines
 */

import { Handlers } from "$fresh/server.ts";
import { PlanService } from "../../../lib/services/plan-service.ts";
import { ReferralService } from "../../../lib/services/referral-service.ts";
import { PlanType } from "../../../lib/plan-gate.ts";
import Stripe from "npm:stripe@14";

const PAID_PLAN_TYPES = ["summer", "school_year", "full_year"] as const;
type PaidPlanType = typeof PAID_PLAN_TYPES[number];

function isPaidPlanType(type: string): type is PaidPlanType {
  return PAID_PLAN_TYPES.includes(type as PaidPlanType);
}

export const handler: Handlers = {
  async POST(req) {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeSecretKey || !webhookSecret) {
      console.error("[stripe/webhook] Missing Stripe configuration");
      return new Response("Webhook not configured", { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey);
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return new Response("Missing signature", { status: 400 });
    }

    let event: Stripe.Event;
    const body = await req.text();

    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error("[stripe/webhook] Signature verification failed:", err);
      return new Response("Webhook signature verification failed", { status: 400 });
    }

    console.log("[stripe/webhook] Received event:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};

        const familyId = metadata.family_id;
        const planType = metadata.plan_type;
        const bonusMonthsStr = metadata.referral_bonus_months || "0";

        if (!familyId || !planType) {
          console.error("[stripe/webhook] Missing metadata:", metadata);
          return new Response("Missing metadata", { status: 400 });
        }

        if (!isPaidPlanType(planType)) {
          console.error("[stripe/webhook] Invalid plan type:", planType);
          return new Response("Invalid plan type", { status: 400 });
        }

        // Activate the plan
        const planService = new PlanService();
        const result = await planService.activatePlan(
          familyId,
          planType,
          "stripe",
          {
            stripe_subscription_id: session.subscription as string,
            stripe_payment_id: session.payment_intent as string || undefined
          }
        );

        if (!result.success) {
          console.error("[stripe/webhook] Failed to activate plan:", result.error);
          return new Response("Failed to activate plan", { status: 500 });
        }

        // Apply referral bonus if any
        const bonusMonths = parseInt(bonusMonthsStr, 10);
        if (bonusMonths > 0) {
          try {
            const referralService = new ReferralService();
            await referralService.applyReferralBonus(familyId, bonusMonths);
            console.log("[stripe/webhook] Applied referral bonus:", { familyId, bonusMonths });
          } catch (e) {
            console.warn("[stripe/webhook] Could not apply referral bonus:", e);
          }
        }

        console.log("[stripe/webhook] Plan activated:", { familyId, planType, expiresAt: result.expiresAt });
        break;
      }

      default:
        console.log("[stripe/webhook] Unhandled event type:", event.type);
    }

    return new Response("OK", { status: 200 });
  },
};
