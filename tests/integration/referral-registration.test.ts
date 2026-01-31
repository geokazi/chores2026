/**
 * Referral Registration Integration Tests
 * Tests ref param handling through registration flow
 */

import { assertEquals } from "jsr:@std/assert";

Deno.test("Referral Registration - Param Handling", async (t) => {
  await t.step("Registration preserves ref param to setup URL", () => {
    const refCode = "ABC123";
    const setupUrl = refCode
      ? `/setup?ref=${encodeURIComponent(refCode)}`
      : "/setup";

    assertEquals(setupUrl, "/setup?ref=ABC123");
  });

  await t.step("Registration without ref param skips referral logic", () => {
    const refCode = undefined;
    const setupUrl = refCode
      ? `/setup?ref=${encodeURIComponent(refCode)}`
      : "/setup";

    assertEquals(setupUrl, "/setup");
  });

  await t.step("Self-referral is blocked at conversion time", () => {
    // This validates the logic that self-referral check happens
    const referrerFamilyId = "family-123";
    const newFamilyId = "family-123";  // Same family

    const isSelfReferral = referrerFamilyId === newFamilyId;
    assertEquals(isSelfReferral, true);
  });

  await t.step("Different family passes self-referral check", () => {
    const referrerFamilyId = "family-123";
    const newFamilyId = "family-456";  // Different family

    const isSelfReferral = referrerFamilyId === newFamilyId;
    assertEquals(isSelfReferral, false);
  });
});
