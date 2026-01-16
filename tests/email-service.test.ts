/**
 * Email Service Test
 * Tests sending goal achieved email to real recipients
 *
 * Run with: deno test --allow-env --allow-net --allow-read tests/email-service.test.ts
 */

import "jsr:@std/dotenv/load";
import { assertEquals } from "jsr:@std/assert";
import {
  getParentEmails,
  sendGoalAchievedEmail,
  notifyGoalAchieved,
} from "../lib/services/email-service.ts";

const TEST_FAMILY_ID = "445717ba-0841-4b68-994f-eef77bcf4f87"; // GK Family

Deno.test({
  name: "getParentEmails - returns emails for parents with user_id",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
  const emails = await getParentEmails(TEST_FAMILY_ID);

  console.log("Found parent emails:", emails);

  // Should find at least Dad's email
  assertEquals(emails.length > 0, true, "Should find at least one parent email");
  assertEquals(emails.includes("gkyah@yahoo.com"), true, "Should include Dad's email");
  },
});

Deno.test({
  name: "sendGoalAchievedEmail - sends real email to GK Family parents",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
  const emails = await getParentEmails(TEST_FAMILY_ID);

  console.log("Sending test email to:", emails);

  const result = await sendGoalAchievedEmail(emails, {
    familyName: "GK Family",
    goalAmount: 20,
    bonusAmount: 2,
    memberNames: ["Cikũ", "Julia", "Tonie!", "Mom", "Dad"],
  });

  console.log("Send result:", result);

  assertEquals(result.success, true, `Email should send successfully: ${result.error}`);
  },
});

Deno.test({
  name: "notifyGoalAchieved - full integration test",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
  // This tests the convenience wrapper
  await notifyGoalAchieved(
    TEST_FAMILY_ID,
    "GK Family",
    25, // goal amount
    3,  // bonus amount
    ["Cikũ", "Julia", "Tonie!", "Mom", "Dad"]
  );

  // If no error thrown, test passes
  console.log("✅ notifyGoalAchieved completed without error");
  },
});
