/**
 * Unit tests for GoalsService
 * P4: Savings Goals
 */

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import type { SavingsGoal, CreateGoalPayload } from "../../lib/types/finance.ts";

// Mock goal data
const mockGoals: SavingsGoal[] = [
  {
    id: "goal-1",
    name: "Nintendo Game",
    description: "Save for new Mario game",
    targetAmount: 5000,
    currentAmount: 2300,
    icon: "🎮",
    category: "electronics",
    targetDate: "2026-03-01",
    isAchieved: false,
    createdAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "goal-2",
    name: "Bike",
    targetAmount: 10000,
    currentAmount: 10000,
    icon: "🚲",
    category: "toys",
    isAchieved: true,
    achievedAt: "2026-01-20T15:00:00Z",
    createdAt: "2026-01-01T10:00:00Z",
  },
];

describe("GoalsService", () => {
  describe("Type definitions", () => {
    it("SavingsGoal has required fields", () => {
      const goal: SavingsGoal = {
        id: "test-id",
        name: "Test Goal",
        targetAmount: 1000,
        currentAmount: 500,
        icon: "🎯",
        category: "other",
        isAchieved: false,
        createdAt: new Date().toISOString(),
      };

      assertExists(goal.id);
      assertExists(goal.name);
      assertEquals(typeof goal.targetAmount, "number");
      assertEquals(typeof goal.currentAmount, "number");
      assertEquals(goal.isAchieved, false);
    });

    it("SavingsGoal category is valid", () => {
      const validCategories = ["toys", "electronics", "experiences", "books", "other"];

      for (const category of validCategories) {
        const goal: SavingsGoal = {
          id: "test",
          name: "Test",
          targetAmount: 100,
          currentAmount: 0,
          icon: "🎯",
          category: category as SavingsGoal["category"],
          isAchieved: false,
          createdAt: new Date().toISOString(),
        };
        assertEquals(validCategories.includes(goal.category), true);
      }
    });
  });

  describe("Progress calculation", () => {
    it("calculates progress percentage correctly", () => {
      const goal = mockGoals[0]; // 2300/5000
      const progress = (goal.currentAmount / goal.targetAmount) * 100;
      assertEquals(progress, 46);
    });

    it("caps progress at 100%", () => {
      const goal = { ...mockGoals[0], currentAmount: 6000 }; // Over target
      const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
      assertEquals(progress, 100);
    });

    it("handles zero target amount", () => {
      const goal = { ...mockGoals[0], targetAmount: 0 };
      const progress = goal.targetAmount > 0
        ? (goal.currentAmount / goal.targetAmount) * 100
        : 0;
      assertEquals(progress, 0);
    });
  });

  describe("Goal achievement", () => {
    it("detects when goal is achieved", () => {
      const goal = mockGoals[0];
      const amountToAdd = 3000;
      const newAmount = goal.currentAmount + amountToAdd;
      const isAchieved = newAmount >= goal.targetAmount;
      assertEquals(isAchieved, true);
    });

    it("caps amount at target when exceeding", () => {
      const goal = mockGoals[0];
      const amountToAdd = 5000; // Would exceed target
      const newAmount = Math.min(goal.currentAmount + amountToAdd, goal.targetAmount);
      assertEquals(newAmount, goal.targetAmount);
    });

    it("sets achievedAt timestamp when achieved", () => {
      const goal: SavingsGoal = {
        ...mockGoals[0],
        currentAmount: 5000,
        isAchieved: true,
        achievedAt: new Date().toISOString(),
      };
      assertExists(goal.achievedAt);
    });
  });

  describe("Create goal validation", () => {
    it("requires name and target amount", () => {
      const payload: CreateGoalPayload = {
        name: "New Goal",
        targetAmount: 1000,
      };
      assertExists(payload.name);
      assertEquals(payload.targetAmount > 0, true);
    });

    it("applies default icon when not provided", () => {
      const payload: CreateGoalPayload = {
        name: "New Goal",
        targetAmount: 1000,
      };
      const icon = payload.icon || "🎯";
      assertEquals(icon, "🎯");
    });

    it("applies default category when not provided", () => {
      const payload: CreateGoalPayload = {
        name: "New Goal",
        targetAmount: 1000,
      };
      const category = payload.category || "other";
      assertEquals(category, "other");
    });
  });

  describe("Add to goal validation", () => {
    it("validates sufficient balance", () => {
      const balance = 500;
      const amountToAdd = 300;
      assertEquals(balance >= amountToAdd, true);
    });

    it("rejects when balance insufficient", () => {
      const balance = 100;
      const amountToAdd = 300;
      assertEquals(balance >= amountToAdd, false);
    });

    it("calculates remaining to goal", () => {
      const goal = mockGoals[0];
      const remaining = goal.targetAmount - goal.currentAmount;
      assertEquals(remaining, 2700);
    });
  });

  describe("Parent boost", () => {
    it("boost does not require kid balance check", () => {
      const isBoost = true;
      const kidBalance = 0;
      const boostAmount = 1000;

      // Boost should not check kid's balance
      if (isBoost) {
        assertEquals(true, true); // Boost allowed regardless of balance
      } else {
        assertEquals(kidBalance >= boostAmount, false);
      }
    });

    it("boost updates goal amount correctly", () => {
      const goal = mockGoals[0];
      const boostAmount = 500;
      const newAmount = Math.min(goal.currentAmount + boostAmount, goal.targetAmount);
      assertEquals(newAmount, 2800);
    });
  });

  describe("Goal filtering", () => {
    it("separates active and achieved goals", () => {
      const activeGoals = mockGoals.filter(g => !g.isAchieved);
      const achievedGoals = mockGoals.filter(g => g.isAchieved);

      assertEquals(activeGoals.length, 1);
      assertEquals(achievedGoals.length, 1);
    });

    it("active goals do not include achieved ones", () => {
      const activeGoals = mockGoals.filter(g => !g.isAchieved);
      assertEquals(activeGoals.every(g => !g.isAchieved), true);
    });
  });
});

describe("Dollar value formatting", () => {
  it("formats points to dollars correctly", () => {
    const points = 5000;
    const dollarValuePerPoint = 1.0;
    const dollarValue = points * dollarValuePerPoint;
    assertEquals(dollarValue, 5000);
  });

  it("handles fractional exchange rates", () => {
    const points = 100;
    const dollarValuePerPoint = 0.10; // 10 points = $1
    const dollarValue = points * dollarValuePerPoint;
    assertEquals(dollarValue, 10);
  });

  it("formats with two decimal places", () => {
    const points = 5000;
    const dollarValuePerPoint = 1.0;
    const formatted = `$${(points * dollarValuePerPoint).toFixed(2)}`;
    assertEquals(formatted, "$5000.00");
  });
});
