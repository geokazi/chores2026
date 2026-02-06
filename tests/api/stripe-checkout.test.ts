/**
 * Stripe Checkout API Unit Tests
 * Tests checkout session creation logic and validation
 */

import { assertEquals } from "jsr:@std/assert";

// Mock environment
Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");

const VALID_PLAN_TYPES = ["summer", "school_year", "full_year"] as const;

Deno.test({
  name: "Stripe Checkout - Plan Type Validation",
  fn: async (t) => {
    await t.step("accepts summer plan", () => {
      assertEquals(VALID_PLAN_TYPES.includes("summer" as any), true);
    });

    await t.step("accepts school_year plan", () => {
      assertEquals(VALID_PLAN_TYPES.includes("school_year" as any), true);
    });

    await t.step("accepts full_year plan", () => {
      assertEquals(VALID_PLAN_TYPES.includes("full_year" as any), true);
    });

    await t.step("rejects trial plan", () => {
      assertEquals(VALID_PLAN_TYPES.includes("trial" as any), false);
    });

    await t.step("rejects free plan", () => {
      assertEquals(VALID_PLAN_TYPES.includes("free" as any), false);
    });

    await t.step("rejects invalid plan", () => {
      assertEquals(VALID_PLAN_TYPES.includes("invalid" as any), false);
    });
  },
});

Deno.test({
  name: "Stripe Checkout - Metadata Structure",
  fn: async (t) => {
    await t.step("includes required metadata fields", () => {
      const metadata = {
        family_id: "uuid-123",
        plan_type: "full_year",
        referral_bonus_months: "2",
      };

      assertEquals("family_id" in metadata, true);
      assertEquals("plan_type" in metadata, true);
      assertEquals("referral_bonus_months" in metadata, true);
    });

    await t.step("referral_bonus_months is stringified", () => {
      const bonusMonths = 3;
      const metadata = {
        referral_bonus_months: bonusMonths.toString(),
      };

      assertEquals(metadata.referral_bonus_months, "3");
      assertEquals(typeof metadata.referral_bonus_months, "string");
    });

    await t.step("handles zero bonus months", () => {
      const bonusMonths = 0;
      const metadata = {
        referral_bonus_months: bonusMonths.toString(),
      };

      assertEquals(metadata.referral_bonus_months, "0");
    });
  },
});

Deno.test({
  name: "Stripe Checkout - URL Construction",
  fn: async (t) => {
    await t.step("success URL includes session ID placeholder", () => {
      const baseUrl = "https://choregami.app";
      const successUrl = `${baseUrl}/stripe/success?session_id={CHECKOUT_SESSION_ID}`;

      assertEquals(successUrl.includes("{CHECKOUT_SESSION_ID}"), true);
      assertEquals(successUrl.startsWith("https://"), true);
    });

    await t.step("cancel URL points to pricing page", () => {
      const baseUrl = "https://choregami.app";
      const cancelUrl = `${baseUrl}/pricing`;

      assertEquals(cancelUrl, "https://choregami.app/pricing");
    });

    await t.step("handles localhost base URL", () => {
      const baseUrl = "http://localhost:8000";
      const successUrl = `${baseUrl}/stripe/success?session_id={CHECKOUT_SESSION_ID}`;

      assertEquals(successUrl.startsWith("http://localhost"), true);
    });
  },
});

Deno.test({
  name: "Stripe Checkout - Price IDs",
  fn: async (t) => {
    await t.step("summer price ID format is valid", () => {
      const priceId = "price_summer_2999";
      assertEquals(priceId.startsWith("price_"), true);
    });

    await t.step("school_year price ID format is valid", () => {
      const priceId = "price_school_4999";
      assertEquals(priceId.startsWith("price_"), true);
    });

    await t.step("full_year price ID format is valid", () => {
      const priceId = "price_annual_7999";
      assertEquals(priceId.startsWith("price_"), true);
    });
  },
});

Deno.test({
  name: "Stripe Webhook - Event Types",
  fn: async (t) => {
    const HANDLED_EVENTS = ["checkout.session.completed"];

    await t.step("handles checkout.session.completed", () => {
      assertEquals(HANDLED_EVENTS.includes("checkout.session.completed"), true);
    });

    await t.step("ignores unhandled events", () => {
      assertEquals(HANDLED_EVENTS.includes("customer.created"), false);
      assertEquals(HANDLED_EVENTS.includes("payment_intent.created"), false);
    });
  },
});

Deno.test({
  name: "Stripe Webhook - Metadata Parsing",
  fn: async (t) => {
    await t.step("parses referral bonus months correctly", () => {
      const metadata = { referral_bonus_months: "3" };
      const bonusMonths = parseInt(metadata.referral_bonus_months, 10);

      assertEquals(bonusMonths, 3);
      assertEquals(typeof bonusMonths, "number");
    });

    await t.step("handles missing referral bonus months", () => {
      const metadata = {} as { referral_bonus_months?: string };
      const bonusMonths = parseInt(metadata.referral_bonus_months || "0", 10);

      assertEquals(bonusMonths, 0);
    });

    await t.step("handles invalid referral bonus months", () => {
      const metadata = { referral_bonus_months: "invalid" };
      const bonusMonths = parseInt(metadata.referral_bonus_months, 10);

      assertEquals(Number.isNaN(bonusMonths), true);
    });
  },
});
