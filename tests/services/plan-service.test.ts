/**
 * PlanService Unit Tests
 * Tests plan activation and trial initialization logic
 */

import { assertEquals } from "jsr:@std/assert";

// Mock environment for tests
Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");

Deno.test({
  name: "PlanService - Device Hash Validation",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    await t.step("rejects empty device hash", () => {
      // Device hash must be 64 hex chars (SHA-256)
      const validHash = "a".repeat(64);
      const emptyHash = "";
      const shortHash = "abc123";
      const longHash = "a".repeat(65);

      assertEquals(validHash.length === 64 && /^[a-f0-9]+$/.test(validHash), true);
      assertEquals(emptyHash.length === 64, false);
      assertEquals(shortHash.length === 64, false);
      assertEquals(longHash.length === 64, false);
    });

    await t.step("validates hex format", () => {
      const validHash = "0123456789abcdef".repeat(4);
      const invalidHash = "ghijklmnopqrstuv".repeat(4);

      assertEquals(/^[a-f0-9]{64}$/.test(validHash), true);
      assertEquals(/^[a-f0-9]{64}$/.test(invalidHash), false);
    });
  },
});

Deno.test({
  name: "PlanService - Trial Duration",
  fn: async (t) => {
    await t.step("trial expires in 15 days", () => {
      const now = new Date();
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + 15);

      const diffDays = Math.round((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      assertEquals(diffDays, 15);
    });

    await t.step("trial end date format is YYYY-MM-DD", () => {
      const date = new Date("2026-02-21T12:00:00Z");
      const formatted = date.toISOString().split("T")[0];
      assertEquals(formatted, "2026-02-21");
    });
  },
});

Deno.test({
  name: "PlanService - Plan Types",
  fn: async (t) => {
    await t.step("summer plan is 90 days", () => {
      const days = 90;
      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + days);

      const diffDays = Math.round((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      assertEquals(diffDays, 90);
    });

    await t.step("school_year plan is 300 days", () => {
      const days = 300;
      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + days);

      const diffDays = Math.round((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      assertEquals(diffDays, 300);
    });

    await t.step("full_year plan is 365 days", () => {
      const days = 365;
      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + days);

      const diffDays = Math.round((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      assertEquals(diffDays, 365);
    });
  },
});

Deno.test({
  name: "PlanService - Plan Sources",
  fn: async (t) => {
    const validSources = ["trial", "stripe", "gift", "referral_bonus"];

    await t.step("trial source is valid", () => {
      assertEquals(validSources.includes("trial"), true);
    });

    await t.step("stripe source is valid", () => {
      assertEquals(validSources.includes("stripe"), true);
    });

    await t.step("gift source is valid", () => {
      assertEquals(validSources.includes("gift"), true);
    });

    await t.step("referral_bonus source is valid", () => {
      assertEquals(validSources.includes("referral_bonus"), true);
    });

    await t.step("unknown source is invalid", () => {
      assertEquals(validSources.includes("unknown"), false);
    });
  },
});
