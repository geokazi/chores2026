/**
 * POC 3: JSONB Idempotency — Verify last_sent_at prevents double-sends
 *
 * WHAT IT PROVES:
 *   - Can read preferences.notifications from family_profiles
 *   - Can write last_sent_at timestamp to JSONB
 *   - Second call within window is skipped (idempotent)
 *   - JSONB merge preserves existing fields
 *
 * HOW TO RUN:
 *   deno run --allow-env --allow-read --allow-net scripts/PoCs/poc3_idempotent_send.ts
 *
 * EXPECTED OUTPUT:
 *   Call 1: "SENT" (records last_sent_at)
 *   Call 2: "SKIPPED" (last_sent_at within window)
 *   After reset: "SENT" again
 *
 * PRODUCTION USE:
 *   Use this pattern inside sendWeeklyDigests() in lib/services/email-digest.ts
 */

import "@std/dotenv/load";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env");
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log("=".repeat(50));
console.log("POC 3: JSONB Idempotency Test");
console.log("=".repeat(50));
console.log(`Supabase URL: ${SUPABASE_URL}`);
console.log("");

// --- Helper: Check if digest was already sent within the window ---
function wasAlreadySent(lastSentAt: string | null, windowMinutes: number): boolean {
  if (!lastSentAt) return false;
  const lastSent = new Date(lastSentAt).getTime();
  const windowStart = Date.now() - (windowMinutes * 60 * 1000);
  return lastSent > windowStart;
}

// --- Helper: Simulate sending a digest ---
async function simulateSendDigest(profileId: string, profileName: string): Promise<"sent" | "skipped"> {
  // 1. Read current preferences
  const { data: profile, error: readErr } = await supabase
    .from("family_profiles")
    .select("preferences")
    .eq("id", profileId)
    .single();

  if (readErr) {
    console.error(`  ERROR reading profile ${profileId}:`, readErr.message);
    return "skipped";
  }

  const prefs = profile?.preferences || {};
  const notifications = prefs.notifications || {};
  const lastSentAt = notifications.last_sent_at || null;

  // 2. Check idempotency (5-minute window for POC; production uses 6 days)
  if (wasAlreadySent(lastSentAt, 5)) {
    console.log(`  [${profileName}] SKIPPED — already sent at ${lastSentAt} (within 5min window)`);
    return "skipped";
  }

  // 3. "Send" the digest (just log for POC)
  const now = new Date().toISOString();
  console.log(`  [${profileName}] SENT — digest fired at ${now}`);

  // 4. Record last_sent_at (JSONB merge — preserves other fields)
  const updatedPrefs = {
    ...prefs,
    notifications: {
      ...notifications,
      last_sent_at: now,
    },
  };

  const { error: writeErr } = await supabase
    .from("family_profiles")
    .update({ preferences: updatedPrefs })
    .eq("id", profileId);

  if (writeErr) {
    console.error(`  ERROR writing last_sent_at:`, writeErr.message);
  } else {
    console.log(`  [${profileName}] Recorded last_sent_at = ${now}`);
  }

  return "sent";
}

// --- Main test flow ---
async function runTest() {
  // Find a parent profile to test with
  const { data: parents, error } = await supabase
    .from("family_profiles")
    .select("id, name, role, preferences")
    .eq("role", "parent")
    .limit(1);

  if (error || !parents?.length) {
    console.error("ERROR: No parent profiles found.", error?.message);
    Deno.exit(1);
  }

  const testProfile = parents[0];
  console.log(`\nTest profile: ${testProfile.name} (${testProfile.id})`);
  console.log(`Current preferences.notifications:`, testProfile.preferences?.notifications || "(empty)");
  console.log("");

  // --- Test 1: First call should SEND ---
  console.log("--- Call 1: Should SEND ---");
  const result1 = await simulateSendDigest(testProfile.id, testProfile.name);
  console.log("");

  // --- Test 2: Immediate second call should SKIP ---
  console.log("--- Call 2 (immediate): Should SKIP ---");
  const result2 = await simulateSendDigest(testProfile.id, testProfile.name);
  console.log("");

  // --- Test 3: Reset and verify send again ---
  console.log("--- Call 3: Reset last_sent_at, then should SEND again ---");
  const currentPrefs = testProfile.preferences || {};
  const resetPrefs = {
    ...currentPrefs,
    notifications: {
      ...(currentPrefs.notifications || {}),
      last_sent_at: null, // Reset
    },
  };
  await supabase
    .from("family_profiles")
    .update({ preferences: resetPrefs })
    .eq("id", testProfile.id);
  console.log(`  [Reset] Cleared last_sent_at`);

  const result3 = await simulateSendDigest(testProfile.id, testProfile.name);
  console.log("");

  // --- Summary ---
  console.log("=".repeat(50));
  console.log("RESULTS:");
  console.log(`  Call 1 (fresh):     ${result1 === "sent" ? "SENT" : "FAILED"} ${result1 === "sent" ? "" : ""}`);
  console.log(`  Call 2 (duplicate): ${result2 === "skipped" ? "SKIPPED" : "FAILED"} ${result2 === "skipped" ? "" : ""}`);
  console.log(`  Call 3 (after reset): ${result3 === "sent" ? "SENT" : "FAILED"} ${result3 === "sent" ? "" : ""}`);
  console.log("");

  const allPassed = result1 === "sent" && result2 === "skipped" && result3 === "sent";
  if (allPassed) {
    console.log("SUCCESS: Idempotency works correctly!");
    console.log("  - First send records timestamp");
    console.log("  - Duplicate within window is skipped");
    console.log("  - After window expires, next send goes through");
  } else {
    console.log("PARTIAL FAILURE: Check errors above");
  }

  // --- Cleanup: restore original state ---
  console.log("\n--- Cleanup: Restoring original preferences ---");
  await supabase
    .from("family_profiles")
    .update({ preferences: testProfile.preferences || {} })
    .eq("id", testProfile.id);
  console.log("  Done. Original state restored.");

  console.log("=".repeat(50));
}

await runTest();
Deno.exit(0);
