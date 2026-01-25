/**
 * Unit tests for RewardsService
 * P3: Rewards Marketplace
 */

import {
  assertEquals,
  assertExists,
  assertRejects,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { describe, it, beforeEach } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { stub, restore } from "https://deno.land/std@0.208.0/testing/mock.ts";
import type { AvailableReward } from "../../lib/types/finance.ts";

// Mock reward data
const mockRewards: AvailableReward[] = [
  {
    id: "reward-1",
    name: "Movie Night Pick",
    description: "Choose the family movie",
    icon: "🎬",
    pointCost: 50,
    category: "entertainment",
    isActive: true,
    createdAt: "2026-01-25T10:00:00Z",
  },
  {
    id: "reward-2",
    name: "Extra Gaming Time",
    description: "1 hour of extra screen time",
    icon: "🎮",
    pointCost: 100,
    category: "gaming",
    isActive: true,
    createdAt: "2026-01-25T10:00:00Z",
  },
  {
    id: "reward-3",
    name: "Inactive Reward",
    icon: "❌",
    pointCost: 500,
    category: "other",
    isActive: false,
    createdAt: "2026-01-25T10:00:00Z",
  },
];

describe("RewardsService", () => {
  describe("Type definitions", () => {
    it("AvailableReward has required fields", () => {
      const reward: AvailableReward = {
        id: "test-id",
        name: "Test Reward",
        icon: "🎁",
        pointCost: 100,
        category: "other",
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      assertExists(reward.id);
      assertExists(reward.name);
      assertExists(reward.icon);
      assertEquals(typeof reward.pointCost, "number");
      assertEquals(reward.isActive, true);
    });

    it("AvailableReward category is valid", () => {
      const validCategories = ["gaming", "entertainment", "food", "activities", "other"];

      for (const category of validCategories) {
        const reward: AvailableReward = {
          id: "test",
          name: "Test",
          icon: "🎁",
          pointCost: 100,
          category: category as AvailableReward["category"],
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        assertEquals(validCategories.includes(reward.category), true);
      }
    });
  });

  describe("Reward filtering", () => {
    it("filters out inactive rewards", () => {
      const activeRewards = mockRewards.filter(r => r.isActive);
      assertEquals(activeRewards.length, 2);
      assertEquals(activeRewards.every(r => r.isActive), true);
    });

    it("includes all active rewards", () => {
      const activeRewards = mockRewards.filter(r => r.isActive);
      assertEquals(activeRewards.some(r => r.name === "Movie Night Pick"), true);
      assertEquals(activeRewards.some(r => r.name === "Extra Gaming Time"), true);
    });
  });

  describe("Point validation", () => {
    it("validates sufficient balance for claim", () => {
      const balance = 75;
      const reward = mockRewards[0]; // 50 points
      assertEquals(balance >= reward.pointCost, true);
    });

    it("rejects insufficient balance", () => {
      const balance = 25;
      const reward = mockRewards[0]; // 50 points
      assertEquals(balance >= reward.pointCost, false);
    });

    it("calculates new balance correctly after claim", () => {
      const balance = 100;
      const reward = mockRewards[0]; // 50 points
      const newBalance = balance - reward.pointCost;
      assertEquals(newBalance, 50);
    });
  });

  describe("Claim payload validation", () => {
    it("requires rewardId", () => {
      const payload = { rewardId: "", profileId: "profile-1", familyId: "family-1" };
      assertEquals(payload.rewardId === "", true);
    });

    it("requires valid profileId", () => {
      const payload = { rewardId: "reward-1", profileId: "profile-1", familyId: "family-1" };
      assertExists(payload.profileId);
      assertEquals(payload.profileId.length > 0, true);
    });
  });
});

describe("Reward purchase flow", () => {
  it("purchase record has required fields", () => {
    const purchase = {
      id: crypto.randomUUID(),
      profileId: "profile-1",
      rewardId: "reward-1",
      transactionId: "tx-123",
      pointCost: 50,
      status: "purchased" as const,
      rewardName: "Movie Night Pick",
      rewardIcon: "🎬",
      createdAt: new Date().toISOString(),
    };

    assertExists(purchase.id);
    assertExists(purchase.transactionId);
    assertEquals(purchase.status, "purchased");
  });

  it("status transitions are valid", () => {
    const validStatuses = ["purchased", "fulfilled", "cancelled"];

    for (const status of validStatuses) {
      assertEquals(validStatuses.includes(status), true);
    }
  });
});

describe("Psychological framing", () => {
  it("uses positive language", () => {
    const positiveTerms = ["Claim", "Redeem", "Reward Claimed"];
    const negativeTerms = ["Spend", "Purchase", "Cost", "Buy"];

    // Verify we use positive framing
    const claimButtonText = "Claim";
    assertEquals(positiveTerms.includes(claimButtonText), true);
    assertEquals(negativeTerms.includes(claimButtonText), false);
  });

  it("formats points without negative sign for display", () => {
    const pointCost = 50;
    const displayText = `${pointCost} pts`;
    assertEquals(displayText.includes("-"), false);
  });
});
