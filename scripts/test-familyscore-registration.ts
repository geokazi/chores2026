#!/usr/bin/env -S deno run -A

/**
 * Test script to register a Chores2026 family with FamilyScore
 * This will make the family visible on the FamilyScore dashboard
 */

import "@std/dotenv/load";
import { FamilyScoreRegistrationService } from "../lib/services/familyscore-registration.ts";

// Sample Chores2026 family data
const testFamily = {
  id: "chores2026_test_family",
  name: "Chores2026 Test Family",
  members: [
    {
      id: "parent_alice_2026",
      name: "Alice (Parent)",
      role: "parent" as const,
      current_points: 50,
    },
    {
      id: "kid_bobby_2026", 
      name: "Bobby",
      role: "child" as const,
      current_points: 120,
    },
    {
      id: "kid_charlie_2026",
      name: "Charlie", 
      role: "child" as const,
      current_points: 85,
    },
  ],
};

console.log("🚀 Testing FamilyScore registration for Chores2026...");
console.log(`Family: ${testFamily.name} (${testFamily.id})`);
console.log(`Members: ${testFamily.members.map(m => `${m.name} (${m.current_points}pts)`).join(", ")}`);

try {
  const registration = new FamilyScoreRegistrationService();
  
  // Check if already registered
  const isAlreadyRegistered = await registration.isFamilyRegistered(testFamily.id);
  console.log(`Already registered: ${isAlreadyRegistered}`);
  
  if (!isAlreadyRegistered) {
    console.log("\n📝 Registering family with FamilyScore...");
    await registration.registerFamily(
      testFamily.id,
      testFamily.name, 
      testFamily.members
    );
    console.log("✅ Registration complete!");
  } else {
    console.log("ℹ️ Family already registered with FamilyScore");
  }
  
  console.log("\n🎯 Check the FamilyScore dashboard - the family should now appear!");
  console.log("Dashboard URL: https://familyscore-poc.fly.dev/dashboard");
  
} catch (error) {
  console.error("❌ Registration failed:", error);
  Deno.exit(1);
}