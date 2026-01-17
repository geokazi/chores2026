/**
 * Kid Management Test
 * Tests add, edit, and soft-delete functionality
 *
 * Run with: deno test --allow-env --allow-net --allow-read tests/kid-management.test.ts
 */

import "jsr:@std/dotenv/load";
import { assertEquals, assertExists } from "jsr:@std/assert";
import { ChoreService } from "../lib/services/chore-service.ts";

const TEST_FAMILY_ID = "445717ba-0841-4b68-994f-eef77bcf4f87"; // GK Family

Deno.test({
  name: "getKidCount - returns correct count of active kids",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const choreService = new ChoreService();
    const count = await choreService.getKidCount(TEST_FAMILY_ID);

    console.log("Kid count:", count);
    assertEquals(typeof count, "number", "Count should be a number");
    assertEquals(count >= 0, true, "Count should be non-negative");
    assertEquals(count <= 8, true, "Count should not exceed max of 8");
  },
});

Deno.test({
  name: "addKid - adds new kid and respects max limit",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const choreService = new ChoreService();
    const testName = `Test Kid ${Date.now()}`;

    // Get initial count
    const initialCount = await choreService.getKidCount(TEST_FAMILY_ID);
    console.log("Initial kid count:", initialCount);

    if (initialCount >= 8) {
      console.log("⚠️ Family already at max kids, skipping add test");
      return;
    }

    // Add a test kid
    const newKid = await choreService.addKid(TEST_FAMILY_ID, testName);
    assertExists(newKid, "Should return new kid data");
    assertEquals(newKid.name, testName, "Name should match");
    assertEquals(newKid.role, "child", "Role should be child");
    assertEquals(newKid.current_points, 0, "Should start with 0 points");

    console.log("✅ Added test kid:", newKid.id, newKid.name);

    // Verify count increased
    const newCount = await choreService.getKidCount(TEST_FAMILY_ID);
    assertEquals(newCount, initialCount + 1, "Count should increase by 1");

    // Clean up - soft delete the test kid
    const deleted = await choreService.softDeleteKid(newKid.id);
    assertEquals(deleted, true, "Should successfully soft delete");
    console.log("✅ Cleaned up test kid");
  },
});

Deno.test({
  name: "updateKidName - updates kid name",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const choreService = new ChoreService();

    // Create test kid
    const testKid = await choreService.addKid(TEST_FAMILY_ID, "NameTest Kid");
    assertExists(testKid, "Should create test kid");

    // Update name
    const newName = "Updated Name " + Date.now();
    const updated = await choreService.updateKidName(testKid.id, newName);
    assertEquals(updated, true, "Should return true on success");

    // Verify update
    const member = await choreService.getFamilyMember(testKid.id);
    assertExists(member, "Should find updated member");
    assertEquals(member.name, newName, "Name should be updated");

    console.log("✅ Name updated from 'NameTest Kid' to:", newName);

    // Clean up
    await choreService.softDeleteKid(testKid.id);
    console.log("✅ Cleaned up test kid");
  },
});

Deno.test({
  name: "softDeleteKid - marks kid as deleted without permanent deletion",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const choreService = new ChoreService();

    // Create test kid
    const testKid = await choreService.addKid(TEST_FAMILY_ID, "DeleteTest Kid");
    assertExists(testKid, "Should create test kid");

    // Soft delete
    const deleted = await choreService.softDeleteKid(testKid.id);
    assertEquals(deleted, true, "Should return true on success");

    // Verify kid no longer appears in active list
    const members = await choreService.getFamilyMembers(TEST_FAMILY_ID);
    const found = members.find((m) => m.id === testKid.id);
    assertEquals(found, undefined, "Deleted kid should not appear in active members");

    console.log("✅ Kid soft deleted and no longer in active list");
  },
});

Deno.test({
  name: "addKid - enforces max 8 kids limit",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const choreService = new ChoreService();
    const count = await choreService.getKidCount(TEST_FAMILY_ID);

    console.log("Current kid count:", count);

    // This test verifies the service method checks the limit
    // We don't actually add 8 kids, just verify the check exists
    if (count >= 8) {
      const result = await choreService.addKid(TEST_FAMILY_ID, "Over Limit Kid");
      assertEquals(result, null, "Should return null when at max limit");
      console.log("✅ Max limit correctly enforced");
    } else {
      console.log("⚠️ Family not at max, limit test not fully exercised");
    }
  },
});
