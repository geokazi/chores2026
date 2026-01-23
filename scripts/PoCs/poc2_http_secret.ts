/**
 * POC 2: HTTP Secret Endpoint — Verify secret-authenticated cron fallback
 *
 * WHAT IT PROVES:
 *   - HTTP endpoint can authenticate via query param secret
 *   - Wrong/missing secret returns 401
 *   - Correct secret returns 200 with JSON payload
 *   - Endpoint can be triggered by external cron services
 *
 * HOW TO RUN:
 *   deno run --allow-env --allow-read --allow-net scripts/PoCs/poc2_http_secret.ts
 *
 * THEN TEST WITH:
 *   curl http://localhost:8099/api/cron/weekly-digest              → 401
 *   curl http://localhost:8099/api/cron/weekly-digest?secret=wrong → 401
 *   curl "http://localhost:8099/api/cron/weekly-digest?secret=chgm_cron_9f7a3b2e1d5c4680" → 200
 *
 * PRODUCTION USE:
 *   Move handler logic to routes/api/cron/weekly-digest.ts
 */

import "@std/dotenv/load";

const CRON_SECRET = Deno.env.get("CRON_SECRET");

if (!CRON_SECRET) {
  console.error("ERROR: CRON_SECRET not found in .env");
  console.error("Add: CRON_SECRET=chgm_cron_9f7a3b2e1d5c4680");
  Deno.exit(1);
}

console.log("=".repeat(50));
console.log("POC 2: HTTP Secret Endpoint Test");
console.log("=".repeat(50));
console.log(`CRON_SECRET loaded: ${CRON_SECRET.slice(0, 10)}...`);
console.log(`Server starting on http://localhost:8099\n`);

const handler = (req: Request): Response => {
  const url = new URL(req.url);

  // Only handle our test route
  if (url.pathname !== "/api/cron/weekly-digest") {
    return new Response("Not Found", { status: 404 });
  }

  const secret = url.searchParams.get("secret");
  const clientIP = req.headers.get("x-forwarded-for") || "localhost";
  const timestamp = new Date().toISOString();

  // Log all attempts
  console.log(`[${timestamp}] ${req.method} ${url.pathname} | secret=${secret ? "provided" : "missing"} | ip=${clientIP}`);

  // Auth check
  if (!secret || secret !== CRON_SECRET) {
    console.log(`  -> 401 Unauthorized (secret mismatch)`);
    return new Response(
      JSON.stringify({ error: "Unauthorized", hint: "Provide ?secret=CRON_SECRET" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Simulate digest trigger
  console.log(`  -> 200 OK (digest would fire here)`);
  return new Response(
    JSON.stringify({
      success: true,
      message: "Weekly digest triggered",
      fired_at: timestamp,
      note: "In production, this calls sendWeeklyDigests()",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};

console.log("Test commands:");
console.log(`  curl http://localhost:8099/api/cron/weekly-digest`);
console.log(`  curl "http://localhost:8099/api/cron/weekly-digest?secret=wrong"`);
console.log(`  curl "http://localhost:8099/api/cron/weekly-digest?secret=${CRON_SECRET}"`);
console.log("");

Deno.serve({ port: 8099 }, handler);
