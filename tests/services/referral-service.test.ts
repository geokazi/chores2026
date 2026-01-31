/**
 * ReferralService Unit Tests
 * Tests code generation, lookup, and conversion tracking
 */

import { assertEquals, assertNotEquals, assertMatch } from "jsr:@std/assert";
import { ReferralService } from "../../lib/services/referral-service.ts";

// Mock environment for tests
Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");

Deno.test({
  name: "ReferralService - Code Generation",
  // Supabase client creates internal intervals for connection management
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
  const service = new ReferralService();

  await t.step("generateCode() returns 6-character string", () => {
    const code = service.generateCode();
    assertEquals(code.length, 6);
  });

  await t.step("generateCode() returns uppercase alphanumeric only", () => {
    const code = service.generateCode();
    assertMatch(code, /^[A-Z0-9]{6}$/);
  });

  await t.step("generateCode() returns unique codes (no collisions in 1000 iterations)", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      codes.add(service.generateCode());
    }
    // Allow for some collisions but expect at least 990 unique (99%)
    assertEquals(codes.size >= 990, true, `Expected at least 990 unique codes, got ${codes.size}`);
  });
  },
});

Deno.test({
  name: "ReferralService - Lookup Validation",
  // Supabase client creates internal intervals for connection management
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
  const service = new ReferralService();

  await t.step("findByCode() returns null for empty string", async () => {
    const result = await service.findByCode("");
    assertEquals(result, null);
  });

  await t.step("findByCode() returns null for invalid length code", async () => {
    const result = await service.findByCode("ABC");
    assertEquals(result, null);
  });

  await t.step("findByCode() returns null for too-long code", async () => {
    const result = await service.findByCode("ABCDEFGH");
    assertEquals(result, null);
  });
  },
});

Deno.test({
  name: "ReferralService - Self-Referral Prevention",
  // Supabase client creates internal intervals for connection management
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
  const service = new ReferralService();

  await t.step("recordConversion() blocks self-referral", async () => {
    const familyId = "test-family-123";
    const result = await service.recordConversion(
      familyId,  // referrer
      familyId,  // same family trying to refer itself
      "Test Family",
      "user-123"
    );
    assertEquals(result.success, false);
    assertEquals(result.error, "Cannot refer yourself");
  });
  },
});
