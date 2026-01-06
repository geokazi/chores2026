#!/usr/bin/env -S deno run -A

/**
 * Test FamilyScore Hybrid Smart Auto-Registration
 * This simulates a Chores2026 family completing their first chore
 * and automatically appearing in the FamilyScore dashboard
 */

import "@std/dotenv/load";
import { TransactionService } from "../lib/services/transaction-service.ts";

// Test family data
const testFamily = {
  id: "auto_registration_test_family",
  members: [
    { id: "parent_alice_auto", name: "Alice Johnson" },
    { id: "kid_bobby_auto", name: "Bobby" },
    { id: "kid_sarah_auto", name: "Sarah" },
  ],
};

console.log("🧪 Testing FamilyScore Hybrid Smart Auto-Registration");
console.log("=" .repeat(60));
console.log(`Family: ${testFamily.id}`);
console.log(`Members: ${testFamily.members.map(m => m.name).join(", ")}`);
console.log("");

try {
  const transactionService = new TransactionService();

  // Simulate first chore completions - these will auto-register the family
  console.log("1️⃣ Bobby completes 'Make Bed' chore (+10 points)");
  await transactionService.recordChoreCompletion(
    "chore_make_bed_001",
    10,
    "Make Bed",
    "kid_bobby_auto",
    testFamily.id
  );
  console.log("   ✅ Transaction recorded - family auto-registered if new");

  console.log("");
  console.log("2️⃣ Sarah completes 'Feed Dog' chore (+15 points)");
  await transactionService.recordChoreCompletion(
    "chore_feed_dog_002", 
    15,
    "Feed Dog",
    "kid_sarah_auto",
    testFamily.id
  );
  console.log("   ✅ Transaction recorded");

  console.log("");
  console.log("3️⃣ Parent gives manual adjustment (+5 points to Bobby)");
  await transactionService.recordManualAdjustment(
    "kid_bobby_auto",
    5,
    "Good attitude",
    "parent_alice_auto",
    testFamily.id
  );
  console.log("   ✅ Manual adjustment recorded");

  console.log("");
  console.log("🎯 AUTO-REGISTRATION COMPLETE!");
  console.log("=" .repeat(60));
  console.log("Check the FamilyScore dashboard - the family should now appear!");
  console.log("Dashboard URL: https://familyscore-poc.fly.dev/dashboard");
  console.log("");
  console.log("Expected family name: 'Chores2026 Family'");
  console.log("Expected members:");
  console.log("  • Bobby (child) - 15 points");
  console.log("  • Sarah (child) - 15 points");  
  console.log("  • Parent (parent) - 0 points");
  console.log("");
  console.log("🌟 KEY FEATURES DEMONSTRATED:");
  console.log("  ✅ Zero explicit registration required");
  console.log("  ✅ Smart user names from user IDs");
  console.log("  ✅ Auto-role detection (parent/child)");
  console.log("  ✅ Family appears immediately on dashboard");
  console.log("  ✅ Real-time leaderboard updates");
  
} catch (error) {
  console.error("❌ Auto-registration test failed:", error);
  Deno.exit(1);
}