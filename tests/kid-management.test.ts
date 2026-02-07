/**
 * Kid Management Unit Tests
 * Tests add, edit, and soft-delete logic with mocked data
 *
 * Run with: deno test --allow-env --allow-net --allow-read tests/kid-management.test.ts
 */

import { assertEquals, assertExists } from "jsr:@std/assert";

// Mock environment
Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");

const MAX_KIDS = 8;

// Mock family member type
interface MockFamilyMember {
  id: string;
  family_id: string;
  name: string;
  role: "parent" | "child";
  current_points: number;
  is_deleted?: boolean;
}

// In-memory mock database
let mockMembers: MockFamilyMember[] = [];

// Mock ChoreService methods
const mockChoreService = {
  getKidCount(familyId: string): number {
    return mockMembers.filter(
      (m) => m.family_id === familyId && m.role === "child" && !m.is_deleted
    ).length;
  },

  addKid(familyId: string, name: string): MockFamilyMember | null {
    const currentCount = this.getKidCount(familyId);
    if (currentCount >= MAX_KIDS) {
      return null;
    }

    const newKid: MockFamilyMember = {
      id: `kid-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      family_id: familyId,
      name,
      role: "child",
      current_points: 0,
      is_deleted: false,
    };

    mockMembers.push(newKid);
    return newKid;
  },

  updateKidName(kidId: string, newName: string): boolean {
    const kid = mockMembers.find((m) => m.id === kidId);
    if (!kid) return false;

    kid.name = newName;
    return true;
  },

  softDeleteKid(kidId: string): boolean {
    const kid = mockMembers.find((m) => m.id === kidId);
    if (!kid) return false;

    kid.is_deleted = true;
    return true;
  },

  getFamilyMember(kidId: string): MockFamilyMember | undefined {
    return mockMembers.find((m) => m.id === kidId && !m.is_deleted);
  },

  getFamilyMembers(familyId: string): MockFamilyMember[] {
    return mockMembers.filter(
      (m) => m.family_id === familyId && !m.is_deleted
    );
  },

  reset() {
    mockMembers = [];
  },
};

const TEST_FAMILY_ID = "test-family-123";

Deno.test({
  name: "Kid Management - getKidCount",
  fn: async (t) => {
    mockChoreService.reset();

    await t.step("returns 0 for empty family", () => {
      const count = mockChoreService.getKidCount(TEST_FAMILY_ID);
      assertEquals(count, 0);
    });

    await t.step("returns correct count after adding kids", () => {
      mockChoreService.addKid(TEST_FAMILY_ID, "Kid 1");
      mockChoreService.addKid(TEST_FAMILY_ID, "Kid 2");

      const count = mockChoreService.getKidCount(TEST_FAMILY_ID);
      assertEquals(count, 2);
    });

    await t.step("excludes deleted kids from count", () => {
      const kid3 = mockChoreService.addKid(TEST_FAMILY_ID, "Kid 3");
      assertExists(kid3);

      mockChoreService.softDeleteKid(kid3.id);

      const count = mockChoreService.getKidCount(TEST_FAMILY_ID);
      assertEquals(count, 2); // Kid 3 is soft deleted
    });
  },
});

Deno.test({
  name: "Kid Management - addKid",
  fn: async (t) => {
    mockChoreService.reset();

    await t.step("adds new kid successfully", () => {
      const newKid = mockChoreService.addKid(TEST_FAMILY_ID, "Test Kid");

      assertExists(newKid, "Should return new kid data");
      assertEquals(newKid.name, "Test Kid");
      assertEquals(newKid.role, "child");
      assertEquals(newKid.current_points, 0);
      assertEquals(newKid.family_id, TEST_FAMILY_ID);
    });

    await t.step("respects max limit of 8 kids", () => {
      mockChoreService.reset();

      // Add 8 kids
      for (let i = 1; i <= 8; i++) {
        const kid = mockChoreService.addKid(TEST_FAMILY_ID, `Kid ${i}`);
        assertExists(kid, `Should add kid ${i}`);
      }

      assertEquals(mockChoreService.getKidCount(TEST_FAMILY_ID), 8);

      // Try to add 9th kid
      const overLimitKid = mockChoreService.addKid(TEST_FAMILY_ID, "Over Limit Kid");
      assertEquals(overLimitKid, null, "Should return null when at max limit");
    });

    await t.step("generates unique IDs", () => {
      mockChoreService.reset();

      const kid1 = mockChoreService.addKid(TEST_FAMILY_ID, "Kid 1");
      const kid2 = mockChoreService.addKid(TEST_FAMILY_ID, "Kid 2");

      assertExists(kid1);
      assertExists(kid2);
      assertEquals(kid1.id !== kid2.id, true, "IDs should be unique");
    });
  },
});

Deno.test({
  name: "Kid Management - updateKidName",
  fn: async (t) => {
    mockChoreService.reset();

    await t.step("updates kid name successfully", () => {
      const kid = mockChoreService.addKid(TEST_FAMILY_ID, "Original Name");
      assertExists(kid);

      const result = mockChoreService.updateKidName(kid.id, "New Name");
      assertEquals(result, true);

      const updated = mockChoreService.getFamilyMember(kid.id);
      assertExists(updated);
      assertEquals(updated.name, "New Name");
    });

    await t.step("returns false for non-existent kid", () => {
      const result = mockChoreService.updateKidName("non-existent-id", "Name");
      assertEquals(result, false);
    });
  },
});

Deno.test({
  name: "Kid Management - softDeleteKid",
  fn: async (t) => {
    mockChoreService.reset();

    await t.step("soft deletes kid successfully", () => {
      const kid = mockChoreService.addKid(TEST_FAMILY_ID, "To Delete");
      assertExists(kid);

      const result = mockChoreService.softDeleteKid(kid.id);
      assertEquals(result, true);
    });

    await t.step("deleted kid not in active members", () => {
      mockChoreService.reset();

      const kid = mockChoreService.addKid(TEST_FAMILY_ID, "To Delete");
      assertExists(kid);

      mockChoreService.softDeleteKid(kid.id);

      const members = mockChoreService.getFamilyMembers(TEST_FAMILY_ID);
      const found = members.find((m) => m.id === kid.id);
      assertEquals(found, undefined, "Deleted kid should not appear in active members");
    });

    await t.step("deleted kid not found by getFamilyMember", () => {
      mockChoreService.reset();

      const kid = mockChoreService.addKid(TEST_FAMILY_ID, "To Delete");
      assertExists(kid);

      mockChoreService.softDeleteKid(kid.id);

      const member = mockChoreService.getFamilyMember(kid.id);
      assertEquals(member, undefined);
    });

    await t.step("returns false for non-existent kid", () => {
      const result = mockChoreService.softDeleteKid("non-existent-id");
      assertEquals(result, false);
    });
  },
});

Deno.test({
  name: "Kid Management - getFamilyMembers",
  fn: async (t) => {
    mockChoreService.reset();

    await t.step("returns empty array for empty family", () => {
      const members = mockChoreService.getFamilyMembers(TEST_FAMILY_ID);
      assertEquals(members.length, 0);
    });

    await t.step("returns all active members", () => {
      mockChoreService.addKid(TEST_FAMILY_ID, "Kid 1");
      mockChoreService.addKid(TEST_FAMILY_ID, "Kid 2");
      mockChoreService.addKid(TEST_FAMILY_ID, "Kid 3");

      const members = mockChoreService.getFamilyMembers(TEST_FAMILY_ID);
      assertEquals(members.length, 3);
    });

    await t.step("excludes members from other families", () => {
      mockChoreService.reset();

      mockChoreService.addKid(TEST_FAMILY_ID, "My Kid");
      mockChoreService.addKid("other-family", "Other Kid");

      const members = mockChoreService.getFamilyMembers(TEST_FAMILY_ID);
      assertEquals(members.length, 1);
      assertEquals(members[0].name, "My Kid");
    });
  },
});
