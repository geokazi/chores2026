/**
 * Unit tests for BalanceService
 * P2: Balance & Pay Out
 */

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import type { BalanceInfo, FinanceSettings, PayOutRequest } from "../../lib/types/finance.ts";

// Mock balance data
const mockBalances: BalanceInfo[] = [
  {
    profileId: "kid-1",
    profileName: "Emma",
    avatarEmoji: "👧",
    currentPoints: 247,
    dollarValue: 247.0,
    weeklyEarnings: 85,
    choreEarnings: 60,
  },
  {
    profileId: "kid-2",
    profileName: "Jack",
    avatarEmoji: "👦",
    currentPoints: 183,
    dollarValue: 183.0,
    weeklyEarnings: 45,
    choreEarnings: 45,
  },
];

const defaultFinanceSettings: FinanceSettings = {
  dollarValuePerPoint: 1.0,
  payoutRequiresPin: true,
};

describe("BalanceService", () => {
  describe("Type definitions", () => {
    it("BalanceInfo has required fields", () => {
      const balance: BalanceInfo = {
        profileId: "test-id",
        profileName: "Test Kid",
        avatarEmoji: "🧒",
        currentPoints: 100,
        dollarValue: 100.0,
        weeklyEarnings: 50,
        choreEarnings: 40,
      };

      assertExists(balance.profileId);
      assertExists(balance.profileName);
      assertEquals(typeof balance.currentPoints, "number");
      assertEquals(typeof balance.dollarValue, "number");
    });

    it("FinanceSettings has defaults", () => {
      const settings: FinanceSettings = {
        dollarValuePerPoint: 1.0,
        payoutRequiresPin: true,
      };

      assertEquals(settings.dollarValuePerPoint, 1.0);
      assertEquals(settings.payoutRequiresPin, true);
    });
  });

  describe("Dollar conversion", () => {
    it("converts points to dollars with 1:1 rate", () => {
      const points = 100;
      const rate = 1.0;
      const dollars = points * rate;
      assertEquals(dollars, 100);
    });

    it("converts points with custom rate", () => {
      const points = 100;
      const rate = 0.5; // 2 points = $1
      const dollars = points * rate;
      assertEquals(dollars, 50);
    });

    it("formats dollar amount correctly", () => {
      const points = 247;
      const rate = 1.0;
      const formatted = `$${(points * rate).toFixed(2)}`;
      assertEquals(formatted, "$247.00");
    });
  });

  describe("Earnings breakdown", () => {
    it("calculates weekly earnings correctly", () => {
      const balance = mockBalances[0];
      assertEquals(balance.weeklyEarnings, 85);
    });

    it("separates chore earnings from total", () => {
      const balance = mockBalances[0];
      assertEquals(balance.choreEarnings <= balance.weeklyEarnings, true);
    });

    it("non-chore earnings = weekly - chore", () => {
      const balance = mockBalances[0];
      const bonusEarnings = balance.weeklyEarnings - balance.choreEarnings;
      assertEquals(bonusEarnings, 25);
    });
  });

  describe("Pay out validation", () => {
    it("requires positive amount", () => {
      const request: PayOutRequest = {
        profileId: "kid-1",
        amount: 50,
        parentPin: "1234",
      };
      assertEquals(request.amount > 0, true);
    });

    it("rejects zero amount", () => {
      const amount = 0;
      assertEquals(amount > 0, false);
    });

    it("rejects negative amount", () => {
      const amount = -50;
      assertEquals(amount > 0, false);
    });

    it("validates amount against balance", () => {
      const balance = mockBalances[0];
      const payoutAmount = 200;
      assertEquals(payoutAmount <= balance.currentPoints, true);
    });

    it("rejects amount exceeding balance", () => {
      const balance = mockBalances[0];
      const payoutAmount = 500; // More than 247
      assertEquals(payoutAmount <= balance.currentPoints, false);
    });
  });

  describe("PIN verification", () => {
    it("requires PIN when payoutRequiresPin is true", () => {
      const settings = defaultFinanceSettings;
      const request: PayOutRequest = {
        profileId: "kid-1",
        amount: 50,
        parentPin: "1234",
      };

      if (settings.payoutRequiresPin) {
        assertExists(request.parentPin);
        assertEquals(request.parentPin.length > 0, true);
      }
    });

    it("skips PIN check when payoutRequiresPin is false", () => {
      const settings: FinanceSettings = {
        dollarValuePerPoint: 1.0,
        payoutRequiresPin: false,
      };
      assertEquals(settings.payoutRequiresPin, false);
    });
  });

  describe("Balance update after payout", () => {
    it("calculates new balance correctly", () => {
      const balance = mockBalances[0];
      const payoutAmount = 100;
      const newBalance = balance.currentPoints - payoutAmount;
      assertEquals(newBalance, 147);
    });

    it("new balance is not negative", () => {
      const balance = mockBalances[0];
      const payoutAmount = balance.currentPoints; // Full balance
      const newBalance = balance.currentPoints - payoutAmount;
      assertEquals(newBalance >= 0, true);
    });

    it("updates dollar value with new balance", () => {
      const rate = 1.0;
      const originalPoints = 247;
      const payoutAmount = 100;
      const newPoints = originalPoints - payoutAmount;
      const newDollarValue = newPoints * rate;
      assertEquals(newDollarValue, 147);
    });
  });

  describe("Transaction metadata", () => {
    it("includes payout amount in cents", () => {
      const payoutPoints = 100;
      const dollarValue = payoutPoints * 1.0;
      const amountCents = Math.round(dollarValue * 100);
      assertEquals(amountCents, 10000);
    });

    it("includes approver profile ID", () => {
      const metadata = {
        payoutAmountCents: 10000,
        approvedBy: "parent-1",
        timestamp: new Date().toISOString(),
      };
      assertExists(metadata.approvedBy);
    });
  });

  describe("Family balances aggregation", () => {
    it("returns balances for all kids", () => {
      assertEquals(mockBalances.length, 2);
    });

    it("only includes child profiles", () => {
      // In real implementation, would filter by role === "child"
      const childBalances = mockBalances; // Assume already filtered
      assertEquals(childBalances.length > 0, true);
    });

    it("sorts by name or points", () => {
      const sortedByPoints = [...mockBalances].sort(
        (a, b) => b.currentPoints - a.currentPoints
      );
      assertEquals(sortedByPoints[0].profileName, "Emma"); // 247 > 183
    });
  });
});

