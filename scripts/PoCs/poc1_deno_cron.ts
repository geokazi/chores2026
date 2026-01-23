/**
 * POC 1: Deno.cron — Verify cron triggers fire correctly
 *
 * WHAT IT PROVES:
 *   - Deno.cron fires on schedule
 *   - --unstable-cron flag works
 *   - Cron continues running in the background
 *
 * HOW TO RUN:
 *   deno run --allow-env --allow-read --unstable-cron scripts/PoCs/poc1_deno_cron.ts
 *
 * EXPECTED OUTPUT:
 *   Watch for "CRON FIRED" messages every minute.
 *   Let it run for 2-3 minutes to confirm multiple fires.
 *   Press Ctrl+C to stop.
 *
 * PRODUCTION USE:
 *   Change schedule to "0 18 * * 0" (Sunday 6pm) in main.ts
 */

import "@std/dotenv/load";

console.log("=".repeat(50));
console.log("POC 1: Deno.cron Test");
console.log("=".repeat(50));
console.log(`Started at: ${new Date().toISOString()}`);
console.log("Cron schedule: every minute (* * * * *)");
console.log("Waiting for first fire...\n");

let fireCount = 0;

// Register a cron that fires every minute
Deno.cron("poc-test-cron", "* * * * *", () => {
  fireCount++;
  console.log(`[${fireCount}] CRON FIRED at ${new Date().toISOString()}`);
  console.log(`    Next fire: ~60 seconds from now`);

  if (fireCount >= 3) {
    console.log("\n SUCCESS: Cron fired 3 times. POC verified!");
    console.log("    Deno.cron works correctly.");
    console.log("    Safe to use in production with: Deno.cron('weekly-digest', '0 18 * * 0', ...)");
    Deno.exit(0);
  }
});

// Keep the process alive
console.log("(Process will exit after 3 successful fires, or Ctrl+C to stop early)\n");

// Timeout after 5 minutes if cron never fires
setTimeout(() => {
  if (fireCount === 0) {
    console.error("\n FAILED: Cron never fired after 5 minutes.");
    console.error("    Check: --unstable-cron flag present?");
    Deno.exit(1);
  }
}, 5 * 60 * 1000);
