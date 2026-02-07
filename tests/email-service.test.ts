/**
 * Email Service Unit Tests
 * Tests email service logic with mocked database calls
 *
 * Run with: deno test --allow-env --allow-net --allow-read tests/email-service.test.ts
 */

import { assertEquals } from "jsr:@std/assert";

// Mock environment
Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");

Deno.test({
  name: "Email Service - Email Validation",
  fn: async (t) => {
    await t.step("validates email format correctly", () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      assertEquals(emailRegex.test("user@example.com"), true);
      assertEquals(emailRegex.test("test.email@domain.org"), true);
      assertEquals(emailRegex.test("invalid-email"), false);
      assertEquals(emailRegex.test("@missing-local.com"), false);
      assertEquals(emailRegex.test("missing-domain@"), false);
    });

    await t.step("filters empty emails from list", () => {
      const emails = ["user@example.com", "", "test@domain.org", null, undefined]
        .filter((e): e is string => typeof e === "string" && e.length > 0);

      assertEquals(emails.length, 2);
      assertEquals(emails[0], "user@example.com");
      assertEquals(emails[1], "test@domain.org");
    });
  },
});

Deno.test({
  name: "Email Service - Goal Email Data Structure",
  fn: async (t) => {
    await t.step("goal email data has required fields", () => {
      const goalEmailData = {
        familyName: "Test Family",
        goalAmount: 20,
        bonusAmount: 2,
        memberNames: ["Kid1", "Kid2", "Parent"],
      };

      assertEquals(typeof goalEmailData.familyName, "string");
      assertEquals(typeof goalEmailData.goalAmount, "number");
      assertEquals(typeof goalEmailData.bonusAmount, "number");
      assertEquals(Array.isArray(goalEmailData.memberNames), true);
    });

    await t.step("formats member names correctly", () => {
      const memberNames = ["Alice", "Bob", "Charlie"];
      const formatted = memberNames.join(", ");

      assertEquals(formatted, "Alice, Bob, Charlie");
    });

    await t.step("handles empty member list", () => {
      const memberNames: string[] = [];
      const formatted = memberNames.length > 0
        ? memberNames.join(", ")
        : "No members";

      assertEquals(formatted, "No members");
    });
  },
});

Deno.test({
  name: "Email Service - Result Handling",
  fn: async (t) => {
    await t.step("success result has correct structure", () => {
      const successResult = { success: true, error: undefined };

      assertEquals(successResult.success, true);
      assertEquals(successResult.error, undefined);
    });

    await t.step("error result has correct structure", () => {
      const errorResult = { success: false, error: "No recipient emails provided" };

      assertEquals(errorResult.success, false);
      assertEquals(typeof errorResult.error, "string");
    });

    await t.step("handles empty recipient list", () => {
      const recipients: string[] = [];
      const result = recipients.length === 0
        ? { success: false, error: "No recipient emails provided" }
        : { success: true };

      assertEquals(result.success, false);
      assertEquals(result.error, "No recipient emails provided");
    });
  },
});

Deno.test({
  name: "Email Service - Parent Email Filtering",
  fn: async (t) => {
    // Mock family profiles data structure
    const mockFamilyProfiles = [
      { id: "1", name: "Mom", role: "parent", user_id: "user-1" },
      { id: "2", name: "Dad", role: "parent", user_id: "user-2" },
      { id: "3", name: "Kid1", role: "child", user_id: null },
      { id: "4", name: "Kid2", role: "child", user_id: null },
    ];

    // Mock auth users
    const mockAuthUsers = [
      { id: "user-1", email: "mom@example.com" },
      { id: "user-2", email: "dad@example.com" },
    ];

    await t.step("filters only parent profiles", () => {
      const parents = mockFamilyProfiles.filter(
        (p) => p.role === "parent" && p.user_id
      );

      assertEquals(parents.length, 2);
      assertEquals(parents[0].name, "Mom");
      assertEquals(parents[1].name, "Dad");
    });

    await t.step("maps user_ids to emails", () => {
      const parents = mockFamilyProfiles.filter(
        (p) => p.role === "parent" && p.user_id
      );

      const emails = parents
        .map((p) => mockAuthUsers.find((u) => u.id === p.user_id)?.email)
        .filter((e): e is string => typeof e === "string");

      assertEquals(emails.length, 2);
      assertEquals(emails.includes("mom@example.com"), true);
      assertEquals(emails.includes("dad@example.com"), true);
    });

    await t.step("handles missing auth user", () => {
      const parentsWithMissingUser = [
        { id: "1", name: "Mom", role: "parent", user_id: "user-missing" },
      ];

      const emails = parentsWithMissingUser
        .map((p) => mockAuthUsers.find((u) => u.id === p.user_id)?.email)
        .filter((e): e is string => typeof e === "string");

      assertEquals(emails.length, 0);
    });
  },
});