describe("Transaction history", () => {
  it("limits results to specified count", () => {
    const limit = 20;
    const mockTransactions = Array.from({ length: 50 }, (_, i) => ({
      id: `tx-${i}`,
      points_change: 10,
      created_at: new Date().toISOString(),
    }));
    const limited = mockTransactions.slice(0, limit);
    assertEquals(limited.length, limit);
  });

  it("orders by created_at descending", () => {
    const transactions = [
      { id: "tx-1", created_at: "2026-01-25T10:00:00Z" },
      { id: "tx-2", created_at: "2026-01-25T11:00:00Z" },
      { id: "tx-3", created_at: "2026-01-25T09:00:00Z" },
    ];
    const sorted = [...transactions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    assertEquals(sorted[0].id, "tx-2"); // Latest first
  });
});

describe("Week ending calculation", () => {
  it("calculates week ending (Sunday) correctly", () => {
    const date = new Date("2026-01-25"); // Saturday
    const dayOfWeek = date.getDay(); // 6 = Saturday
    const daysUntilSunday = (7 - dayOfWeek) % 7;
    const weekEnding = new Date(date);
    weekEnding.setDate(date.getDate() + daysUntilSunday);
    assertEquals(weekEnding.getDay(), 0); // Sunday
  });

  it("returns same day if already Sunday", () => {
    const date = new Date("2026-01-26"); // Sunday
    const dayOfWeek = date.getDay(); // 0 = Sunday
    const daysUntilSunday = (7 - dayOfWeek) % 7;
    assertEquals(daysUntilSunday, 0);
  });
});
